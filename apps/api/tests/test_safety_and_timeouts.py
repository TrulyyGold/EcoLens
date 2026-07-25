from __future__ import annotations

import asyncio

from fastapi.testclient import TestClient

from app.adapters.mock import MockAnalysisAdapter
from app.config import Settings
from app.main import create_app
from app.models import Category, ConfidenceLabel, DemoScenario, RiskLevel
from app.repositories.memory import InMemoryScanRepository
from app.safety import (
    LOW_CONFIDENCE_WARNING,
    PLANT_WARNING,
    apply_safety_policy,
    escalate_risk,
)


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


def test_escalate_risk_never_downgrades_severity() -> None:
    # unknown outranks caution/low but must never displace a high-risk finding.
    assert escalate_risk(RiskLevel.HIGH, RiskLevel.UNKNOWN) == "high"
    assert escalate_risk(RiskLevel.LOW, RiskLevel.UNKNOWN) == "unknown"
    assert escalate_risk(RiskLevel.CAUTION, RiskLevel.HIGH) == "high"
    assert escalate_risk(RiskLevel.HIGH, RiskLevel.LOW) == "high"
    assert escalate_risk(RiskLevel.LOW, RiskLevel.CAUTION) == "caution"


def test_low_confidence_does_not_downgrade_a_high_risk_finding() -> None:
    """Low confidence in *what* an item is must not soften *how dangerous* it is.

    Regression test: the confidence rule used to assign `unknown` outright, so a
    blurry photo of a hazard reported "unknown risk" instead of "high risk".
    """

    draft = asyncio.run(_draft(DemoScenario.MUSHROOM))
    draft.identification.confidence = 0.30
    draft.safety.risk_level = RiskLevel.HIGH

    safe, status, chat_available = apply_safety_policy(draft)

    assert safe.safety.risk_level == "high"
    assert safe.identification.confidence_label == "low"
    assert safe.safety.do_not_consume is True
    assert status == "needs_review"
    assert chat_available is False
    assert LOW_CONFIDENCE_WARNING in safe.safety.warnings


def test_never_consumable_headline_offers_no_verification_path() -> None:
    """Copy for a never-consumable item must not imply an expert could clear it."""

    draft = asyncio.run(_draft(DemoScenario.BLEACH))

    safe, status, chat_available = apply_safety_policy(draft)

    assert safe.safety.never_consumable is True
    assert safe.safety.risk_level == "high"
    assert status == "needs_review"
    assert chat_available is False
    assert "expert" not in safe.safety.headline.lower()
    assert safe.recipes == []
    # Emergency guidance routes to professionals without giving first-aid steps.
    assert "poison control" in (safe.safety.emergency_guidance or "")


def test_unknown_category_still_reads_as_uncertain() -> None:
    """Decisiveness about known hazards must not make genuine ambiguity decisive.

    An unidentified item should still be uncertain and still offer the expert
    path, which is the one case where verification genuinely resolves things.
    """

    draft = asyncio.run(_draft(DemoScenario.BANANA))
    draft.identification.category = Category.UNKNOWN
    draft.identification.name = "Unidentified object"

    safe, status, _ = apply_safety_policy(draft)

    assert safe.safety.risk_level == "unknown"
    assert safe.safety.never_consumable is False
    assert safe.identification.requires_expert_verification is True
    assert "expert verification" in safe.safety.headline
    assert status == "needs_review"


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
