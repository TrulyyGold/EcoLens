# EcoLens API

Python 3.11 FastAPI backend for image analysis. Mock mode is enabled by default, so no API keys are required for local use.

## Run locally

```bash
python3.11 -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
uvicorn app.main:app --reload
```

OpenAPI is at `/docs`. Upload a real JPEG, PNG, or WebP as multipart field `image`; in mock mode choose the optional form value `demo_scenario=banana`, `mushroom`, or `doritos`.

```bash
curl -F image=@sample.jpg -F demo_scenario=banana http://localhost:8000/analyze-image
```

## Endpoints

- `GET /health` — process mode and repository status.
- `POST /analyze-image` — validated multipart image analysis; returns the canonical scan-result contract.
- `GET /scan-history?limit=50&offset=0` — newest scans first.
- `GET /scans/{scan_id}` — one canonical scan result.
- `POST /chat` — grounded follow-up using `{ "scan_id": "...", "message": "..." }`.
- `POST /generate-recipe` — safe recipes using `{ "scan_id": "...", "preferences": [] }`.

Every response has `X-Request-ID` and `X-Response-Time-Ms`. Analysis responses also include `analysis_meta.latency_ms`. Errors use `{ "error": { "code", "message", "details" }, "request_id" }`.

## Safety boundary

Provider output is untrusted. Server-side rules always require expert verification and suppress recipes for image-identified plants and mushrooms, suppress risky/unknown/low-confidence items, and refuse medical requests. Do not use EcoLens to decide whether a wild species is edible or for medical advice.

## External services

Set `ECOLENS_MOCK_MODE=false` plus `GEMINI_API_KEY` to use the schema-constrained Gemini adapter. Set `SUPABASE_URL` and preferably `SUPABASE_SERVICE_ROLE_KEY` to use Postgres and private Storage; otherwise data remains process-local in memory. Apply `migrations/001_initial.sql` first. Never expose a service-role key to a client.

## Test

```bash
pytest
```

Deploy with the included `Dockerfile` or the repository-root Render Blueprint (`../../render.yaml`).
