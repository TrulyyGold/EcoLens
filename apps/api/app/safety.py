from __future__ import annotations

import re

from app.models import AnalysisDraft, Category, ConfidenceLabel, RiskLevel, ScanStatus

PLANT_WARNING = (
    "Do not eat a plant based only on an image identification; toxic look-alikes may exist."
)
MUSHROOM_WARNING = (
    "Wild mushrooms are not safe to eat based on a photo. Toxic species can be visually "
    "identical to edible ones, and cooking does not neutralize their toxins."
)
LOW_CONFIDENCE_WARNING = (
    "The identification is uncertain. Do not consume this item until it is verified by "
    "a qualified expert."
)
HIGH_RISK_WARNING = "Do not consume this item. Keep it away from children and pets."
HAZARDOUS_NONFOOD_WARNING = (
    "This is not food. Swallowing it can cause serious internal injury; it can also "
    "burn skin and eyes and release dangerous fumes if mixed with other products."
)
NEVER_CONSUMABLE_WARNING = (
    "No amount of expert verification makes this item safe to eat."
)
MEDICAL_BOUNDARY = (
    "EcoLens cannot diagnose, treat, or provide medical advice. If someone may have "
    "eaten a harmful item or has symptoms, contact local emergency services or poison "
    "control now."
)

# Ordered least to most severe. Safety state may only ever move up this scale.
_RISK_SEVERITY: dict[str, int] = {
    RiskLevel.LOW: 0,
    RiskLevel.CAUTION: 1,
    RiskLevel.UNKNOWN: 2,
    RiskLevel.HIGH: 3,
}


def escalate_risk(current: RiskLevel | str, floor: RiskLevel | str) -> str:
    """Return whichever risk level is more severe.

    Safety rules previously assigned risk directly, which let a category or
    confidence rule silently *downgrade* a hazard the provider had already
    flagged as high (bleach and low-confidence toxic fungi both surfaced as
    merely "unknown"). Escalating instead of assigning keeps the deterministic
    floor without ever discarding a more severe finding.
    """

    current_rank = _RISK_SEVERITY.get(current, 0)
    floor_rank = _RISK_SEVERITY.get(floor, 0)
    return str(current if current_rank >= floor_rank else floor)


_MEDICAL_REQUEST = re.compile(
    r"\b(diagnos(?:e|is)|dose|dosage|prescri(?:be|ption)|medication|medicine|"
    r"treat(?:ment)?|cure|symptom|allergic reaction|poison(?:ed|ing)?|"
    r"should i induce vomiting|am i sick|medical advice)\b",
    re.IGNORECASE,
)
_MEDICAL_ADVICE_OUTPUT = re.compile(
    r"\b(take \d+\s*(?:mg|ml)|you (?:have|likely have)|i diagnose|"
    r"this will cure|stop taking your|increase your dose|induce vomiting)\b",
    re.IGNORECASE,
)


def is_medical_request(text: str) -> bool:
    return bool(_MEDICAL_REQUEST.search(text))


def contains_medical_advice(text: str) -> bool:
    return bool(_MEDICAL_ADVICE_OUTPUT.search(text))


def is_wild_or_unverified_species(draft: AnalysisDraft) -> bool:
    """Image-only plant/mushroom IDs cannot establish a safe cultivated source."""

    return draft.identification.category in {Category.PLANT, Category.MUSHROOM}


def apply_safety_policy(draft: AnalysisDraft) -> tuple[AnalysisDraft, ScanStatus, bool]:
    """Apply non-negotiable server-side rules after any model response.

    The model is never the authority for edibility. The returned draft is a copy,
    leaving adapter output untouched for auditability.
    """

    result = draft.model_copy(deep=True)
    identification = result.identification
    safety = result.safety
    warnings = list(dict.fromkeys(safety.warnings))

    if identification.confidence >= 0.85:
        identification.confidence_label = ConfidenceLabel.HIGH
    elif identification.confidence >= 0.65:
        identification.confidence_label = ConfidenceLabel.MODERATE
    else:
        identification.confidence_label = ConfidenceLabel.LOW

    status = ScanStatus.COMPLETE
    low_confidence = identification.confidence < 0.65
    risky = safety.risk_level in {RiskLevel.HIGH, RiskLevel.UNKNOWN} or safety.do_not_consume
    wild_species = is_wild_or_unverified_species(result)

    if identification.category == Category.PLANT:
        warnings.append(PLANT_WARNING)
        identification.requires_expert_verification = True
        safety.risk_level = escalate_risk(safety.risk_level, RiskLevel.CAUTION)
        safety.do_not_consume = True
        status = ScanStatus.NEEDS_REVIEW

    if identification.category == Category.MUSHROOM:
        warnings.append(MUSHROOM_WARNING)
        identification.requires_expert_verification = True
        safety.risk_level = escalate_risk(safety.risk_level, RiskLevel.HIGH)
        safety.do_not_consume = True
        # A photo cannot clear a wild mushroom, and no expert consultation makes an
        # unverified one edible, so the copy must not dangle verification as a path.
        safety.never_consumable = True
        status = ScanStatus.NEEDS_REVIEW

    if identification.category == Category.HAZARDOUS_NONFOOD:
        warnings.append(HAZARDOUS_NONFOOD_WARNING)
        safety.risk_level = escalate_risk(safety.risk_level, RiskLevel.HIGH)
        safety.do_not_consume = True
        safety.never_consumable = True
        # Not an identification problem: the item is known, and known to be inedible.
        identification.requires_expert_verification = False
        status = ScanStatus.NEEDS_REVIEW

    if low_confidence:
        warnings.append(LOW_CONFIDENCE_WARNING)
        identification.requires_expert_verification = True
        safety.risk_level = escalate_risk(safety.risk_level, RiskLevel.UNKNOWN)
        safety.do_not_consume = True
        status = ScanStatus.NEEDS_REVIEW

    if risky:
        warnings.append(HIGH_RISK_WARNING)
        if not safety.never_consumable:
            identification.requires_expert_verification = True
        status = ScanStatus.NEEDS_REVIEW

    if identification.category == Category.UNKNOWN:
        safety.risk_level = escalate_risk(safety.risk_level, RiskLevel.UNKNOWN)
        safety.do_not_consume = True
        identification.requires_expert_verification = True
        status = ScanStatus.NEEDS_REVIEW

    if safety.never_consumable:
        warnings.append(NEVER_CONSUMABLE_WARNING)
        safety.do_not_consume = True
        safety.risk_level = escalate_risk(safety.risk_level, RiskLevel.HIGH)
        status = ScanStatus.NEEDS_REVIEW

    if identification.requires_expert_verification:
        status = ScanStatus.NEEDS_REVIEW

    if safety.do_not_consume or safety.risk_level in {RiskLevel.HIGH, RiskLevel.UNKNOWN}:
        warnings.append(HIGH_RISK_WARNING)

    if (
        wild_species
        or low_confidence
        or risky
        or safety.do_not_consume
        or safety.never_consumable
        or identification.requires_expert_verification
    ):
        result.recipes = []

    # Provider text is untrusted. Remove any output pattern that crosses the
    # product's no-medical-advice boundary even when the food classification is safe.
    if contains_medical_advice(result.description):
        result.description = "Visual classification only; verify the item directly before use."
    result.facts = [fact for fact in result.facts if not contains_medical_advice(fact)]
    result.recipes = [
        recipe
        for recipe in result.recipes
        if not contains_medical_advice(
            " ".join([recipe.title, *recipe.ingredients, *recipe.steps, *recipe.dietary_notes])
        )
    ]
    warnings = [warning for warning in warnings if not contains_medical_advice(warning)]
    if result.nutrition:
        result.nutrition.notes = [
            note for note in result.nutrition.notes if not contains_medical_advice(note)
        ]
    if not warnings:
        warnings = ["Verify the item and its condition directly before consuming it."]

    safety.warnings = list(dict.fromkeys(warnings))
    safety.headline = _safe_headline(safety)
    if safety.never_consumable:
        # Deliberately gives no first-aid instruction: telling a user whether to
        # induce vomiting is exactly the medical advice this product refuses to
        # give, and it also trips the output filter below. Route to the experts.
        safety.emergency_guidance = (
            "If anyone has swallowed this, contact poison control or local emergency "
            "services now and follow their instructions."
        )
    elif safety.do_not_consume:
        safety.emergency_guidance = (
            "If ingestion may have occurred or symptoms develop, contact local emergency "
            "services or poison control promptly."
        )
    elif safety.emergency_guidance and contains_medical_advice(safety.emergency_guidance):
        safety.emergency_guidance = None
    chat_available = (
        not safety.do_not_consume
        and identification.confidence >= 0.65
        and not identification.requires_expert_verification
    )
    return result, status, chat_available


def _safe_headline(safety: object) -> str:
    # Kept deterministic so provider wording can never contradict a block.
    # Order matters: the strongest true statement wins, and only genuinely
    # unverified items are offered expert verification as a path forward.
    if getattr(safety, "never_consumable", False):
        return "Not safe to eat — do not consume this"
    if getattr(safety, "do_not_consume", False):
        return "Do not consume without expert verification"
    if getattr(safety, "risk_level", None) == RiskLevel.CAUTION:
        return "Use caution and review the warnings"
    return "No specific hazard identified, but verify before consuming"


def enforce_chat_boundary(answer: str) -> str:
    if contains_medical_advice(answer):
        return MEDICAL_BOUNDARY
    return answer.strip() or "I could not provide a reliable answer."
