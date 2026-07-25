from __future__ import annotations

from datetime import datetime
from typing import Annotated

try:
    from enum import StrEnum
except ImportError:  # pragma: no cover - deployment uses Python 3.11+
    from enum import Enum

    class StrEnum(str, Enum):  # noqa: UP042
        """Compatibility shim used only by older local test interpreters."""


from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid", use_enum_values=True)


class Category(StrEnum):
    FOOD = "food"
    PACKAGED_FOOD = "packaged_food"
    PLANT = "plant"
    MUSHROOM = "mushroom"
    HAZARDOUS_NONFOOD = "hazardous_nonfood"
    UNKNOWN = "unknown"


class ConfidenceLabel(StrEnum):
    HIGH = "high"
    MODERATE = "moderate"
    LOW = "low"


class RiskLevel(StrEnum):
    LOW = "low"
    CAUTION = "caution"
    HIGH = "high"
    UNKNOWN = "unknown"


class ScanStatus(StrEnum):
    COMPLETE = "complete"
    NEEDS_REVIEW = "needs_review"


class NutritionBasis(StrEnum):
    LABEL = "label"
    ESTIMATED = "estimated"
    GENERAL = "general"
    UNAVAILABLE = "unavailable"


class Difficulty(StrEnum):
    EASY = "easy"
    MEDIUM = "medium"


class DemoScenario(StrEnum):
    BANANA = "banana"
    MUSHROOM = "mushroom"
    DORITOS = "doritos"
    BLEACH = "bleach"


class IdentificationAlternative(APIModel):
    name: str
    reason: str


class Identification(APIModel):
    name: NonEmptyString
    scientific_name: str | None = None
    brand: str | None = None
    category: Category
    confidence: float = Field(ge=0, le=1)
    confidence_label: ConfidenceLabel
    evidence: list[str] = Field(default_factory=list, max_length=5)
    alternatives: list[IdentificationAlternative] = Field(default_factory=list, max_length=3)
    requires_expert_verification: bool


class Safety(APIModel):
    risk_level: RiskLevel
    headline: str
    warnings: list[str] = Field(min_length=1)
    do_not_consume: bool
    never_consumable: bool = False
    """True when no verification can make the item consumable.

    Distinct from `do_not_consume`, which also covers merely unverified items.
    An unidentified berry is do-not-consume but an expert could clear it; bleach
    and toxic fungi can never be cleared, and the copy must not imply otherwise.
    """
    emergency_guidance: str | None = None


class Nutrition(APIModel):
    basis: NutritionBasis
    serving_size: str | None = None
    calories: float | None = Field(default=None, ge=0)
    protein_g: float | None = Field(default=None, ge=0)
    carbs_g: float | None = Field(default=None, ge=0)
    fat_g: float | None = Field(default=None, ge=0)
    sugar_g: float | None = Field(default=None, ge=0)
    sodium_mg: float | None = Field(default=None, ge=0)
    notes: list[str] = Field(default_factory=list)


class Recipe(APIModel):
    title: str
    time_minutes: int = Field(ge=1)
    difficulty: Difficulty
    ingredients: list[str] = Field(min_length=1)
    steps: list[str] = Field(min_length=1)
    dietary_notes: list[str] = Field(default_factory=list)


class AnalysisMeta(APIModel):
    model: str
    prompt_version: str
    mock: bool
    latency_ms: int = Field(ge=0)


class ScanResult(APIModel):
    """Canonical response model matching contracts/scan-result.schema.json."""

    scan_id: UUID
    status: ScanStatus
    identification: Identification
    description: NonEmptyString
    safety: Safety
    nutrition: Nutrition | None = None
    recipes: list[Recipe] = Field(default_factory=list, max_length=3)
    facts: list[str] = Field(default_factory=list, max_length=5)
    image_url: str | None = None
    created_at: datetime
    chat_available: bool
    analysis_meta: AnalysisMeta

    @field_validator("created_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("created_at must include a timezone")
        return value


class AnalysisDraft(APIModel):
    """Strict model boundary for provider-produced structured JSON."""

    identification: Identification
    description: NonEmptyString
    safety: Safety
    nutrition: Nutrition | None = None
    recipes: list[Recipe] = Field(default_factory=list, max_length=3)
    facts: list[str] = Field(default_factory=list, max_length=5)


class ChatProviderResponse(APIModel):
    answer: str


class RecipeProviderResponse(APIModel):
    recipes: list[Recipe] = Field(default_factory=list, max_length=3)


class ChatRequest(APIModel):
    scan_id: UUID
    message: str = Field(min_length=1, max_length=1000)

    @field_validator("message")
    @classmethod
    def normalize_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message cannot be blank")
        return value


class ChatResponse(APIModel):
    scan_id: UUID
    answer: str
    safety_notice: str | None = None


class GenerateRecipeRequest(APIModel):
    scan_id: UUID
    preferences: list[str] = Field(default_factory=list, max_length=10)


class GenerateRecipeResponse(APIModel):
    scan_id: UUID
    recipes: list[Recipe] = Field(default_factory=list, max_length=3)
    suppressed: bool
    reason: str | None = None


class HealthResponse(APIModel):
    status: str
    service: str
    version: str
    mock_mode: bool
    repository: str


class ErrorDetail(APIModel):
    code: str
    message: str
    details: object | None = None


class ErrorResponse(APIModel):
    error: ErrorDetail
    request_id: str
