from typing import Any, Optional

from fastapi import APIRouter, Query

from app.routers.sales import _workbook
from app.schemas import ApiResponse
from app.services import web_data, web_huddle, web_plan

router = APIRouter(prefix="/api/web", tags=["web app"])


@router.get(
    "/bootstrap",
    response_model=ApiResponse[dict[str, Any]],
    summary="Everything the Cortex web app shows, built from the Excel workbook",
    description="Keys mirror the web app's data modules (cortexHome, leadership, thermometer, actionTraces). "
                "`data.data_gaps` lists what the workbook cannot provide.",
)
def bootstrap(asm: Optional[str] = Query(None, description="ASM persona for the ASM screens (default Raman)")):
    # the workbook part is cached per load; assignments and app updates (tracker.json) are applied per request
    data = web_huddle.overlay(web_plan.overlay(web_data.build(_workbook(), asm or "Raman")))
    return ApiResponse(data=data, total=len(data["thermometer"]["CPS"]))


@router.get("/data-gaps", response_model=ApiResponse[list[dict[str, str]]], summary="What the workbook cannot provide")
def data_gaps():
    return ApiResponse(data=web_data.DATA_GAPS, total=len(web_data.DATA_GAPS))
