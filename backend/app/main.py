import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.routers import app_data, notifications, sales, web_data
from app.schemas import ApiResponse
from app.services.excel_data import store

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    try:
        store.load(settings.resolve(settings.excel_path))
    except Exception:
        # keep the server up so /docs works; data endpoints answer 503 until a successful /reload
        log.exception("Could not load the Excel file at startup")
    if not settings.api_key:
        log.warning("API_KEY is empty: /api/sales/reload and /api/notifications/send are locked")
    yield


app = FastAPI(title="Sales GenAI backend", version="0.1.0", lifespan=lifespan)

settings = get_settings()
origins = settings.cors_origin_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials="*" not in origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _error(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content=ApiResponse(success=False, error=message).model_dump())


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    return _error(exc.status_code, str(exc.detail))


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    msg = "; ".join(f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors())
    return _error(422, msg)


@app.exception_handler(Exception)
async def unhandled_error(_: Request, exc: Exception):
    log.exception("Unhandled error")
    return _error(500, f"Internal server error: {exc}")


app.include_router(sales.router)
app.include_router(notifications.router)
app.include_router(app_data.router)
app.include_router(web_data.router)

# the mobile app's web build, served from the same origin as the API (open http://<host>:8000/app on a phone)
_static = settings.resolve(settings.app_static_dir)
if _static.is_dir():
    app.mount("/app", StaticFiles(directory=_static, html=True), name="app")


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/app/" if _static.is_dir() else "/docs")


@app.get("/api/health", response_model=ApiResponse[dict], tags=["health"])
def health():
    data = {"excel_loaded": store.loaded}
    if store.loaded:
        wb = store.workbook
        data.update(file=wb.path.name, sheets=len(wb.sheets), rows=wb.total_rows, loaded_at=wb.loaded_at)
    return ApiResponse(success=store.loaded, data=data, error=None if store.loaded else "Excel data not loaded")
