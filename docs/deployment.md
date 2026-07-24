# EcoLens deployment handoff

EcoLens is deployed from the private `TrulyyGold/EcoLens` repository to Railway, connected to the isolated EcoLens Supabase project and Gemini 3.6 Flash, and linked to Expo EAS project `8831679b-f885-4057-9ddb-5bff2d894666` under `@trulyygolds-team`. Keep credentials in provider secret stores; never commit them or place them in the mobile environment.

## 1. Choose the demo mode

### Credential-free deterministic demo

Keep:

```dotenv
ECOLENS_MOCK_MODE=true
```

The backend remains fully functional with Banana, Doritos, and Mushroom scenarios and uses process-local scan history unless Supabase is configured.

### Live Gemini analysis

Set only on the backend host:

```dotenv
ECOLENS_MOCK_MODE=false
GEMINI_MODEL=gemini-3.6-flash
GEMINI_API_KEY=<encrypted host secret>
```

Before judging, verify that the configured account can access the exact model identifier. Do not put `GEMINI_API_KEY` in Expo, `app.json`, `eas.json`, or `EXPO_PUBLIC_*` variables.

## 2. Optional Supabase persistence

1. Create or choose an isolated demo Supabase project containing no production or personal data.
2. Apply every SQL file in `apps/api/migrations/` in numeric order through the SQL editor or the team's normal migration workflow.
3. Confirm that the `scan-images` bucket is private.
4. Add these backend-host secrets:

```dotenv
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<encrypted host secret>
SUPABASE_STORAGE_BUCKET=scan-images
```

The current API uses the service role and persists canonical scan rows and private images. The migration also creates favorites and chat-message tables as future schema groundwork, but the MVP does not expose remote favorites or chat-history routes. The mobile app contains no Supabase service-role credential.

For a public deployment, add authentication and per-user ownership checks before exposing `/scan-history` or `/scans/{scan_id}`. The shipped MVP routes are repository-wide and should run only against an isolated demo environment.

## 3. Railway FastAPI deployment

The Railway project `EcoLens` deploys the `ecolens-api` service from `TrulyyGold/EcoLens@main` using the repository-root Dockerfile.

- Project ID: `8dce0a6b-1bd6-4201-80f4-39182f3e252f`
- Environment: `production`
- Service ID: `eac2bbfa-1101-44da-9e4e-64768e7ce2bb`
- Public API: `https://ecolens-api-production.up.railway.app`
- Live deployment verified: `332ea4da-98b6-4f0f-9463-224e0eb8cd9d`

The production service stores `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` as masked Railway variables. Non-secret configuration sets live mode, Gemini 3.6 Flash, the EcoLens Supabase URL and bucket, a 45-second analysis timeout, and the upload limits.

Verify:

```bash
curl -fsS https://ecolens-api-production.up.railway.app/health
```

Expected shape:

```json
{
  "status": "ok",
  "service": "ecolens-api",
  "version": "1.0.0",
  "mock_mode": false,
  "repository": "supabase"
}
```

`render.yaml` remains as an unverified alternative deployment manifest; Railway is the active host.

## 4. Connect and build the Expo app

The mobile project is linked to Expo owner `trulyygolds-team`, slug `ecolens-mobile`, and EAS project ID `8831679b-f885-4057-9ddb-5bff2d894666`. `app.json` stores that public project linkage, while every EAS build profile sets:

```dotenv
EXPO_PUBLIC_API_URL=https://ecolens-api-production.up.railway.app
```

Only the API base URL belongs in an `EXPO_PUBLIC_*` variable. Build configuration is included in `apps/mobile/eas.json`.

For an interactive Expo development session:

```bash
cd apps/mobile
npm ci
npm start
```

For an internal Android preview after authenticating the team's Expo account:

```bash
cd apps/mobile
npx eas-cli@latest build --profile preview --platform android
```

A local static Android bundle sanity check is credential-free:

```bash
npm run export:android
```

## 5. Post-deployment smoke test

Verified against the live Railway API on July 24, 2026:

1. `GET /health` returned HTTP 200 with `mock_mode=false` and `repository=supabase`.
2. A live Banana image returned a contract-valid food result with recipes and chat enabled.
3. A live wild-mushroom image returned `needs_review`, high risk, do-not-consume, expert verification, no recipes, and chat disabled.
4. Safe-food chat and recipe generation succeeded; direct Mushroom chat and recipe requests remained blocked.
5. `/scan-history` returned both live scans; Supabase contained two canonical scan rows and two private image objects.
6. Railway logs showed HTTP 200 for health, analysis, chat, recipes, and history with no service crash.

Still verify on the presentation device:

1. Camera and gallery permissions, upload, loading, retry, and result layouts.
2. Banana, Package, and Mushroom development fixtures with visible demo labels.
3. Journal reopen and favorite persistence after an app restart.
4. Live API reachability on the venue network and disclosed fallback during a forced network failure.
5. Contrast, dynamic text, accessibility service output, and projector readability.

## 6. Rollback and fallback

- Keep the mobile development fixtures available as the disclosed presentation fallback.
- If Gemini fails, set `ECOLENS_MOCK_MODE=true` and redeploy the API; do not describe fixture output as live analysis.
- If Supabase fails, remove the Supabase environment values and redeploy to use the in-memory repository; disclose that history is process-local.
- Keep the pitch deck and backup recording or screenshots locally available.

## 7. Remaining external checks

- Trigger and inspect an EAS cloud preview build after confirming the account's build allowance or price.
- Install the preview on the presentation device and test physical camera, permissions, layout, contrast, dynamic text, and network behavior.
- Review Gemini and Railway quota or billing settings for the intended demo volume.
- Add authentication and ownership checks before any public multi-user or production launch.
- Verify event-specific eligibility, submission fields, deadline, and judging weights.

Record evidence in `docs/submission-checklist.md` before presenting or submitting.
