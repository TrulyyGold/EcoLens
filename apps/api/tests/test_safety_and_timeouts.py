from __future__ import annotations

import asyncio

from fastapi.testclient import TestClient

from app.adapters.mock import MockAnalysisAdapter
from app.config import Settings
from app.main import create_app
from app.models import Category, ConfidenceLabel, DemoScenario, RiskLevel
from app.repositories.memory import InMemoryScanRepository
from app.safety import LOW_CONFIDENCE_WARNING, PLANT_WARNING, apply_safety_policy


async def _draft(scenario: DemoScenario):
    return await MockAnalysisAdapter().analyze(b"image", "image/png", scenario)


def test_low_confidence_output_is_downgraded_and_recipes_removed() -> None:
    draft = asyncio.run(_draft(DemoScenario.BANANA))
    draft.identification.confidence = 0.42
    draft.identification.confidence_label = ConfidenceLabel.HIGH
    draft.identification.requires_expert_verification = False
    draft.safety.risk_level = RiskLevel.LOW
    draft.safety.do_not_consume = False

    safe, status, chat_available = apply_safety_policy(draft)

    assert status == "needs_review"
    assert safe.identification.confidence_label == "low"
    assert safe.identification.requires_expert_verification is True
    assert safe.safety.risk_level == "unknown"
    assert safe.safety.do_not_consume is True
    assert LOW_CONFIDENCE_WARNING in safe.safety.warnings
    assert safe.recipes == []
    assert chat_available is False


def test_plant_rule_is_non_negotiable_and_medical_recipe_text_is_removed() -> None:
    draft = asyncio.run(_draft(DemoScenario.BANANA))
    draft.identification.category = Category.PLANT
    draft.identification.name = "Unknown leafy plant"
    draft.recipes[0].steps = ["Take 500 mg twice daily to cure symptoms."]

    safe, status, _ = apply_safety_policy(draft)

    assert status == "needs_review"
    assert PLANT_WARNING in safe.safety.warnings
    assert safe.safety.do_not_consume is True
    assert safe.recipes == []


class SlowAdapter(MockAnalysisAdapter):
    async def analyze(self, image: bytes, content_type: str, scenario=None):
        await asyncio.sleep(0.1)
        return await super().analyze(image, content_type, scenario)


def test_analysis_timeout_is_structured(png_bytes: bytes) -> None:
    settings = Settings(
        _env_file=None,
        mock_mode=True,
        max_image_bytes=1024,
        analysis_timeout_seconds=0.01,
    )
    application = create_app(
        settings=settings,
        repository=InMemoryScanRepository(),
        adapter=SlowAdapter(),
    )

    with TestClient(application, raise_server_exceptions=False) as client:
        response = client.post(
            "/analyze-image",
            files={"image": ("sample.png", png_bytes, "image/png")},
        )

    assert response.status_code == 504
    assert response.json()["error"]["code"] == "analysis_timeout"
    assert response.json()["request_id"] == response.headers["x-request-id"]
