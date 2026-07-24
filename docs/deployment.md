# EcoLens deployment handoff

This repository is deployment-ready but has not been connected to user-owned Gemini, Supabase, Render, or Expo projects. Keep all credentials in each provider's encrypted secret store; never commit them or place them in the mobile environment.

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

## 3. Deploy FastAPI with Render

The root `render.yaml` points to `apps/api/Dockerfile` and starts in safe mock mode.

1. Create a Render Blueprint from the repository root.
2. Review the generated `ecolens-api` web service before applying it.
3. Add Gemini and Supabase secrets only if those modes will be demonstrated.
4. Set `CORS_ORIGINS` to the explicit allowed origins required by any web client; do not leave a broad value for a public production service.
5. Deploy and verify:

```bash
curl -fsS https://<api-host>/health
```

Expected shape:

```json
{
  "status": "ok",
  "service": "ecolens-api",
  "version": "1.0.0",
  "mock_mode": true,
  "repository": "memory"
}
```

The values of `mock_mode` and `repository` should reflect the intended demo configuration.

## 4. Connect and build the Expo app

Create `apps/mobile/.env` locally or configure the public variable in the Expo build profile:

```dotenv
EXPO_PUBLIC_API_URL=https://<api-host>
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

Run against the exact judged deployment and device:

1. `GET /health` returns HTTP 200 with the expected mode and repository.
2. Upload a known safe image through the app and confirm the result completes or returns a bounded actionable error.
3. Run the disclosed Banana development fixture and confirm recipes and chat are available.
4. Run the disclosed Package fixture and confirm nutrition says `estimated data` in the mobile fixture.
5. Run the disclosed Mushroom fixture and confirm `needs_review`, high risk, do-not-consume, no recipes, and no chat control.
6. Reopen all three results from Journal and verify a favorite survives an app reload.
7. If live Gemini is enabled, state clearly which demo steps are live and which are deterministic fixtures.
8. If Supabase is enabled, restart the API and verify that scan history persists and image URLs remain private/signed.

## 6. Rollback and fallback

- Keep the mobile development fixtures available as the disclosed presentation fallback.
- If Gemini fails, set `ECOLENS_MOCK_MODE=true` and redeploy the API; do not describe fixture output as live analysis.
- If Supabase fails, remove the Supabase environment values and redeploy to use the in-memory repository; disclose that history is process-local.
- Keep the pitch deck and backup recording or screenshots locally available.

## 7. External checks not completed in this workspace

- Live Gemini quota, billing, latency, and output behavior
- Supabase migration execution and RLS behavior in a real project
- Render deployment and public HTTPS reachability
- EAS cloud build, signing, and installation on the presentation device
- Physical camera, permission, layout, contrast, dynamic-text, and network testing
- Event-specific eligibility, submission form, deadline, and judging-weight verification

These checks require the hackathon team's named projects, accounts, credentials, event details, and presentation device. Record evidence in `docs/submission-checklist.md` before presenting or submitting.
