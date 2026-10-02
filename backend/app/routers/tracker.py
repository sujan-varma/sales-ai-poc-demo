from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Security

from app.config import get_settings
from app.routers.sales import _workbook
from app.schemas import ActionEvent, ApiResponse, AsmCommentRequest, AssignRequest, ReviewRequest
from app.security import api_key_header, require_api_key
from app.services import tracker

router = APIRouter(prefix="/api/tracker", tags=["action tracker"])


@router.post(
    "/assign",
    response_model=ApiResponse[dict[str, Any]],
    summary="Assign an action to a sales officer (or the ASM) and notify them",
    description=(
        "Checks the ASM, officer, territory and retailer against 4. Retailer_Master, fills the action's details from "
        "the retailer's workbook signal, stores it, and pushes a notification to the officer's devices. Assigning the "
        "same source to the same person twice returns the existing action (`created: false`)."
    ),
)
async def assign(req: AssignRequest):
    try:
        data = await tracker.assign(_workbook(), req.model_dump(), get_settings().app_today)
    except tracker.TrackerError as e:
        raise HTTPException(e.status, str(e))
    return ApiResponse(data=data, total=1)


@router.get("/actions", response_model=ApiResponse[list[dict[str, Any]]], summary="Assigned actions, newest first")
def actions(
    assigned_by: Optional[str] = Query(None, description="ASM name, e.g. Raman"),
    so: Optional[str] = Query(None, description="Sales officer id, e.g. SO018"),
):
    data = tracker.list_actions(assigned_by, so)
    return ApiResponse(data=data, total=len(data))


@router.post(
    "/actions/{action_id}/events",
    response_model=ApiResponse[dict[str, Any]],
    summary="Start / update / complete an action from the app; notifies the ASM",
)
async def event(action_id: str, ev: ActionEvent):
    try:
        data = await tracker.apply_event(_workbook(), action_id, ev.model_dump())
    except tracker.TrackerError as e:
        raise HTTPException(e.status, str(e))
    return ApiResponse(data=data, total=1)


@router.post(
    "/actions/{action_id}/review",
    response_model=ApiResponse[dict[str, Any]],
    summary="The ASM verifies and closes, or sends back, an action; notifies the officer",
)
async def review(action_id: str, req: ReviewRequest):
    try:
        data = await tracker.review(_workbook(), action_id, req.model_dump())
    except tracker.TrackerError as e:
        raise HTTPException(e.status, str(e))
    return ApiResponse(data=data, total=1)


@router.post(
    "/actions/{action_id}/comment",
    response_model=ApiResponse[dict[str, Any]],
    summary="The ASM comments on an action; the officer sees it in the app",
)
async def asm_comment(action_id: str, req: AsmCommentRequest):
    try:
        data = await tracker.asm_comment(_workbook(), action_id, req.model_dump())
    except tracker.TrackerError as e:
        raise HTTPException(e.status, str(e))
    return ApiResponse(data=data, total=1)


@router.post(
    "/reset",
    response_model=ApiResponse[dict[str, int]],
    summary="Reset for demo: clear assigned actions and notifications so the web's Action Tracker items can be assigned again",
    description=(
        "With `assigned_by` (the web's *Reset for demo*), that ASM's demo: the actions they assigned, the officers' "
        "updates on their retailers, and the notifications and read state of the ASM and their officers. Like "
        "`/assign`, it needs no key. Without `assigned_by`, everything, and it requires X-API-Key. Open mobile apps "
        "reload on their next inbox check."
    ),
)
def reset(assigned_by: Optional[str] = Query(None, description="ASM name, e.g. Raman"), key: Optional[str] = Security(api_key_header)):
    wb = _workbook()
    if assigned_by:
        if assigned_by not in tracker._people(wb)["asms"]:
            raise HTTPException(404, f"ASM '{assigned_by}' is not in 4. Retailer_Master")
    else:
        require_api_key(key)
    data = tracker.reset(wb, assigned_by)
    return ApiResponse(data=data, total=data["actions"])


@router.post(
    "/reminders/run",
    response_model=ApiResponse[list[dict[str, Any]]],
    dependencies=[Depends(require_api_key)],
    summary="Send due-today / overdue reminders for assigned actions (requires X-API-Key)",
)
async def reminders():
    sent = await tracker.run_reminders(get_settings().app_today)
    return ApiResponse(data=sent, total=len(sent))
