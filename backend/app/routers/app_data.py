import datetime as dt
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

from app.config import get_settings
from app.routers.sales import _workbook
from app.schemas import ApiResponse, VisitEvent
from app.services import field_app, tracker

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
    day = today or settings.app_today
    try:
        data = field_app.build_bootstrap(wb, so or settings.default_sales_officer, day)
    except field_app.NotFound as e:
        raise HTTPException(404, str(e))
    data = tracker.merge_into_bootstrap(data, day)
    return ApiResponse(data=data, total=len(data["visits"]) + len(data["actions"]))


@router.get(
    "/inbox",
    response_model=ApiResponse[dict[str, Any]],
    summary="New notifications for the app since a time, with the assigned actions they point to",
    description="The app polls this while it is open. `since` is ms since epoch; pass back `data.since` next time.",
)
def inbox(
    so: Optional[str] = Query(None, description="Sales officer ID or name. Default from .env"),
    since: int = Query(0, ge=0),
):
    settings = get_settings()
    try:
        data = tracker.app_inbox(_workbook(), so or settings.default_sales_officer, since, settings.app_today)
    except tracker.TrackerError as e:
        raise HTTPException(e.status, str(e))
    return ApiResponse(data=data, total=len(data["notifications"]))


@router.post(
    "/visits/{visit_id}/events",
    response_model=ApiResponse[dict[str, Any]],
    summary="Check in to / out of a visit from the app, kept so a reload doesn't lose it",
)
def visit_event(visit_id: str, ev: VisitEvent):
    try:
        data = tracker.visit_event(_workbook(), visit_id, ev.model_dump())
    except tracker.TrackerError as e:
        raise HTTPException(e.status, str(e))
    return ApiResponse(data=data, total=1)


@router.get("/data-gaps", response_model=ApiResponse[list[dict[str, str]]], summary="What the workbook cannot provide")
def data_gaps():
    return ApiResponse(data=field_app.DATA_GAPS, total=len(field_app.DATA_GAPS))


@router.get("/sales-officers", response_model=ApiResponse[list[dict[str, Any]]], summary="Sales officers in the workbook")
def sales_officers():
    data = field_app.list_sales_officers(_workbook())
    return ApiResponse(data=data, total=len(data))
