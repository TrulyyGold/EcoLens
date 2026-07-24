#!/usr/bin/env python3
"""Static, credential-free integrity checks for the EcoLens submission package."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_PARTS = {
    ".git",
    ".venv",
    "node_modules",
    "dist-android",
    "dist-web",
    "__pycache__",
    ".pytest_cache",
    ".ruff_cache",
}
TEXT_SUFFIXES = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".py",
    ".sql",
    ".toml",
    ".ts",
    ".tsx",
    ".txt",
    ".yaml",
    ".yml",
}

errors: list[str] = []
checks = 0


def check(condition: bool, message: str) -> None:
    global checks
    checks += 1
    if not condition:
        errors.append(message)


def source_files() -> list[Path]:
    return [
        path
        for path in ROOT.rglob("*")
        if path.is_file()
        and path.suffix.lower() in TEXT_SUFFIXES
        and not any(part in EXCLUDED_PARTS for part in path.parts)
    ]


files = source_files()
# Exclude this verifier's own sentinel strings from repository-content checks.
scan_files = [path for path in files if path.resolve() != Path(__file__).resolve()]
combined = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in scan_files)

# Parse the primary machine-readable configuration and contract files.
for relative in (
    "contracts/scan-result.schema.json",
    "apps/mobile/app.json",
    "apps/mobile/package.json",
    "apps/mobile/package-lock.json",
    "apps/mobile/eas.json",
):
    path = ROOT / relative
    try:
        json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # pragma: no cover - diagnostic path
        errors.append(f"Invalid JSON in {relative}: {exc}")
    checks += 1

# Keep documentation and client integrations aligned with the shipped API.
docs_text = "\n".join(path.read_text(encoding="utf-8") for path in (ROOT / "docs").glob("*.md"))
for stale in ("/healthz", "ECOLENS_DEMO_MODE", "[install API dependencies]", "[install mobile dependencies]"):
    check(stale not in combined, f"Stale reference remains: {stale}")
check(not re.search(r"`/(?:v1|api/v1)/", docs_text), "Versioned API route remains in documentation")

api_client = (ROOT / "apps/mobile/src/services/api.ts").read_text(encoding="utf-8")
for route in ("/analyze-image", "/scan-history", "/chat", "/generate-recipe"):
    check(route in api_client, f"Mobile API client is missing route {route}")

# Resolve local Markdown links.
markdown_link = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
for path in [ROOT / "README.md", *(ROOT / "docs").glob("*.md"), ROOT / "apps/api/README.md", ROOT / "apps/mobile/README.md"]:
    text = path.read_text(encoding="utf-8")
    for target in markdown_link.findall(text):
        target = target.strip().split("#", 1)[0]
        if not target or target.startswith(("http://", "https://", "mailto:")):
            continue
        check((path.parent / target).resolve().exists(), f"Broken local link in {path.relative_to(ROOT)}: {target}")

# Verify the presentation's required fullscreen controls.
deck = (ROOT / "presentation/pitch-deck.html").read_text(encoding="utf-8")
slides = re.findall(r'<section\b[^>]*class="[^"]*\bslide\b[^"]*"', deck)
active_slides = [tag for tag in slides if re.search(r"\bactive\b", tag)]
check(len(slides) == 12, f"Pitch deck should contain 12 slides; found {len(slides)}")
check(len(active_slides) == 1, f"Pitch deck should start with one active slide; found {len(active_slides)}")
for stale_deck_claim in ("Auth + upload controls", "Supabase discovery journal", "same persistence and UI"):
    check(stale_deck_claim not in deck, f"Stale pitch-deck claim remains: {stale_deck_claim}")
for required in (
    'id="prev"',
    'id="next"',
    'id="dots"',
    'id="counter"',
    'postMessage({ type: "close-fullscreen" }, "*")',
    'data.type !== "navigate"',
    'Math.abs(deltaX) < 50',
):
    check(required in deck, f"Pitch deck control is missing: {required}")
for anchor in re.findall(r"<a\b[^>]*href=\"https?://[^>]+>", deck):
    check('target="_blank"' in anchor and 'rel="noopener noreferrer"' in anchor, f"Unsafe external deck link: {anchor[:120]}")

render_manifest = (ROOT / "render.yaml").read_text(encoding="utf-8")
for required in ("dockerfilePath: ./apps/api/Dockerfile", "dockerContext: ./apps/api", "healthCheckPath: /health"):
    check(required in render_manifest, f"Render manifest is missing: {required}")

# Search source files for common high-risk credential material.
secret_patterns = {
    "Google API key": re.compile(r"AIza[0-9A-Za-z_-]{30,}"),
    "OpenAI-style secret": re.compile(r"\bsk-[0-9A-Za-z_-]{20,}"),
    "AWS access key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "Private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
}
for label, pattern in secret_patterns.items():
    match = pattern.search(combined)
    check(match is None, f"Possible {label} found in source")

actual_envs = [
    path
    for path in ROOT.rglob(".env")
    if not any(part in EXCLUDED_PARTS for part in path.parts)
]
check(not actual_envs, f"Local .env file found: {actual_envs}")

if errors:
    print(f"EcoLens repository verification failed: {len(errors)} issue(s) across {checks} checks.")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print(f"EcoLens repository verification passed: {checks} static checks across {len(files)} source files.")
