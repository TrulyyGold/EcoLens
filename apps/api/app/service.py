from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from app.adapters.base import AnalysisAdapter
from app.errors import EcoLensError, ScanNotFoundError
from app.models import (
    AnalysisMeta,
    Category,
    DemoScenario,
    GenerateRecipeResponse,
    Recipe,
    ScanResult,
)
from app.repositories.base import ScanRepository
from app.safety import (
    MEDICAL_BOUNDARY,
    apply_safety_policy,
    contains_medical_advice,
    enforce_chat_boundary,
    is_medical_request,
)

# Kept here to avoid coupling the service to one provider implementation.
PROMPT_VERSION = "2026-07-ecolens-v2"
UTC = timezone.utc  # noqa: UP017


class EcoLensService:
    def __init__(
        self,
        adapter: AnalysisAdapter,
        repository: ScanRepository,
        *,
        timeout_seconds: float,
        demo_adapter: AnalysisAdapter | None = None,
    ) -> None:
        self.adapter = adapter
        self.demo_adapter = demo_adapter or (adapter if adapter.is_mock else None)
        self.repository = repository
        self.timeout_seconds = timeout_seconds

    async def analyze(
        self,
        image: bytes,
        content_type: str,
        filename: str,
        scenario: DemoScenario | None,
        *,
        started_at: float | None = None,
    ) -> ScanResult:
        started = started_at if started_at is not None else time.perf_counter()
        scan_id = uuid4()

        analysis_adapter = self.demo_adapter if scenario and self.demo_adapter else self.adapter
        try:
            draft = await asyncio.wait_for(
                analysis_adapter.analyze(image, content_type, scenario),
                timeout=self.timeout_seconds,
            )
        except asyncio.TimeoutError as exc:  # noqa: UP041
            raise EcoLensError(
                "analysis_timeout",
                "Image analysis exceeded the configured timeout.",
                status_code=504,
            ) from exc

        safe_draft, status, chat_available = apply_safety_policy(draft)

        safe_filename = Path(filename or "image").name
        try:
            image_url = await self.repository.store_image(
                scan_id,
                image,
                content_type,
                safe_filename,
            )
        except Exception as exc:
            raise EcoLensError(
                "storage_unavailable",
                "The image could not be stored.",
                status_code=503,
            ) from exc

        latency_ms = max(0, round((time.perf_counter() - started) * 1000))
        scan = ScanResult(
            scan_id=scan_id,
            status=status,
            identification=safe_draft.identification,
            description=safe_draft.description,
            safety=safe_draft.safety,
            nutrition=safe_draft.nutrition,
            recipes=safe_draft.recipes,
            facts=safe_draft.facts,
            image_url=image_url,
            created_at=datetime.now(UTC),
            chat_available=chat_available,
            analysis_meta=AnalysisMeta(
                model=analysis_adapter.model_name,
                prompt_version=PROMPT_VERSION,
                mock=analysis_adapter.is_mock,
                latency_ms=latency_ms,
            ),
        )
        try:
            return await self.repository.save(scan)
        except Exception as exc:
            raise EcoLensError(
                "persistence_unavailable",
                "The scan result could not be persisted.",
                status_code=503,
            ) from exc

    async def get_scan(self, scan_id: UUID) -> ScanResult:
        scan = await self.repository.get(scan_id)
        if scan is None:
            raise ScanNotFoundError(scan_id)
        return scan

    async def list_scans(self, *, limit: int, offset: int) -> list[ScanResult]:
        return await self.repository.list(limit=limit, offset=offset)

    async def chat(self, scan_id: UUID, message: str) -> tuple[str, str | None]:
        scan = await self.get_scan(scan_id)
        if is_medical_request(message):
            return MEDICAL_BOUNDARY, MEDICAL_BOUNDARY

        if not scan.chat_available:
            # Never-consumable scans get a definite answer; only genuinely
            # unverified ones are pointed at expert verification.
            if scan.safety.never_consumable:
                notice = (
                    "This item is not food and must not be eaten. Follow-up chat is "
                    "disabled for it."
                )
            else:
                notice = (
                    "This scan requires expert verification. Do not consume the item based "
                    "on this result."
                )
            return notice, notice

        operation_adapter = (
            self.demo_adapter if scan.analysis_meta.mock and self.demo_adapter else self.adapter
        )
        try:
            answer = await asyncio.wait_for(
                operation_adapter.chat(scan, message),
                timeout=self.timeout_seconds,
            )
        except asyncio.TimeoutError as exc:  # noqa: UP041
            raise EcoLensError(
                "analysis_timeout",
                "Chat generation exceeded the configured timeout.",
                status_code=504,
            ) from exc
        answer = enforce_chat_boundary(answer)
        notice = MEDICAL_BOUNDARY if answer == MEDICAL_BOUNDARY else None
        return answer, notice

    async def generate_recipes(
        self,
        scan_id: UUID,
        preferences: list[str],
    ) -> GenerateRecipeResponse:
        scan = await self.get_scan(scan_id)
        should_suppress = (
            scan.identification.category
            in {
                Category.PLANT,
                Category.MUSHROOM,
                Category.HAZARDOUS_NONFOOD,
                Category.UNKNOWN,
            }
            or scan.identification.confidence < 0.65
            or scan.identification.requires_expert_verification
            or scan.safety.do_not_consume
            or scan.safety.never_consumable
        )
        if should_suppress:
            return GenerateRecipeResponse(
                scan_id=scan.scan_id,
                recipes=[],
                suppressed=True,
                reason=(
                    "Recipes are disabled for wild, uncertain, or safety-sensitive identifications."
                ),
            )

        operation_adapter = (
            self.demo_adapter if scan.analysis_meta.mock and self.demo_adapter else self.adapter
        )
        try:
            recipes = await asyncio.wait_for(
                operation_adapter.generate_recipes(scan, preferences),
                timeout=self.timeout_seconds,
            )
        except asyncio.TimeoutError as exc:  # noqa: UP041
            raise EcoLensError(
                "analysis_timeout",
                "Recipe generation exceeded the configured timeout.",
                status_code=504,
            ) from exc

        safe_recipes: list[Recipe] = []
        for recipe in recipes[:3]:
            text = " ".join(
                [recipe.title, *recipe.ingredients, *recipe.steps, *recipe.dietary_notes]
            )
            if not contains_medical_advice(text):
                safe_recipes.append(recipe)

        if not safe_recipes:
            return GenerateRecipeResponse(
                scan_id=scan.scan_id,
                recipes=[],
                suppressed=True,
                reason="No recipe passed EcoLens safety validation.",
            )

        updated = scan.model_copy(update={"recipes": safe_recipes}, deep=True)
        await self.repository.save(updated)
        return GenerateRecipeResponse(
            scan_id=scan.scan_id,
            recipes=safe_recipes,
            suppressed=False,
            reason=None,
        )
