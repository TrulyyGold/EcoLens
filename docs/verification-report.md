# EcoLens verification report

**Verification date:** July 24, 2026  
**Scope:** Repository, live Railway API, Gemini, Supabase, and Expo project-link validation  
**Repository:** `TrulyyGold/EcoLens` and `/agent/workspace/ecolens`  
**Live API:** `https://ecolens-api-production.up.railway.app`

## Result

The source, live backend, Gemini adapter, deterministic safety policy, Supabase persistence, and Expo project linkage passed the checks available in this workspace. This report does not claim real-world identification accuracy, medical or foraging safety, production multi-user readiness, EAS cloud-build success, or physical-device readiness.

## Automated evidence

| Area | Command or method | Result |
|---|---|---|
| FastAPI behavior | `pytest apps/api/tests -q` with the API package on `PYTHONPATH` | 19 passed |
| Python lint | `ruff check apps/api/app apps/api/tests` | All checks passed |
| Python import/runtime surface | Imported `GeminiAdapter`, instantiated its client with a non-working placeholder, and imported `supabase` without making an external request | Passed |
| Local API smoke | Started Uvicorn in mock mode; called `GET /health`; uploaded the committed PNG to `POST /analyze-image` with the Mushroom scenario | Health OK; memory repository; Mushroom returned `needs_review`, do-not-consume, no recipes, and no chat |
| Railway deployment | Docker build from private `TrulyyGold/EcoLens`, production health check, deployment and HTTP logs | Online; deployment `332ea4da-98b6-4f0f-9463-224e0eb8cd9d` succeeded; one running replica |
| Live Gemini scans | Uploaded Wikimedia Banana and wild-mushroom test images to the deployed API | Both HTTP 200 and contract-valid; Banana complete in 9718 ms; Mushroom safety-blocked in 9416 ms after tuning |
| Live API features | Called safe and blocked chat/recipe routes plus scan history | Safe chat and recipes succeeded; Mushroom chat/recipes blocked; history contained both scans |
| Supabase project | Applied two migrations; inspected tables, forced RLS, private bucket, advisors, scan rows, and storage objects | Active healthy; no security lints; two live rows and two private image objects |
| Expo linkage | Created `@trulyygolds-team/ecolens-mobile` and linked project ID `8831679b-f885-4057-9ddb-5bff2d894666` in source | Project created and source configuration prepared; cloud preview build pending |
| Mobile service and safety tests | `npm test` in `apps/mobile` | 12 passed |
| TypeScript | `npm run typecheck` in `apps/mobile` | No errors |
| Expo bundle | `npm run export:android` in `apps/mobile` | Android bundle exported successfully; 838 modules bundled |
| Static repository audit | `python3 scripts/verify_repo.py` | 55 checks passed across 82 source files |
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

- Live Banana: complete safe-food result with general nutrition, eligible recipes, and chat.
- Package fixture: caution remains visible; mobile fixture marks nutrition as estimated and keeps provenance in chat.
- Live Mushroom and Mushroom fixture: `needs_review`, high risk, expert verification, do-not-consume, empty recipes, and `chat_available=false`.
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

The package includes the source contract, backend, mobile app, two Supabase migrations, environment examples, Railway-compatible root Docker configuration, an alternative Render manifest, Expo EAS linkage/configuration, documentation, static verifier, and pitch deck.

## External checks not completed

These still require an EAS build allowance decision, a physical device, event details, or domain experts:

- Expo EAS cloud preview build, Android signing, installation, and camera-permission testing;
- layout, contrast, dynamic text, accessibility-service, offline, and venue-network testing on the presentation device;
- Gemini, Railway, Supabase, and Expo quota or billing review for the intended demo volume;
- real food/package/plant/mushroom evaluation with qualified domain experts;
- authentication, ownership enforcement, rate limiting, monitoring, and privacy/legal review for any public multi-user launch;
- event rules, eligibility, final judging weights, submission fields, and deadline.

## Re-run before submission

```bash
(cd apps/api && pytest && ruff check app tests)
(cd apps/mobile && npm test && npm run typecheck && npm run export:android)
python3 scripts/verify_repo.py
```

Then complete the EAS cloud-build, physical-device, quota/billing, domain-expert, and event-specific checks in `docs/submission-checklist.md`.
