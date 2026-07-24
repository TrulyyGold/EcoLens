# EcoLens verification report

**Verification date:** July 24, 2026  
**Scope:** Credential-free repository validation in mock mode  
**Repository:** `/agent/workspace/ecolens`

## Result

The checked-in mock-mode vertical slice is internally consistent and passed the automated checks available in this workspace. This report does not claim live-model accuracy, production safety, hosted availability, or physical-device readiness.

## Automated evidence

| Area | Command or method | Result |
|---|---|---|
| FastAPI behavior | `pytest apps/api/tests -q` with the API package on `PYTHONPATH` | 19 passed |
| Python lint | `ruff check apps/api/app apps/api/tests` | All checks passed |
| Python import/runtime surface | Imported `GeminiAdapter`, instantiated its client with a non-working placeholder, and imported `supabase` without making an external request | Passed |
| Live local API smoke | Started Uvicorn in mock mode; called `GET /health`; uploaded the committed PNG to `POST /analyze-image` with the Mushroom scenario | Health OK; memory repository; Mushroom returned `needs_review`, do-not-consume, no recipes, and no chat |
| Mobile service and safety tests | `npm test` in `apps/mobile` | 12 passed |
| TypeScript | `npm run typecheck` in `apps/mobile` | No errors |
| Expo bundle | `npm run export:android` in `apps/mobile` | Android bundle exported successfully; 838 modules bundled |
| Static repository audit | `python3 scripts/verify_repo.py` | 49 checks passed across 86 source files |
| JSON contract | Backend tests validate all three successful mock responses against `contracts/scan-result.schema.json` | Passed |
| Safety regression | Backend and mobile tests cover Mushroom blocking, low-confidence blocking, plant blocking, unknown blocking, medical boundaries, and recipe suppression | Passed within implemented cases |
| Documentation alignment | Narrow searches and static verifier check shipped routes, links, environment names, and stale claims | Passed |
| Secret scan | Static verifier scans source while excluding dependencies, caches, generated builds, and virtual environments | No common high-risk credential pattern found; no `.env` file found |
| Pitch deck structure | Static verifier checks slide count, one initial active slide, arrows, buttons, dots, counter, Escape postMessage, parent navigation, 50 px swipe, and external-link safety | Passed |

## Shipped routes verified

- `GET /health`
- `POST /analyze-image`
- `GET /scan-history`
- `GET /scans/{scan_id}`
- `POST /chat`
- `POST /generate-recipe`

## Shipped demo behavior verified

- Banana: complete safe-food fixture with nutrition, recipes, and chat.
- Package: caution remains visible; mobile fixture marks nutrition as estimated and keeps provenance in chat.
- Mushroom: `needs_review`, high risk, expert verification, do-not-consume, empty recipes, and `chat_available=false`.
- Journal: results are saved locally and reopen without rerunning analysis.
- Favorites: scan IDs are stored locally.
- Fallback: failed or unavailable live analysis returns disclosed fixture data rather than an indefinite loading state.

## Packaging checks

The source archive excludes:

- `.env` and secret-bearing local configuration;
- `node_modules`;
- Python virtual environments;
- Expo `.expo` directories;
- generated Android/web bundles;
- Python and test caches;
- logs and temporary files.

The package includes the source contract, backend, mobile app, migration, environment examples, Docker and Render configuration, Expo EAS configuration, documentation, static verifier, and pitch deck.

## External checks not completed

These require user-owned resources or a physical device and remain explicit handoff items:

- live Gemini request quality, quota, billing, latency, refusal, and model-availability testing;
- applying the Supabase migration and testing real RLS/storage behavior;
- Docker image construction, because Docker is unavailable in this workspace;
- Render or another public HTTPS deployment;
- Expo EAS cloud build, signing, installation, and camera-permission testing;
- layout, contrast, dynamic-text, accessibility-service, offline, and network testing on the presentation device;
- real food/package/plant/mushroom evaluation with qualified domain experts;
- event rules, eligibility, final judging weights, submission fields, and deadline.

## Re-run before submission

```bash
(cd apps/api && pytest && ruff check app tests)
(cd apps/mobile && npm test && npm run typecheck && npm run export:android)
python3 scripts/verify_repo.py
```

Then complete the device, live-provider, Supabase, deployment, and event-specific checks in `docs/submission-checklist.md`.
