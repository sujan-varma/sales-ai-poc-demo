from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.schemas import (
    ApiResponse,
    DeviceToken,
    ReadRequest,
    RegisterTokenRequest,
    SendNotificationRequest,
    SendResult,
    UnsubscribeRequest,
    WebPushSubscribeRequest,
)
from app.security import require_api_key
from app.services import push, tracker

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.post("/register", response_model=ApiResponse[DeviceToken], summary="Register a device's Expo push token")
def register(req: RegisterTokenRequest):
    token = req.token.strip()
    if not push.is_expo_token(token):
        raise HTTPException(400, "token must be an Expo push token, e.g. ExponentPushToken[xxxxxxxx]")
    entry, _created = push.get_token_store().register(token, req.platform, req.user)
    return ApiResponse(data=DeviceToken(**entry), total=1)


@router.get("/webpush/key", response_model=ApiResponse[dict[str, str]], summary="VAPID public key for PushManager.subscribe()")
def webpush_key():
    return ApiResponse(data={"publicKey": push.vapid_public_key()})


@router.post("/webpush/subscribe", response_model=ApiResponse[DeviceToken], summary="Register a browser push subscription (the mobile web app)")
def webpush_subscribe(req: WebPushSubscribeRequest):
    sub = req.subscription.model_dump(exclude_none=True)
    if not {"p256dh", "auth"} <= set(sub["keys"]):
        raise HTTPException(400, "subscription.keys must have p256dh and auth")
    entry, _created = push.get_token_store().register(sub["endpoint"], req.platform, req.user, kind="webpush", subscription=sub)
    return ApiResponse(data=DeviceToken(**entry), total=1)


@router.post("/unregister", response_model=ApiResponse[dict[str, Any]], summary="Remove an Expo token or web push subscription")
def unregister(req: UnsubscribeRequest):
    removed = push.get_token_store().remove([req.token.strip()])
    return ApiResponse(data={"removed": len(removed)}, total=len(removed))


@router.get(
    "/tokens",
    response_model=ApiResponse[list[DeviceToken]],
    dependencies=[Depends(require_api_key)],
    summary="List registered tokens (requires X-API-Key)",
)
def list_tokens():
    items = push.get_token_store().all()
    return ApiResponse(data=[DeviceToken(**i) for i in items], total=len(items))


@router.post(
    "/send",
    response_model=ApiResponse[SendResult],
    dependencies=[Depends(require_api_key)],
    summary="Send a notification to all devices or one token (requires X-API-Key)",
)
async def send(req: SendNotificationRequest):
    if req.token:
        token = req.token.strip()
        entry = next((e for e in push.get_token_store().all() if e["token"] == token), None)
        if entry:
            result = await push.send_to_entries([entry], req.title, req.body, req.data)
        else:
            result = await push.send_push([token], req.title, req.body, req.data)
    else:
        result = await push.broadcast(req.title, req.body, req.data)
    total = result["sent"] + result["failed"]
    if total == 0:
        return ApiResponse(success=False, data=SendResult(**result), total=0, error="No registered devices")
    return ApiResponse(
        success=result["sent"] > 0,
        data=SendResult(**result),
        total=total,
        error=None if result["sent"] else "; ".join(result["errors"]) or "All sends failed",
    )


@router.get("/inbox", response_model=ApiResponse[dict[str, Any]], summary="A user's notifications, newest first")
def get_inbox(
    user: str = Query(..., description="Sales officer id (SO018) or asm:<name> (asm:Raman)"),
    since: Optional[int] = Query(None, description="Only notifications after this time (ms since epoch)"),
    limit: int = Query(50, ge=1, le=500),
):
    data = tracker.inbox(user, since, limit)
    return ApiResponse(data=data, total=len(data["items"]))


@router.post("/inbox/read", response_model=ApiResponse[dict[str, int]], summary="Mark notifications read")
def read(req: ReadRequest):
    n = tracker.mark_read(req.user, req.ids)
    return ApiResponse(data={"marked": n}, total=n)
