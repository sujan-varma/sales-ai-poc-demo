from typing import Any, Generic, Literal, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Envelope used by every endpoint."""

    success: bool = True
    data: Optional[T] = None
    total: Optional[int] = None
    error: Optional[str] = None


# ---- sales ----

class SheetInfo(BaseModel):
    name: str = Field(description="Exact sheet name in the workbook")
    slug: str = Field(description="URL-friendly alias, usable in place of the name")
    header_row: int = Field(description="1-based Excel row holding the column headers")
    rows: int
    columns: list[str]


Row = dict[str, Any]


class ReloadResult(BaseModel):
    sheets: int
    rows: int
    loaded_at: str
    seconds: float
    notification: str


# ---- notifications ----

class RegisterTokenRequest(BaseModel):
    token: str = Field(min_length=10, examples=["ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"])
    platform: Literal["ios", "android", "web"] = "android"
    user: Optional[str] = Field(default=None, description="Optional user / sales officer id")


class DeviceToken(BaseModel):
    token: str
    kind: str = Field(default="expo", description="expo (native app) or webpush (browser subscription; token = endpoint)")
    platform: str
    user: Optional[str] = None
    registered_at: str
    updated_at: str


class SendNotificationRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=2000)
    data: Optional[dict[str, Any]] = None
    token: Optional[str] = Field(default=None, description="Send to this token only; omit to send to all")


class SendResult(BaseModel):
    sent: int
    failed: int
    removed_tokens: list[str]
    errors: list[str]
    devices: Optional[int] = Field(default=None, description="Devices targeted (send to users only)")


class WebPushSubscription(BaseModel):
    endpoint: str = Field(min_length=10)
    expirationTime: Optional[float] = None
    keys: dict[str, str] = Field(description="p256dh and auth, from PushSubscription.toJSON()")


class WebPushSubscribeRequest(BaseModel):
    subscription: WebPushSubscription
    user: Optional[str] = Field(default=None, description="Sales officer id (SO018) or asm:<name>")
    platform: Literal["ios", "android", "web"] = "web"


class UnsubscribeRequest(BaseModel):
    token: str = Field(min_length=10, description="Expo token, or the web push subscription endpoint")


class ReadRequest(BaseModel):
    user: str = Field(min_length=1, examples=["SO018", "asm:Raman"])
    ids: Optional[list[str]] = Field(default=None, description="Notification ids; omit to mark all read")


# ---- action tracker ----

class AssignRequest(BaseModel):
    source_id: str = Field(min_length=1, description="Id of what is being assigned in the web app (sug-1, rec-3, act-t2, …)")
    title: str = Field(min_length=1, max_length=300)
    assignee: str = Field(min_length=1, description="Sales officer id or name, or 'Me' for the ASM", examples=["Paresh Patel", "SO018", "Me"])
    assigned_by: str = Field(min_length=1, description="ASM name from 4. Retailer_Master", examples=["Raman"])
    territory: Optional[str] = None
    agent: Optional[Literal["thermometer", "map", "pitch", "huddle"]] = None
    kind: Optional[str] = Field(default=None, description="Workbook signal: collection, credit, gap, short, coverage, loyalty")
    retailer_id: Optional[str] = None
    priority: Optional[Literal["High", "Medium", "Low"]] = None
    due_days: Optional[int] = Field(default=None, ge=0, le=60)
    note: Optional[str] = Field(default=None, max_length=500)


class EscalateRequest(BaseModel):
    source_id: str = Field(min_length=1, description="What is escalated in the web app: a plan initiative id or a recommendation id", examples=["i-range-bhavnagar", "rec-3"])
    kind: Literal["plan", "recommendation"]
    title: str = Field(min_length=1, max_length=300)
    by: str = Field(min_length=1, description="The ASM raising it", examples=["Raman"])
    note: str = Field(min_length=1, max_length=1000, description="What the ASM needs the Head of Sales to decide")
    territory: Optional[str] = None
    priority: Optional[Literal["High", "Medium", "Low"]] = None


class WithdrawRequest(BaseModel):
    by: str = Field(min_length=1, examples=["Raman"])


class VisitEvent(BaseModel):
    so: str = Field(min_length=1, description="The sales officer", examples=["SO018"])
    type: Literal["checkin", "checkout"]
    retailer_id: str = Field(min_length=1, description="The visit's retailer", examples=["RetTile1264"])


class ActionEvent(BaseModel):
    so: str = Field(min_length=1, description="The sales officer sending the update", examples=["SO018"])
    type: Literal["started", "comment", "complete"]
    text: Optional[str] = Field(default=None, max_length=1000)
    outcome: Optional[dict[str, Any]] = None
    # for actions the app derives from the workbook (not assigned from the web): identifies the retailer + signal
    retailer_id: Optional[str] = None
    signal: Optional[str] = None
    title: Optional[str] = None


class ReviewRequest(BaseModel):
    by: str = Field(min_length=1, description="The ASM", examples=["Raman"])
    decision: Literal["verify", "send_back"]
    note: Optional[str] = Field(default=None, max_length=1000)
    # for an officer's field action (not one assigned in Sales AI): who and which retailer / signal
    so: Optional[str] = None
    retailer_id: Optional[str] = None
    signal: Optional[str] = None
    title: Optional[str] = None


class AsmCommentRequest(BaseModel):
    by: str = Field(min_length=1, examples=["Raman"])
    text: str = Field(min_length=1, max_length=1000)
    so: Optional[str] = None
    retailer_id: Optional[str] = None
    signal: Optional[str] = None
    title: Optional[str] = None
