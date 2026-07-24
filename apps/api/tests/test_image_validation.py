from __future__ import annotations

from uuid import UUID

from fastapi.testclient import TestClient


def assert_structured_error(response, code: str) -> None:
    payload = response.json()
    assert payload["error"]["code"] == code
    assert payload["error"]["message"]
    assert payload["request_id"] == response.headers["x-request-id"]


def test_rejects_unsupported_content_type(client: TestClient) -> None:
    response = client.post(
        "/analyze-image",
        files={"image": ("notes.txt", b"not an image", "text/plain")},
    )

    assert response.status_code == 415
    assert_structured_error(response, "unsupported_image_type")


def test_rejects_invalid_image_bytes(client: TestClient) -> None:
    response = client.post(
        "/analyze-image",
        files={"image": ("fake.png", b"not really png", "image/png")},
    )

    assert response.status_code == 422
    assert_structured_error(response, "invalid_image")


def test_rejects_content_type_mismatch(client: TestClient, png_bytes: bytes) -> None:
    response = client.post(
        "/analyze-image",
        files={"image": ("fake.jpg", png_bytes, "image/jpeg")},
    )

    assert response.status_code == 415
    assert_structured_error(response, "image_type_mismatch")


def test_rejects_image_over_byte_limit(client: TestClient) -> None:
    response = client.post(
        "/analyze-image",
        files={"image": ("huge.png", b"x" * (512 * 1024 + 1), "image/png")},
    )

    assert response.status_code == 413
    assert_structured_error(response, "image_too_large")
    assert response.json()["error"]["details"]["max_bytes"] == 512 * 1024


def test_missing_image_and_invalid_scenario_are_structured(
    client: TestClient,
    png_bytes: bytes,
) -> None:
    missing = client.post("/analyze-image")
    assert missing.status_code == 422
    assert_structured_error(missing, "missing_image")

    invalid_scenario = client.post(
        "/analyze-image",
        files={"image": ("sample.png", png_bytes, "image/png")},
        data={"demo_scenario": "unsafe-surprise"},
    )
    assert invalid_scenario.status_code == 422
    assert_structured_error(invalid_scenario, "validation_error")


def test_legacy_file_field_and_sanitized_request_id(client: TestClient, png_bytes: bytes) -> None:
    response = client.post(
        "/analyze-image",
        files={"file": ("sample.png", png_bytes, "image/png")},
        headers={"X-Request-ID": "invalid id with spaces"},
    )

    assert response.status_code == 200
    UUID(response.headers["x-request-id"])
