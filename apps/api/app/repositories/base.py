from __future__ import annotations

from typing import Protocol
from uuid import UUID

from app.models import ScanResult


class ScanRepository(Protocol):
    kind: str

    async def save(self, scan: ScanResult) -> ScanResult: ...

    async def get(self, scan_id: UUID) -> ScanResult | None: ...

    async def list(self, *, limit: int = 50, offset: int = 0) -> list[ScanResult]: ...

    async def store_image(
        self,
        scan_id: UUID,
        data: bytes,
        content_type: str,
        filename: str,
    ) -> str | None: ...
