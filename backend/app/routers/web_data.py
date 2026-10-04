import time
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

from app.routers.sales import _workbook
from app.schemas import ApiResponse
from app.services import web_data, web_huddle, web_plan

router = APIRouter(prefix="/api/web", tags=["web app"])

ASM_HELP = "ASM persona for the ASM screens (default Raman)"
# the web app's loader shows the sections in this order, with these names; any other key comes after them
SECTIONS = {
    "cortexHome": "Home", "thermometer": "Thermometer", "leadership": "Leadership roll-up", "map": "Market Action Plan",
    "pitch": "Pitch", "tracker": "Action Tracker", "huddle": "Huddle", "org": "Org-wide plans and pitches", "actionTraces": "Action traces",
    "data_gaps": "Data sources",
}


def _payload(asm: Optional[str]) -> dict[str, Any]:
    # the workbook part is cached per load; assignments and app updates (tracker.json) are applied per request
    wb = _workbook()
    return web_data.overlay_escalations(web_huddle.overlay(web_plan.overlay(web_data.build(wb, asm or "Raman"), wb)))


def _records(v: Any, depth: int = 0) -> int:
    """Rows in a section: list items, and the entries of a collection keyed by id (a dict of dicts)."""
    if isinstance(v, list):
        return len(v)
    if not isinstance(v, dict) or depth > 2:
        return 0
    if depth and v and all(isinstance(x, dict) for x in v.values()):
        return len(v)
    return sum(_records(x, depth + 1) for x in v.values())


@router.get(
    "/bootstrap",
    response_model=ApiResponse[dict[str, Any]],
    summary="Everything the Cortex web app shows, built from the Excel workbook",
    description="Keys mirror the web app's data modules (cortexHome, leadership, thermometer, actionTraces). "
                "`data.data_gaps` lists what the workbook cannot provide.",
)
def bootstrap(asm: Optional[str] = Query(None, description=ASM_HELP)):
    data = _payload(asm)
    return ApiResponse(data=data, total=len(data["thermometer"]["CPS"]))


@router.get(
    "/sections",
    response_model=ApiResponse[dict[str, Any]],
    summary="Build the web app's data and list its sections, which the web app then loads one by one",
)
def sections(asm: Optional[str] = Query(None, description=ASM_HELP)):
    t = time.perf_counter()
    data = _payload(asm)
    keys = [k for k in SECTIONS if k in data] + [k for k in data if k not in SECTIONS]
    out = [{"key": k, "label": SECTIONS.get(k, k), "records": _records(data[k])} for k in keys]
    return ApiResponse(data={"built_ms": round((time.perf_counter() - t) * 1000), "loaded_at": _workbook().loaded_at, "sections": out}, total=len(out))


@router.get("/sections/{key}", response_model=ApiResponse[Any], summary="One section of the web app's data")
def section(key: str, asm: Optional[str] = Query(None, description=ASM_HELP)):
    data = _payload(asm)
    if key not in data:
        raise HTTPException(404, f"No section '{key}'. See GET /api/web/sections")
    return ApiResponse(data=data[key], total=_records(data[key]))


@router.get("/data-gaps", response_model=ApiResponse[list[dict[str, str]]], summary="What the workbook cannot provide")
def data_gaps():
    return ApiResponse(data=web_data.DATA_GAPS, total=len(web_data.DATA_GAPS))
