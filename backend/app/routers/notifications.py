from fastapi import APIRouter, Depends, HTTPException

from app.schemas import ApiResponse, DeviceToken, RegisterTokenRequest, SendNotificationRequest, SendResult
from app.security import require_api_key
from app.services import push

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.post("/register", response_model=ApiResponse[DeviceToken], summary="Register a device's Expo push token")
def register(req: RegisterTokenRequest):
    token = req.token.strip()
    if not push.is_expo_token(token):
        raise HTTPException(400, "token must be an Expo push token, e.g. ExponentPushToken[xxxxxxxx]")
    entry, _created = push.get_token_store().register(token, req.platform, req.user)
    return ApiResponse(data=DeviceToken(**entry), total=1)


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
        result = await push.send_push([req.token.strip()], req.title, req.body, req.data)
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
