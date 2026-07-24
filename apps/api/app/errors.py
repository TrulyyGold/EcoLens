from __future__ import annotations

from typing import Any


class EcoLensError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        status_code: int = 400,
        details: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


class ScanNotFoundError(EcoLensError):
    def __init__(self, scan_id: object) -> None:
        super().__init__(
            "scan_not_found",
            f"Scan {scan_id} was not found.",
            status_code=404,
        )


class ProviderUnavailableError(EcoLensError):
    def __init__(self, message: str) -> None:
        super().__init__("provider_unavailable", message, status_code=503)
