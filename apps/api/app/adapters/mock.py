from __future__ import annotations

from app.models import (
    AnalysisDraft,
    Category,
    ConfidenceLabel,
    DemoScenario,
    Difficulty,
    Identification,
    IdentificationAlternative,
    Nutrition,
    NutritionBasis,
    Recipe,
    RiskLevel,
    Safety,
    ScanResult,
)


class MockAnalysisAdapter:
    model_name = "ecolens-demo-v1"
    is_mock = True

    async def analyze(
        self,
        image: bytes,
        content_type: str,
        scenario: DemoScenario | None = None,
    ) -> AnalysisDraft:
        del image, content_type
        selected = scenario or DemoScenario.BANANA
        return _SCENARIOS[selected].model_copy(deep=True)

    async def chat(self, scan: ScanResult, message: str) -> str:
        topic = message.lower()
        wild = scan.identification.category in {Category.PLANT, Category.MUSHROOM}
        confidence_pct = round(scan.identification.confidence * 100)

        if any(word in topic for word in ("evidence", "why", "sure", "confiden", "how do you know")):
            evidence = scan.identification.evidence
            if evidence:
                listed = "; ".join(evidence[:4])
                return (
                    f"I matched {scan.identification.name} at {confidence_pct}% confidence based on: "
                    f"{listed}. That's a visual read from one photo, not a lab test, so treat it as a "
                    "starting point rather than a final answer."
                )
            return f"I identified {scan.identification.name} at {confidence_pct}% confidence, but this scan didn't record specific visual evidence to point to."

        if any(word in topic for word in ("safe", "safety", "eat", "danger", "risk", "poison", "toxic")):
            warnings = "; ".join(scan.safety.warnings) if scan.safety.warnings else "no specific warnings were logged for this scan"
            # Checked first: a never-consumable item gets a definite answer, not a
            # suggestion to check with an expert who could not clear it anyway.
            if scan.safety.never_consumable:
                return (
                    f"{scan.safety.headline}. {warnings}. This is not a case of needing a "
                    "second opinion — it should not be eaten at all."
                )
            if wild:
                return (
                    f"{scan.safety.headline}. {warnings}. A photo genuinely cannot rule out a toxic "
                    "look-alike here, so please don't eat this based on the scan alone — check with a "
                    "qualified local expert first."
                )
            return f"{scan.safety.headline}. {warnings}. Worth a quick look-over before eating, even at {confidence_pct}% identification confidence."

        if any(word in topic for word in ("nutrition", "calorie", "protein", "carb", "fat", "sugar", "sodium")):
            if scan.nutrition:
                n = scan.nutrition
                basis_note = "estimated from a typical product listing" if n.basis.value == "estimated" else (
                    "read from the label in your photo" if n.basis.value == "label" else "a general reference value for this food"
                )
                return (
                    f"Per {n.serving_size}: about {n.calories} calories, {n.protein_g}g protein, "
                    f"{n.carbs_g}g carbs, {n.fat_g}g fat. These numbers are {basis_note}, so the "
                    "actual package or fruit in front of you is always the more reliable source."
                )
            return "This scan doesn't have nutrition data — that's expected for wild plants, mushrooms, or anything a photo alone can't quantify."

        if any(word in topic for word in ("recipe", "cook", "make", "prepare")):
            if scan.recipes:
                titles = ", ".join(r.title for r in scan.recipes[:3])
                return f"A couple of ideas already on this scan: {titles}. Open the Recipes tab for the full ingredients and steps."
            return "No recipes here — that's intentional for wild finds, low-confidence matches, or anything flagged with a safety concern."

        if scan.safety.never_consumable:
            return (
                f"This scan identified {scan.identification.name} at "
                f"{confidence_pct}% confidence, and it is not something that can be "
                "eaten. Ask me about the evidence or the safety notes on this scan."
            )

        if wild:
            return (
                f"This looks like {scan.identification.name} ({confidence_pct}% confidence from the photo), "
                f"but {scan.identification.name.lower()} identification isn't something a single image can "
                "confirm safely. Ask me about the evidence or safety notes, or check with a local expert "
                "before doing anything with it."
            )
        return (
            f"This scan identified {scan.identification.name} at {confidence_pct}% confidence. "
            f"{scan.description} Ask me about the evidence, safety notes, or nutrition, and I'll stick to "
            "what's recorded in this scan."
        )


    async def generate_recipes(self, scan: ScanResult, preferences: list[str]) -> list[Recipe]:
        if scan.recipes:
            return [recipe.model_copy(deep=True) for recipe in scan.recipes]
        if scan.identification.category in {Category.FOOD, Category.PACKAGED_FOOD}:
            name = scan.identification.name
            pref_note = f" Adjusted for: {', '.join(preferences)}." if preferences else ""
            return [
                Recipe(
                    title=f"Quick {name.lower()} plate",
                    time_minutes=8,
                    difficulty=Difficulty.EASY,
                    ingredients=[name, "A squeeze of lemon", "A pinch of salt"],
                    steps=[
                        f"Rinse and inspect the {name.lower()} for freshness before using it.",
                        f"Slice or portion the {name.lower()} to your preferred size.",
                        f"Finish with lemon and salt, then serve right away.{pref_note}",
                    ],
                    dietary_notes=["Check the ingredient label or produce for personal allergens before eating."],
                ),
                Recipe(
                    title=f"{name} snack bowl",
                    time_minutes=10,
                    difficulty=Difficulty.EASY,
                    ingredients=[name, "1 cup mixed greens or grain of choice", "A drizzle of olive oil"],
                    steps=[
                        f"Combine the {name.lower()} with your base of greens or grains.",
                        "Add olive oil and toss gently.",
                        "Taste and adjust seasoning before serving.",
                    ],
                    dietary_notes=[f"Swap the base to fit dietary needs.{pref_note}".strip()],
                ),
            ]
        return []


def _banana() -> AnalysisDraft:
    return AnalysisDraft(
        identification=Identification(
            name="Banana",
            scientific_name="Musa spp.",
            brand=None,
            category=Category.FOOD,
            confidence=0.97,
            confidence_label=ConfidenceLabel.HIGH,
            evidence=["Elongated curved shape", "Yellow peel", "Dark stem tip"],
            alternatives=[],
            requires_expert_verification=False,
        ),
        description="A ripe yellow banana, a commonly cultivated edible fruit.",
        safety=Safety(
            risk_level=RiskLevel.LOW,
            headline="Generally recognized food",
            warnings=["Check for mold, spoilage, and personal allergies before eating."],
            do_not_consume=False,
            emergency_guidance=None,
        ),
        nutrition=Nutrition(
            basis=NutritionBasis.GENERAL,
            serving_size="1 medium banana (about 118 g)",
            calories=105,
            protein_g=1.3,
            carbs_g=27,
            fat_g=0.4,
            sugar_g=14.4,
            sodium_mg=1,
            notes=["General reference values; size and ripeness change the estimate."],
        ),
        recipes=[
            Recipe(
                title="Banana oat bowl",
                time_minutes=5,
                difficulty=Difficulty.EASY,
                ingredients=["1 banana", "1/2 cup rolled oats", "1 cup milk or plant drink"],
                steps=["Cook the oats with the milk.", "Slice the banana and place it on top."],
                dietary_notes=["Use a suitable plant drink for a dairy-free option."],
            ),
            Recipe(
                title="Frozen banana bites",
                time_minutes=65,
                difficulty=Difficulty.EASY,
                ingredients=["1 banana", "2 tablespoons yogurt"],
                steps=["Slice and coat the banana with yogurt.", "Freeze until firm."],
                dietary_notes=["Check yogurt ingredients for allergens."],
            ),
        ],
        facts=[
            "Bananas are botanically berries.",
            "Peel color changes as starches convert to sugars during ripening.",
        ],
    )


def _mushroom() -> AnalysisDraft:
    return AnalysisDraft(
        identification=Identification(
            name="Possible field mushroom",
            scientific_name="Agaricus sp.",
            brand=None,
            category=Category.MUSHROOM,
            confidence=0.72,
            confidence_label=ConfidenceLabel.MODERATE,
            evidence=["Pale cap", "Central stem", "Dark crowded gills"],
            alternatives=[
                IdentificationAlternative(
                    name="Destroying angel group",
                    reason="Some toxic Amanita species can appear pale in photographs.",
                )
            ],
            requires_expert_verification=True,
        ),
        description=(
            "A pale gilled mushroom photographed outside; a photo is insufficient for "
            "safe identification."
        ),
        safety=Safety(
            # States its own severity rather than relying on the server's category
            # rule to rescue it; the deterministic rule is a backstop, not a crutch.
            risk_level=RiskLevel.HIGH,
            headline="Potentially poisonous wild mushroom",
            warnings=["Toxic mushroom species can closely resemble edible species."],
            do_not_consume=True,
            never_consumable=True,
            emergency_guidance=(
                "If ingestion may have occurred, contact local emergency services or "
                "poison control promptly."
            ),
        ),
        nutrition=None,
        # Deliberately present in provider-like mock output; server safety policy must remove it.
        recipes=[
            Recipe(
                title="Mushroom saute",
                time_minutes=15,
                difficulty=Difficulty.EASY,
                ingredients=["Mushrooms", "Oil"],
                steps=["Saute until browned."],
                dietary_notes=[],
            )
        ],
        facts=[
            "Mushroom identification can require gill, stem, spore, habitat, and bruising details."
        ],
    )


def _doritos() -> AnalysisDraft:
    return AnalysisDraft(
        identification=Identification(
            name="Nacho Cheese flavored tortilla chips",
            scientific_name=None,
            brand="Doritos",
            category=Category.PACKAGED_FOOD,
            confidence=0.96,
            confidence_label=ConfidenceLabel.HIGH,
            evidence=["Doritos wordmark", "Red branded package", "Nacho Cheese flavor label"],
            alternatives=[],
            requires_expert_verification=False,
        ),
        description="A package of Doritos Nacho Cheese flavored tortilla chips.",
        safety=Safety(
            risk_level=RiskLevel.LOW,
            headline="Review package label",
            warnings=[
                "Verify the sealed package, expiration date, ingredient list, and allergen "
                "statement before eating."
            ],
            do_not_consume=False,
            emergency_guidance=None,
        ),
        nutrition=Nutrition(
            basis=NutritionBasis.LABEL,
            serving_size="About 12 chips (28 g)",
            calories=150,
            protein_g=2,
            carbs_g=18,
            fat_g=8,
            sugar_g=1,
            sodium_mg=210,
            notes=[
                "Representative label values; use the photographed package label as the authority."
            ],
        ),
        recipes=[
            Recipe(
                title="Crunchy taco salad topper",
                time_minutes=10,
                difficulty=Difficulty.EASY,
                ingredients=["Mixed salad", "Beans", "Doritos chips", "Salsa"],
                steps=[
                    "Assemble salad and beans.",
                    "Crush a small portion of chips on top and add salsa.",
                ],
                dietary_notes=["Check the product label for dairy and other allergens."],
            )
        ],
        facts=[
            "Tortilla chips are commonly made from corn masa.",
            "Package labels are the best nutrition source.",
        ],
    )


def _bleach() -> AnalysisDraft:
    """Household chemical fixture: recognizable, and recognizably not food.

    Guards the regression where a known hazard surfaced as "unknown risk" with a
    "needs review" mark because no category fit it and the server overwrote the
    provider's high-risk call.
    """

    return AnalysisDraft(
        identification=Identification(
            name="Concentrated regular bleach",
            scientific_name=None,
            brand="Clorox",
            category=Category.HAZARDOUS_NONFOOD,
            confidence=0.98,
            confidence_label=ConfidenceLabel.HIGH,
            evidence=[
                "Clorox wordmark on an opaque white jug",
                "'Concentrated' and 'Regular Bleach' label text",
                "Ribbed handle typical of liquid bleach packaging",
            ],
            alternatives=[],
            requires_expert_verification=False,
        ),
        description=(
            "A jug of household chlorine bleach photographed on a kitchen counter. "
            "It is a cleaning product, not a beverage, despite sitting beside a glass "
            "of water."
        ),
        safety=Safety(
            risk_level=RiskLevel.HIGH,
            headline="Not safe to eat — do not consume this",
            warnings=[
                "Sodium hypochlorite is corrosive and can cause serious internal injury "
                "if swallowed.",
                "Never decant bleach into a cup, bottle, or other drink container.",
                "Mixing bleach with ammonia or acidic cleaners releases toxic gas.",
            ],
            do_not_consume=True,
            never_consumable=True,
            emergency_guidance=(
                "If anyone has swallowed this, contact poison control or local emergency "
                "services now and follow their instructions."
            ),
        ),
        nutrition=None,
        recipes=[],
        facts=[
            "Household bleach is typically a 5-9% sodium hypochlorite solution.",
            "Bleach degrades over time, which is why containers carry a production date.",
        ],
    )


_SCENARIOS = {
    DemoScenario.BANANA: _banana(),
    DemoScenario.MUSHROOM: _mushroom(),
    DemoScenario.DORITOS: _doritos(),
    DemoScenario.BLEACH: _bleach(),
}
