import datetime as dt
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    excel_path: Path = BASE_DIR / "data" / "Master data_Sales GenAI.xlsx"
    tokens_path: Path = BASE_DIR / "data" / "tokens.json"

    # Protects POST /api/sales/reload and POST /api/notifications/send. Empty = those endpoints are locked.
    api_key: str = ""

    # Expo Push API. The access token is optional unless "enhanced push security" is on in your Expo project.
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"
    expo_access_token: str = ""

    # Comma-separated list, or "*" for any origin.
    cors_origins: str = "*"

    notify_on_reload: bool = True

    # Mobile app: default logged-in sales officer, the app's "today" (the workbook's actuals run to 20 Sep 2026),
    # and the folder of the app's web build served at /app (skipped if it doesn't exist).
    default_sales_officer: str = "SO018"
    app_today: dt.date = dt.date(2026, 9, 21)
    app_static_dir: Path = BASE_DIR.parent / "mobile" / "app"

    def resolve(self, p: Path) -> Path:
        return p if p.is_absolute() else BASE_DIR / p

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
