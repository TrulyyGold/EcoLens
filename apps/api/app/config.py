from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        populate_by_name=True,
        extra="ignore",
    )

    app_name: str = "EcoLens API"
    environment: str = "development"
    mock_mode: bool = Field(
        default=True,
        validation_alias=AliasChoices("mock_mode", "ECOLENS_MOCK_MODE"),
    )
    max_image_bytes: int = Field(default=10 * 1024 * 1024, ge=1)
    analysis_timeout_seconds: float = Field(default=20.0, gt=0)
    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-3.6-flash"
    supabase_url: str | None = None
    supabase_key: SecretStr | None = None
    supabase_service_role_key: SecretStr | None = None
    supabase_storage_bucket: str = "scan-images"
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["*"])

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def supabase_enabled(self) -> bool:
        return bool(self.supabase_url and (self.supabase_service_role_key or self.supabase_key))

    @property
    def supabase_secret(self) -> str | None:
        secret = self.supabase_service_role_key or self.supabase_key
        return secret.get_secret_value() if secret else None


@lru_cache
def get_settings() -> Settings:
    return Settings()
