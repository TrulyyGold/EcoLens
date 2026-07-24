from __future__ import annotations

import threading
from collections import OrderedDict
from uuid import UUID

from app.models import ScanResult


class InMemoryScanRepository:
    """Process-local repository for development, tests, and credential-free demos."""

    kind = "memory"

    def __init__(self) -> None:
        self._items: OrderedDict[UUID, ScanResult] = OrderedDict()
        self._lock = threading.RLock()

    async def save(self, scan: ScanResult) -> ScanResult:
        with self._lock:
            self._items[scan.scan_id] = scan.model_copy(deep=True)
        return scan

    async def get(self, scan_id: UUID) -> ScanResult | None:
        with self._lock:
            item = self._items.get(scan_id)
            return item.model_copy(deep=True) if item else None

    async def list(self, *, limit: int = 50, offset: int = 0) -> list[ScanResult]:
        with self._lock:
            ordered = sorted(self._items.values(), key=lambda item: item.created_at, reverse=True)
            return [item.model_copy(deep=True) for item in ordered[offset : offset + limit]]

    async def store_image(
        self,
        scan_id: UUID,
        data: bytes,
        content_type: str,
        filename: str,
    ) -> str | None:
        # Deliberately do not retain image bytes in memory; only scan metadata is stored.
        del scan_id, data, content_type, filename
        return None
