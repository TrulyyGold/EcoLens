from __future__ import annotations

from typing import Protocol

from app.models import AnalysisDraft, DemoScenario, Recipe, ScanResult


class AnalysisAdapter(Protocol):
    model_name: str
    is_mock: bool

    async def analyze(
        self,
        image: bytes,
        content_type: str,
        scenario: DemoScenario | None = None,
    ) -> AnalysisDraft: ...

    async def chat(self, scan: ScanResult, message: str) -> str: ...

    async def generate_recipes(self, scan: ScanResult, preferences: list[str]) -> list[Recipe]: ...
