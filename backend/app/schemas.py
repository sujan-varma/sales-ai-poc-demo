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
