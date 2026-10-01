import datetime as dt
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

from app.config import get_settings
from app.routers.sales import _workbook
from app.schemas import ApiResponse
from app.services import field_app

router = APIRouter(prefix="/api/app", tags=["mobile app"])


@router.get(
    "/bootstrap",
    response_model=ApiResponse[dict[str, Any]],
    summary="Everything the mobile app shows, for one sales officer",
    description=(
        "Built from the Excel workbook only. Visits, actions, pitch and notifications the workbook has no records for "
        "are derived from workbook signals; `data.data_gaps` lists what the workbook cannot provide."
    ),
)
def bootstrap(
    so: Optional[str] = Query(None, description="Sales officer ID or name, e.g. SO018. Default from .env"),
    today: Optional[dt.date] = Query(None, description="The app's 'today' (YYYY-MM-DD). Default APP_TODAY from .env"),
):
    settings = get_settings()
    wb = _workbook()
    try:
        data = field_app.build_bootstrap(wb, so or settings.default_sales_officer, today or settings.app_today)
    except field_app.NotFound as e:
        raise HTTPException(404, str(e))
    return ApiResponse(data=data, total=len(data["visits"]) + len(data["actions"]))


@router.get("/data-gaps", response_model=ApiResponse[list[dict[str, str]]], summary="What the workbook cannot provide")
def data_gaps():
    return ApiResponse(data=field_app.DATA_GAPS, total=len(field_app.DATA_GAPS))


@router.get("/sales-officers", response_model=ApiResponse[list[dict[str, Any]]], summary="Sales officers in the workbook")
def sales_officers():
    data = field_app.list_sales_officers(_workbook())
    return ApiResponse(data=data, total=len(data))
