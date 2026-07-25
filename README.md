# EcoLens

> **Point. Learn. Decide with context.** EcoLens turns a camera scan of food, packaged snacks, plants, or mushrooms into an explainable identification, provenance-aware nutrition, safety-first next steps, contextual chat, and a personal discovery journal.

**Hackathon scope:** a two-day greenfield prototype built with Expo React Native, FastAPI, Supabase, and Gemini 3.6 Flash behind a replaceable provider adapter.

> [!IMPORTANT]
> EcoLens is an educational prototype, not a medical, nutrition, allergy, foraging, or food-safety authority. A photo cannot establish edibility. When identity or safety is uncertain - especially for mushrooms and wild plants - the product withholds recipes, advises against consumption, and directs the user to qualified local help.

## The product in one minute

Most visual search tools stop at a label. EcoLens is designed around the decision that follows:

1. **See the uncertainty** - a name, confidence label, visual evidence, alternatives, and an explicit expert-verification flag.
2. **Understand the context** - nutrition is marked as label-derived, estimated, general, or unavailable; safety is shown before inspiration.
3. **Act only when appropriate** - recipes appear only after deterministic safety gates pass.
4. **Keep exploring** - ask questions grounded in the scan and save discoveries to a journal.

### Core demo capability

| Capability           | Demo behavior                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| Camera scan          | Capture or choose one image of food, packaged food, a plant, or a mushroom.                             |
| Explainable ID       | Return likely identity, scientific name/brand where applicable, confidence, evidence, and alternatives. |
| Safety layer         | Show risk level, warnings, do-not-consume state, and escalation guidance before recipes.                |
| Nutrition provenance | Distinguish values read from a label from estimates or general reference information.                   |
| Safe inspiration     | Return up to three recipes only when the server-side safety policy permits them.                        |
| Contextual chat      | Answer follow-up questions using the saved scan result and repeat relevant safety boundaries.            |
| Discovery journal    | Save scan results and timestamps locally, reopen them later, and mark favorites.                        |
| Honest demo mode     | Swap the live model for schema-valid fixtures, visibly labeled as demo data.                             |

## Quick start

### Prerequisites

- Node.js 20 or later and npm
- Python 3.11 or later
- An Expo-capable simulator or physical device (with [Expo Go](https://expo.dev/go) installed, for on-device testing)
- Optional: a Gemini API key for live analysis
- Optional: a Supabase project for durable history and private image storage

The two apps only need to be set up **once**; after that, use the one-command launcher below (or the manual two-terminal steps) to start them on any given day.

### One-time setup

```bash
# Backend
cd apps/api
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -e '.[dev]'
cp .env.example .env
cd ../..

# Mobile app
cd apps/mobile
npm ci
cp .env.example .env
cd ../..
```

The checked-in default is deterministic **mock mode**, so no credentials are required to run the demo. For live analysis, set in `apps/api/.env`:

```
ECOLENS_MOCK_MODE=false
GEMINI_API_KEY=your_key_from_a_secure_secret_store
GEMINI_MODEL=gemini-3.6-flash
```

Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only after applying every SQL file in `apps/api/migrations/` in numeric order.

### Every-day start: one command

Once setup above is done, start both the API and the Expo dev server together:

```bash
python scripts/start_ecolens.py
```

This will:

- Detect your machine's LAN IP and write it into `apps/mobile/.env` as `EXPO_PUBLIC_API_URL`, so a physical phone on the same Wi-Fi network can always reach the API - even after your Wi-Fi reconnects and the IP changes.
- Start `uvicorn` (with auto-reload) and `npm start` together, streaming both processes' output into your current terminal, prefixed `[api]` / `[mobile]`.
- Shut both processes down cleanly on `Ctrl+C`.

Useful flags:

| Flag                    | What it does                                                                 |
| ----------------------- | ----------------------------------------------------------------------------- |
| `--api-only`            | Start only the FastAPI server                                                 |
| `--mobile-only`         | Start only the Expo dev server                                                |
| `--port 8000`           | Change the API port (default `8000`)                                         |
| `--ip 192.168.1.20`     | Manually set the LAN IP written to `.env` (see Troubleshooting below)        |
| `--separate-windows`    | Open the API and Expo processes in their own terminal windows instead        |
| `--skip-env-sync`       | Don't touch `apps/mobile/.env`                                                |

Run `python scripts/start_ecolens.py --help` for the full list.

### Manual start (equivalent, two terminals)

If you'd rather run things by hand or need finer control:

```bash
# Terminal 1 - API
cd apps/api
source .venv/bin/activate      # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
# Terminal 2 - Mobile
cd apps/mobile
# Edit apps/mobile/.env so EXPO_PUBLIC_API_URL points at an address your
# phone can reach - your computer's LAN IP, not localhost:
#   EXPO_PUBLIC_API_URL=http://192.168.1.20:8000
npm start
```

The development home screen includes clearly labeled Banana, Package, and Mushroom fixtures. They exercise the same parser and safety presentation as live responses, so you can validate the app before wiring up real credentials.

### Validate the repository

```bash
(cd apps/api && pytest && ruff check app tests)
(cd apps/mobile && npm test && npm run typecheck && npm run export:android)
python3 scripts/verify_repo.py
```

### Smoke test the full flow

1. Open the scanner and select the known snack fixture.
2. Confirm the result displays a provenance label for nutrition.
3. Open the mushroom fixture and confirm **Do not consume** appears and recipes are absent.
4. Ask a follow-up question on a safe food result, favorite it, and reopen it from the journal.

The canonical result contract is [`contracts/scan-result.schema.json`](contracts/scan-result.schema.json). Pydantic models constrain provider and API output at runtime, the mobile client applies a strict parser, and backend contract tests validate successful mock responses against the checked-in schema.

### Troubleshooting

- **Phone can't reach the API / requests hang or fail.**
  - Confirm the phone and computer are on the **same Wi-Fi network** (not a guest network, and not cellular data).
  - Check `apps/mobile/.env` - `EXPO_PUBLIC_API_URL` should be `http://<your-computer's-LAN-IP>:8000`, never `localhost` or `127.0.0.1`.
  - On Windows, allow the port through the firewall (run as Administrator):
    ```
    netsh advfirewall firewall add rule name="EcoLens API" dir=in action=allow protocol=TCP localport=8000
    ```
  - On macOS, the first run may prompt an incoming-connections permission dialog for Python/uvicorn - allow it.
- **The auto-detected LAN IP looks wrong** (e.g. you're on a VPN, or have multiple network adapters). Pass the right address explicitly: `python scripts/start_ecolens.py --ip 192.168.1.20`.
- **`Could not find apps/api/.venv` or `node_modules`.** Run the one-time setup commands above for whichever app is missing.
- **`npm` not found.** Install Node.js 20+ from [nodejs.org](https://nodejs.org) and reopen your terminal.
- **No terminal windows appear with `--separate-windows` on Linux.** The script falls back to logging that process's output to a `.log` file in the repo root when it can't find a supported terminal emulator (`gnome-terminal`, `konsole`, `xterm`, etc.) - check there.

## Feature scope

### In the two-day build

- One-image capture/library input
- Four categories: `food`, `packaged_food`, `plant`, `mushroom` (plus `unknown`)
- Contract-validated structured analysis
- Visible confidence, evidence, alternatives, and safety status
- Provenance labels for nutrition values
- Deterministic recipe suppression
- Scan-grounded, safety-aware follow-up chat
- Device-local journal and favorites, plus optional repository-wide API history merge
- Optional Supabase scan persistence and private image storage for an isolated demo backend
- Provider-backed mode and transparent fixture-backed demo mode
- Request IDs, response timing, and prompt/model metadata

### Deliberately out of scope

- A guarantee of identity, edibility, freshness, contamination, ripeness, allergens, or nutrition accuracy
- Disease diagnosis, treatment, or personalized dietary advice
- Autonomous emergency response
- Multi-image botanical keys, laboratory testing, barcode database completeness, or expert review workflows
- Social feeds, commerce, meal planning, or production-scale moderation
- Training or fine-tuning a custom model during the hackathon

## Architecture at a glance

```
Expo app
   |  image + context / chat
   v
FastAPI -- auth, validation, policy, schema enforcement
   |-- Provider adapter -- Gemini 3.6 Flash
   |-- Fixture provider -- transparent demo mode
   `-- Optional Supabase -- scans and private image storage
```

The model proposes structured content; the API remains the authority for contract validation and product policy. In particular, recipe eligibility is recomputed server-side rather than trusted from model prose.

See:

- [Product specification](docs/product-spec.md)
- [Architecture](docs/architecture.md)
- [Safety and responsible AI](docs/safety-and-responsible-ai.md)
- [Demo runbook](docs/demo-runbook.md)
- [Deployment handoff](docs/deployment.md)
- [Verification report](docs/verification-report.md)
- [Submission checklist](docs/submission-checklist.md)
- [Pitch deck](presentation/pitch-deck.html)

## Contract highlights

A scan result includes:

- `status`: `complete` or `needs_review`
- `identification`: category, confidence, evidence, alternatives, and expert-verification requirement
- `safety`: risk level, warnings, `do_not_consume`, and optional emergency guidance
- optional `nutrition`: with an explicit `basis` of `label`, `estimated`, `general`, or `unavailable`
- `recipes`: zero to three items, with safety policy allowed to force an empty list
- `facts`, `chat_available`, timestamp, and `analysis_meta`

`analysis_meta` records model, prompt version, mock/live mode, and latency so the demo remains inspectable. It must not contain secrets or user-identifying content.

## Demo mode

`ECOLENS_MOCK_MODE=true` selects a fixture provider implementing the same adapter and contract as the live Gemini provider.

- The UI must show a persistent **Demo data** badge.
- Fixture responses still pass JSON Schema and safety-policy validation.
- The runbook uses fixed images and expected outcomes, not fabricated performance claims.
- Switching providers must not require a mobile code change.
- A fallback is disclosed verbally; it is never presented as a live model response.

## Safety posture

EcoLens follows five non-negotiable rules:

1. **Uncertainty is a product state, not fine print.** Low/moderate confidence and plausible alternatives are shown near the identity.
2. **Safety outranks engagement.** `high` or `unknown` risk, `do_not_consume`, `needs_review`, or expert-verification requirements suppress recipes.
3. **Mushrooms receive the strictest treatment.** In the hackathon policy, mushroom scans never produce consumption instructions or recipes from vision alone.
4. **Provenance travels with nutrition.** A label reading is not presented as an estimate, and a visual estimate is never styled as measured fact.
5. **Chat cannot relax the gate.** Follow-up answers inherit the scan risk state and cannot turn uncertainty into permission to eat.

Full threat model, policy matrix, evaluation cases, and limitations are in [Safety and responsible AI](docs/safety-and-responsible-ai.md).

## Repository map

```
ecolens/
|-- README.md
|-- Dockerfile                # Railway-compatible backend container
|-- .dockerignore
|-- apps/
|   |-- api/                  # FastAPI service, model adapters, policies, tests
|   `-- mobile/               # Expo React Native app, offline fixtures, tests
|-- contracts/
|   `-- scan-result.schema.json
|-- docs/
|   |-- architecture.md
|   |-- demo-runbook.md
|   |-- deployment.md
|   |-- product-spec.md
|   |-- safety-and-responsible-ai.md
|   |-- submission-checklist.md
|   `-- verification-report.md
|-- presentation/
|   `-- pitch-deck.html
|-- scripts/
|   |-- start_ecolens.py      # One-command dev launcher (API + Expo)
|   `-- verify_repo.py
`-- render.yaml               # Unverified alternative host manifest
```

## Two-day build cut line

**Day 1:** scaffold app/API, image submission, provider adapter, structured prompt, contract validation, result UI, demo fixtures.

**Day 2:** deterministic safety gate, contextual chat, local journal and favorites, optional Supabase scan storage, polish, device rehearsal, fallback capture, and submission packaging.

If schedule slips, preserve the vertical slice and safety behavior before adding breadth. The minimum credible demo is: one live/fixture scan, one uncertainty case, one follow-up, and one saved journal entry.

## Verified build and deployment status

- FastAPI: 19 tests passing and Ruff clean
- Expo app: 12 tests passing, TypeScript clean, and local Android bundle export successful
- Canonical contract: backend fixtures and two live Gemini scan responses validate against the Draft 2020-12 schema
- Railway API: deployed and healthy at <https://ecolens-api-production.up.railway.app>
- Supabase: two migrations applied, forced RLS enabled, private image bucket verified, and no security-advisor findings
- Live Gemini: Banana completed with eligible recipes/chat; Mushroom completed with high-risk do-not-consume state, empty recipes, and chat blocked
- Persistence: live scan history, two private image objects, chat, and recipe endpoints verified against the deployed service
- Expo: linked to `@trulyygolds-team/ecolens-mobile`, project ID `8831679b-f885-4057-9ddb-5bff2d894666`; EAS cloud preview build and physical-device checks remain
- Pitch deck: 12 slides with keyboard, button, dot, parent-message, Escape, and touch-swipe navigation

## Source note

Implementation assumptions should be checked against the live official documentation at build/deploy time:

- Gemini model catalog: <https://ai.google.dev/gemini-api/docs/models>
- Gemini image understanding: <https://ai.google.dev/gemini-api/docs/image-understanding>
- Gemini Developer API pricing: <https://ai.google.dev/gemini-api/docs/pricing>

Model availability, identifiers, quotas, and pricing can change. This repository intentionally makes no cost, accuracy, or latency claim.
