from __future__ import annotations

import json
from pathlib import Path

import pytest
from conftest import analyze
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator, FormatChecker

CONTRACT_PATH = Path(__file__).resolve().parents[3] / "contracts" / "scan-result.schema.json"
CONTRACT = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
CONTRACT_VALIDATOR = Draft202012Validator(CONTRACT, format_checker=FormatChecker())


def assert_scan_contract(payload: dict[str, object]) -> None:
    errors = sorted(CONTRACT_VALIDATOR.iter_errors(payload), key=lambda error: list(error.path))
    assert not errors, "\n".join(error.message for error in errors)


def test_health_is_runnable_without_credentials(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "test-health-123"})

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "ecolens-api",
        "version": "1.0.0",
        "mock_mode": True,
        "repository": "memory",
    }
    assert response.headers["x-request-id"] == "test-health-123"
    assert int(response.headers["x-response-time-ms"]) >= 0


@pytest.mark.parametrize(
    ("scenario", "expected_name", "expected_category"),
    [
        ("banana", "Banana", "food"),
        ("mushroom", "Possible field mushroom", "mushroom"),
        ("doritos", "Nacho Cheese flavored tortilla chips", "packaged_food"),
    ],
)
def test_all_demo_scenarios_match_contract(
    client: TestClient,
    png_bytes: bytes,
    scenario: str,
    expected_name: str,
    expected_category: str,
) -> None:
    response = analyze(client, png_bytes, scenario)

    assert response.status_code == 200, response.text
    payload = response.json()
    assert_scan_contract(payload)
    assert payload["identification"]["name"] == expected_name
    assert payload["identification"]["category"] == expected_category
    assert payload["analysis_meta"]["mock"] is True
    assert payload["analysis_meta"]["latency_ms"] >= 0


def test_demo_scenario_can_be_query_parameter(client: TestClient, jpeg_bytes: bytes) -> None:
    response = client.post(
        "/analyze-image?demo_scenario=doritos",
        files={"image": ("package.jpg", jpeg_bytes, "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.json()["identification"]["brand"] == "Doritos"


def test_mushroom_policy_forces_warning_and_removes_recipes(
    client: TestClient,
    png_bytes: bytes,
) -> None:
    response = analyze(client, png_bytes, "mushroom")
    payload = response.json()

    assert response.status_code == 200
    assert payload["status"] == "needs_review"
    assert payload["safety"]["risk_level"] == "high"
    assert payload["safety"]["do_not_consume"] is True
    assert payload["identification"]["requires_expert_verification"] is True
    assert payload["recipes"] == []
    assert payload["chat_available"] is False
    assert any("Never eat a wild mushroom" in warning for warning in payload["safety"]["warnings"])


def test_history_and_scan_lookup(client: TestClient, png_bytes: bytes) -> None:
    first = analyze(client, png_bytes, "banana").json()
    second = analyze(client, png_bytes, "doritos").json()

    history = client.get("/scan-history")
    assert history.status_code == 200
    assert [row["scan_id"] for row in history.json()] == [second["scan_id"], first["scan_id"]]
    for row in history.json():
        assert_scan_contract(row)

    lookup = client.get(f"/scans/{first['scan_id']}")
    assert lookup.status_code == 200
    assert lookup.json() == first


def test_not_found_is_structured(client: TestClient) -> None:
    response = client.get("/scans/00000000-0000-4000-8000-000000000000")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "scan_not_found"
    assert response.json()["request_id"] == response.headers["x-request-id"]


def test_chat_is_grounded_and_refuses_medical_advice(client: TestClient, png_bytes: bytes) -> None:
    scan = analyze(client, png_bytes, "banana").json()

    normal = client.post("/chat", json={"scan_id": scan["scan_id"], "message": "What did you see?"})
    assert normal.status_code == 200
    assert "Banana" in normal.json()["answer"]
    assert normal.json()["safety_notice"] is None

    medical = client.post(
        "/chat",
        json={"scan_id": scan["scan_id"], "message": "What dosage should treat my symptoms?"},
    )
    assert medical.status_code == 200
    assert "cannot diagnose, treat, or provide medical advice" in medical.json()["answer"]
    assert medical.json()["safety_notice"] == medical.json()["answer"]


def test_recipe_generation_and_wild_species_suppression(
    client: TestClient, png_bytes: bytes
) -> None:
    banana = analyze(client, png_bytes, "banana").json()
    allowed = client.post(
        "/generate-recipe",
        json={"scan_id": banana["scan_id"], "preferences": ["dairy-free"]},
    )
    assert allowed.status_code == 200
    assert allowed.json()["suppressed"] is False
    assert allowed.json()["recipes"]

    mushroom = analyze(client, png_bytes, "mushroom").json()
    blocked = client.post(
        "/generate-recipe",
        json={"scan_id": mushroom["scan_id"], "preferences": []},
    )
    assert blocked.status_code == 200
    assert blocked.json()["suppressed"] is True
    assert blocked.json()["recipes"] == []
    assert "wild" in blocked.json()["reason"]
