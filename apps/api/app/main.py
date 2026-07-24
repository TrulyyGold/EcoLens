from __future__ import annotations

import logging
import re
import time
from typing import Annotated, Any
from uuid import UUID, uuid4

from fastapi import FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.adapters.base import AnalysisAdapter
from app.adapters.gemini import GeminiAdapter
from app.adapters.mock import MockAnalysisAdapter
from app.config import Settings, get_settings
from app.errors import EcoLensError
from app.image_validation import read_and_validate_image
from app.models import (
    ChatRequest,
    ChatResponse,
    DemoScenario,
    ErrorResponse,
    GenerateRecipeRequest,
    GenerateRecipeResponse,
    HealthResponse,
    ScanResult,
)
from app.repositories.base import ScanRepository
from app.repositories.memory import InMemoryScanRepository
from app.repositories.supabase import SupabaseScanRepository
from app.service import EcoLensService

logger = logging.getLogger("ecolens")
_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,128}$")


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", str(uuid4()))


def _error_payload(
    request: Request, code: str, message: str, details: Any = None
) -> dict[str, Any]:
    return {
        "error": {"code": code, "message": message, "details": details},
        "request_id": _request_id(request),
    }


def _build_repository(settings: Settings) -> ScanRepository:
    if settings.supabase_enabled:
        try:
            return SupabaseScanRepository(
                settings.supabase_url or "",
                settings.supabase_secret or "",
                settings.supabase_storage_bucket,
            )
        except Exception:
            logger.exception("Supabase initialization failed; using in-memory fallback")
    return InMemoryScanRepository()


def _build_adapter(settings: Settings) -> AnalysisAdapter:
    if settings.mock_mode:
        return MockAnalysisAdapter()
    key = settings.gemini_api_key.get_secret_value() if settings.gemini_api_key else ""
    return GeminiAdapter(key, settings.gemini_model)


def create_app(
    *,
    settings: Settings | None = None,
    repository: ScanRepository | None = None,
    adapter: AnalysisAdapter | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    repository = repository or _build_repository(settings)
    adapter = adapter or _build_adapter(settings)
    service = EcoLensService(
        adapter,
        repository,
        timeout_seconds=settings.analysis_timeout_seconds,
        demo_adapter=MockAnalysisAdapter(),
    )

    application = FastAPI(
        title=settings.app_name,
        version=__version__,
        description=(
            "Visual food and species analysis with deterministic server-side safety controls. "
            "Image results are informational and never medical advice."
        ),
        responses={
            400: {"model": ErrorResponse},
            404: {"model": ErrorResponse},
            422: {"model": ErrorResponse},
            500: {"model": ErrorResponse},
        },
    )
    application.state.settings = settings
    application.state.repository = repository
    application.state.service = service

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials="*" not in settings.cors_origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Response-Time-Ms"],
    )

    @application.middleware("http")
    async def request_metadata(request: Request, call_next: Any) -> Any:
        incoming_id = request.headers.get("X-Request-ID", "")
        request.state.request_id = (
            incoming_id if _REQUEST_ID_RE.fullmatch(incoming_id) else str(uuid4())
        )
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = max(0, round((time.perf_counter() - started) * 1000))
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["X-Response-Time-Ms"] = str(elapsed_ms)
        return response

    @application.exception_handler(EcoLensError)
    async def handle_ecolens_error(request: Request, exc: EcoLensError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(request, exc.code, exc.message, exc.details),
            headers={"X-Request-ID": _request_id(request)},
        )

    @application.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        details = [
            {"location": list(error["loc"]), "message": error["msg"], "type": error["type"]}
            for error in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=_error_payload(
                request,
                "validation_error",
                "Request validation failed.",
                details,
            ),
            headers={"X-Request-ID": _request_id(request)},
        )

    @application.exception_handler(HTTPException)
    async def handle_http_error(request: Request, exc: HTTPException) -> JSONResponse:
        message = exc.detail if isinstance(exc.detail, str) else "HTTP request failed."
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(request, "http_error", message, None),
            headers={"X-Request-ID": _request_id(request)},
        )

    @application.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled request failure", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content=_error_payload(
                request,
                "internal_error",
                "An unexpected server error occurred.",
                None,
            ),
            headers={"X-Request-ID": _request_id(request)},
        )

    @application.get("/health", response_model=HealthResponse, tags=["system"])
    async def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            service="ecolens-api",
            version=__version__,
            mock_mode=adapter.is_mock,
            repository=repository.kind,
        )

    @application.post(
        "/analyze-image",
        response_model=ScanResult,
        tags=["scans"],
        summary="Analyze an uploaded image",
    )
    async def analyze_image(
        request: Request,
        image: Annotated[UploadFile | None, File(description="JPEG, PNG, or WebP image")] = None,
        file: Annotated[UploadFile | None, File(description="Legacy alias for image")] = None,
        demo_scenario: Annotated[DemoScenario | None, Form()] = None,
        query_demo_scenario: Annotated[
            DemoScenario | None,
            Query(alias="demo_scenario", include_in_schema=False),
        ] = None,
    ) -> ScanResult:
        if image is not None and file is not None:
            raise EcoLensError(
                "multiple_images",
                "Send one multipart image field, not both 'image' and 'file'.",
                status_code=422,
            )
        upload = image or file
        if upload is None:
            raise EcoLensError(
                "missing_image",
                "A multipart image field named 'image' is required.",
                status_code=422,
            )
        if demo_scenario and query_demo_scenario and demo_scenario != query_demo_scenario:
            raise EcoLensError(
                "conflicting_demo_scenario",
                "Form and query demo_scenario values must match.",
                status_code=422,
            )

        started = time.perf_counter()
        data, content_type = await read_and_validate_image(upload, settings.max_image_bytes)
        return await service.analyze(
            data,
            content_type,
            upload.filename or "image",
            demo_scenario or query_demo_scenario,
            started_at=started,
        )

    @application.get("/scan-history", response_model=list[ScanResult], tags=["scans"])
    async def scan_history(
        limit: Annotated[int, Query(ge=1, le=100)] = 50,
        offset: Annotated[int, Query(ge=0)] = 0,
    ) -> list[ScanResult]:
        return await service.list_scans(limit=limit, offset=offset)

    @application.get("/scans/{scan_id}", response_model=ScanResult, tags=["scans"])
    async def get_scan(scan_id: UUID) -> ScanResult:
        return await service.get_scan(scan_id)

    @application.post("/chat", response_model=ChatResponse, tags=["assistant"])
    async def chat(payload: ChatRequest) -> ChatResponse:
        answer, safety_notice = await service.chat(payload.scan_id, payload.message)
        return ChatResponse(
            scan_id=payload.scan_id,
            answer=answer,
            safety_notice=safety_notice,
        )

    @application.post(
        "/generate-recipe",
        response_model=GenerateRecipeResponse,
        tags=["assistant"],
    )
    async def generate_recipe(payload: GenerateRecipeRequest) -> GenerateRecipeResponse:
        return await service.generate_recipes(payload.scan_id, payload.preferences)

    return application


app = create_app()
