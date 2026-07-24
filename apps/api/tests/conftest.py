from __future__ import annotations

from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings
from app.main import create_app
from app.repositories.memory import InMemoryScanRepository


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None,
        mock_mode=True,
        max_image_bytes=512 * 1024,
        analysis_timeout_seconds=1,
        cors_origins=["*"],
    )


@pytest.fixture
def repository() -> InMemoryScanRepository:
    return InMemoryScanRepository()


@pytest.fixture
def client(settings: Settings, repository: InMemoryScanRepository) -> TestClient:
    with TestClient(create_app(settings=settings, repository=repository)) as test_client:
        yield test_client


@pytest.fixture
def png_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (16, 16), (235, 196, 52)).save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture
def jpeg_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (16, 16), (210, 170, 80)).save(buffer, format="JPEG")
    return buffer.getvalue()


def analyze(
    client: TestClient, image: bytes, scenario: str = "banana", content_type: str = "image/png"
):
    extension = "jpg" if content_type == "image/jpeg" else content_type.rsplit("/", 1)[-1]
    return client.post(
        "/analyze-image",
        files={"image": (f"sample.{extension}", image, content_type)},
        data={"demo_scenario": scenario},
    )
