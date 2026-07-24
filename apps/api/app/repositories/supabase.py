from __future__ import annotations

import asyncio
import re
from pathlib import Path
from typing import Any
from uuid import UUID

from app.models import ScanResult


class SupabaseScanRepository:
    """Optional Supabase Postgres and Storage repository.

    A backend service-role key is recommended. Database RLS remains enabled for
    direct client access; see migrations/001_initial.sql.
    """

    kind = "supabase"

    def __init__(self, url: str, key: str, storage_bucket: str = "scan-images") -> None:
        from supabase import create_client

        self._client = create_client(url, key)
        self._bucket = storage_bucket

    async def save(self, scan: ScanResult) -> ScanResult:
        payload = {
            "id": str(scan.scan_id),
            "created_at": scan.created_at.isoformat(),
            "result": scan.model_dump(mode="json"),
        }
        await asyncio.to_thread(self._save_sync, payload)
        return scan

    def _save_sync(self, payload: dict[str, Any]) -> None:
        self._client.table("scans").upsert(payload).execute()

    async def get(self, scan_id: UUID) -> ScanResult | None:
        rows = await asyncio.to_thread(self._get_sync, scan_id)
        if not rows:
            return None
        return ScanResult.model_validate(rows[0]["result"])

    def _get_sync(self, scan_id: UUID) -> list[dict[str, Any]]:
        response = (
            self._client.table("scans").select("result").eq("id", str(scan_id)).limit(1).execute()
        )
        return response.data or []

    async def list(self, *, limit: int = 50, offset: int = 0) -> list[ScanResult]:
        rows = await asyncio.to_thread(self._list_sync, limit, offset)
        return [ScanResult.model_validate(row["result"]) for row in rows]

    def _list_sync(self, limit: int, offset: int) -> list[dict[str, Any]]:
        response = (
            self._client.table("scans")
            .select("result")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return response.data or []

    async def store_image(
        self,
        scan_id: UUID,
        data: bytes,
        content_type: str,
        filename: str,
    ) -> str | None:
        return await asyncio.to_thread(
            self._store_image_sync,
            scan_id,
            data,
            content_type,
            filename,
        )

    def _store_image_sync(
        self,
        scan_id: UUID,
        data: bytes,
        content_type: str,
        filename: str,
    ) -> str | None:
        safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", Path(filename).name) or "image"
        object_path = f"{scan_id}/{safe_name}"
        self._client.storage.from_(self._bucket).upload(
            object_path,
            data,
            {"content-type": content_type, "upsert": "false"},
        )
        signed = self._client.storage.from_(self._bucket).create_signed_url(object_path, 3600)
        if isinstance(signed, str):
            return signed
        if isinstance(signed, dict):
            return signed.get("signedURL") or signed.get("signedUrl")
        return None
