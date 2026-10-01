import logging
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Path, Query, Request
from fastapi.concurrency import run_in_threadpool

from app.config import get_settings
from app.schemas import ApiResponse, ReloadResult, Row, SheetInfo
from app.security import require_api_key
from app.services import push
from app.services.excel_data import Sheet, query_rows, store
from app.services.summary import compute_summary

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sales", tags=["sales"])

RESERVED_PARAMS = {"search", "page", "limit"}


def _workbook():
    if not store.loaded:
        raise HTTPException(503, "Excel data is not loaded (check EXCEL_PATH and the server log)")
    return store.workbook


def _sheet(name: str) -> Sheet:
    s = _workbook().find(name)
    if s is None:
        raise HTTPException(404, f"Sheet '{name}' not found. See GET /api/sales/sheets for names and slugs")
    return s


@router.get("/sheets", response_model=ApiResponse[list[SheetInfo]], summary="Sheet names and their columns")
def list_sheets():
    wb = _workbook()
    data = [
        SheetInfo(name=s.name, slug=s.slug, header_row=s.header_row, rows=len(s.rows), columns=s.columns)
        for s in wb.sheets.values()
    ]
    return ApiResponse(data=data, total=len(data))


@router.get("/summary", response_model=ApiResponse[dict[str, Any]], summary="Sales KPIs computed from the Excel data")
def summary(
    asm: Optional[str] = Query(None, description="ASM Name, e.g. Raman"),
    territory: Optional[str] = Query(None, description="Territory, e.g. Bhavnagar"),
    sales_officer: Optional[str] = Query(None, description="Sales officer name, e.g. Dhaval Amin"),
    distributor_id: Optional[str] = Query(None, description="Distributor ID, e.g. 1200015"),
):
    filters = {"asm": asm, "territory": territory, "sales_officer": sales_officer, "distributor_id": distributor_id}
    try:
        data = compute_summary(_workbook(), filters)
    except KeyError as e:
        raise HTTPException(500, f"Workbook is missing an expected sheet/column: {e}")
    return ApiResponse(data=data, total=data["counts"]["retailers"])


@router.post(
    "/reload",
    response_model=ApiResponse[ReloadResult],
    dependencies=[Depends(require_api_key)],
    summary="Reload the Excel file without restarting (requires X-API-Key)",
)
async def reload(background: BackgroundTasks):
    settings = get_settings()
    try:
        wb = await run_in_threadpool(store.load, settings.resolve(settings.excel_path))
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except Exception as e:  # corrupt / locked file etc. — the previous data stays loaded
        log.exception("Reload failed")
        raise HTTPException(500, f"Reload failed, previous data kept: {e}")

    note = "disabled"
    if settings.notify_on_reload:
        background.add_task(
            push.broadcast,
            "Sales data updated",
            "Latest sales figures are available.",
            {"type": "sales_data_updated", "loaded_at": wb.loaded_at},
        )
        note = "queued to all registered devices"
    data = ReloadResult(
        sheets=len(wb.sheets), rows=wb.total_rows, loaded_at=wb.loaded_at, seconds=wb.seconds, notification=note
    )
    return ApiResponse(data=data, total=wb.total_rows)


@router.get(
    "/{sheet}",
    response_model=ApiResponse[list[Row]],
    summary="Rows of a sheet, with search, paging and column filters",
    description=(
        "`sheet` is the exact sheet name (URL-encoded) or its slug from /sheets.\n\n"
        "Any extra query parameter is an exact, case-insensitive column filter, "
        "e.g. `?Territory=Bhavnagar&ASM%20Name=Raman`. `total` is the number of matching rows before paging."
    ),
)
def get_rows(
    request: Request,
    sheet: str = Path(..., examples=["4-retailer-master"]),
    search: Optional[str] = Query(None, description="Case-insensitive text search across all cells"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=5000),
):
    s = _sheet(sheet)
    filters = {k: v for k, v in request.query_params.items() if k not in RESERVED_PARAMS}
    unknown = [k for k in filters if k not in s.columns]
    if unknown:
        raise HTTPException(400, f"Unknown column filter(s) {unknown} for sheet '{s.name}'")
    rows, total = query_rows(s, search=search, filters=filters, page=page, limit=limit)
    return ApiResponse(data=rows, total=total)


@router.get("/{sheet}/{row_id}", response_model=ApiResponse[Row], summary="Single row by its Excel row number")
def get_row(sheet: str, row_id: int = Path(..., description="`_row_id` = the row number in Excel")):
    s = _sheet(sheet)
    row = s.by_id.get(row_id)
    if row is None:
        raise HTTPException(404, f"Row {row_id} not found in sheet '{s.name}'")
    return ApiResponse(data=row, total=1)
