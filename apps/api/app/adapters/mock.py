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
        del message
        if scan.identification.category in {Category.PLANT, Category.MUSHROOM}:
            return (
                f"The image resembles {scan.identification.name}, but a photo cannot establish "
                "that a wild species is safe to eat. Please use a qualified local expert."
            )
        return (
            f"This scan identified {scan.identification.name} with "
            f"{round(scan.identification.confidence * 100)}% confidence. "
            f"{scan.description} Always check the product or produce directly before consuming it."
        )

    async def generate_recipes(self, scan: ScanResult, preferences: list[str]) -> list[Recipe]:
        del preferences
        if scan.recipes:
            return [recipe.model_copy(deep=True) for recipe in scan.recipes]
        if scan.identification.category in {Category.FOOD, Category.PACKAGED_FOOD}:
            return [
                Recipe(
                    title=f"Simple {scan.identification.name} snack",
                    time_minutes=5,
                    difficulty=Difficulty.EASY,
                    ingredients=[scan.identification.name, "Optional garnish"],
                    steps=["Check the item is fresh and matches the scan.", "Prepare and serve."],
                    dietary_notes=["Review ingredient labels for personal allergens."],
                )
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
            risk_level=RiskLevel.CAUTION,
            headline="Wild mushroom requires expert identification",
            warnings=["Toxic mushroom species can closely resemble edible species."],
            do_not_consume=False,
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


_SCENARIOS = {
    DemoScenario.BANANA: _banana(),
    DemoScenario.MUSHROOM: _mushroom(),
    DemoScenario.DORITOS: _doritos(),
}
