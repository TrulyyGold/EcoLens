# EcoLens submission checklist

**Use:** Complete this against the exact commit, mobile build, and API process/deployment submitted.  
**Integrity rule:** A checked box means verified on that artifact—not planned, assumed, or inferred from a fixture.

## 0. Submission control

- [ ] Official event name, track, deadline, timezone, submission URL, and required fields are recorded.
- [ ] Official judging criteria and weights are copied into the judging map.
- [ ] Eligibility, team-size, IP, open-source, data-use, and third-party-service rules are reviewed.
- [ ] One person owns submission and one person performs final claims/safety review.
- [ ] Final commit SHA/tag is recorded: `[ADD SHA]`.
- [ ] Tested mobile build identifier is recorded: `[ADD]`.
- [ ] Tested API URL/process configuration is recorded: `[ADD]`.
- [ ] API mode is recorded: mock or live Gemini; memory or Supabase repository.
- [ ] Every externally visible claim has evidence or is explicitly labeled as a goal/limitation.

## 1. Repository and access

- [ ] Repository visibility matches event rules.
- [ ] Default branch contains the submitted commit.
- [ ] No API key, Supabase service-role key, token, private URL, personal data, or `.env` file is committed.
- [ ] Secret scanning has been run on the final commit and findings resolved.
- [ ] `.gitignore` covers environment files, caches, generated binaries, and recordings as intended.
- [ ] Third-party code/assets/fonts/images are permitted and attributed where required.
- [ ] Demo fixtures contain no personal, proprietary, or unsafe source material.
- [ ] Generated dependency/build directories do not obscure the reviewable source in the submitted repository.

## 2. Documentation and claims

Verify the repository documentation against the current code:

- [ ] Shipped routes are listed exactly as `GET /health`, `POST /analyze-image`, `GET /scan-history`, `GET /scans/{scan_id}`, `POST /chat`, and `POST /generate-recipe`.
- [ ] Chat request is documented as `{ scan_id, message }`.
- [ ] Recipe request is documented as `{ scan_id, preferences }`.
- [ ] The mobile journal and favorites are described as AsyncStorage-backed.
- [ ] Configured API scan history is described as merging into the local journal.
- [ ] Default API persistence is described as process memory.
- [ ] Supabase scans/private storage are described as optional.
- [ ] The migration’s `scans`, `favorites`, and `chat_messages` tables are distinguished from routes actually exposed by the MVP.
- [ ] Documentation does not present identity, per-user ownership, journal annotations/removal, remote favorites, or remote chat history as shipped.
- [ ] Runtime Pydantic validation, mobile parsing, and JSON Schema contract tests are described distinctly.
- [ ] No unsupported accuracy, latency, scale, user, impact, cost, or safety-validation claim appears.
- [ ] Future production hardening is visibly labeled as not shipped.

## 3. Mobile app — implemented MVP

Run from `apps/mobile` and verify:

- [ ] `npm ci` succeeds from a clean checkout.
- [ ] `npm test` succeeds and output is attached: `[ADD EVIDENCE]`.
- [ ] `npm run typecheck` succeeds and output is attached: `[ADD EVIDENCE]`.
- [ ] The exact presentation target starts with the documented Expo command.
- [ ] Camera permission copy and denied-permission recovery work.
- [ ] Photo-library selection works.
- [ ] Source image errors for unsupported type, oversized file, and too-small dimensions are user-readable when detectable from asset metadata.
- [ ] Selected images are re-encoded to JPEG and resized to a maximum 1600 px long edge.
- [ ] Loading, cancel, retry, and choose-another-image paths are bounded and readable.
- [ ] API/fallback results pass the strict runtime parser before rendering.
- [ ] A live analysis failure shows a disclosed demo result rather than silently impersonating live output.
- [ ] **Retry live analysis** appears when fallback retained a selected image.
- [ ] Result order places safety before nutrition and recipes.
- [ ] Confidence, review, risk, and expert-verification states are visible in text, not color alone.
- [ ] Nutrition basis is visible with the values.
- [ ] Null nutrition values render as unavailable, not zero.
- [ ] Blocked results show no recipe cards or recipe-generation control.
- [ ] A result with `chat_available=false` shows the **Follow-up chat unavailable** notice and no chat action; no blocked scan is navigated to Chat through the shipped UI.
- [ ] Safe result chat calls only `/chat` with `scan_id` and `message` when the result is live.
- [ ] Recipe generation calls only `/generate-recipe` with `scan_id` and normalized `preferences` when the result is live and eligible.
- [ ] Every analysis result that reaches Result is added automatically to Journal.
- [ ] Journal entries reopen without a second model request.
- [ ] Favorite heart updates Favorites and survives an app reload on the presentation device.
- [ ] AsyncStorage errors and remote-history refresh errors are visibly distinguished.
- [ ] No provider or Supabase privileged secret is present in the mobile bundle.

### Mobile fixture checks

- [ ] Development Home exposes **Package**, **Banana**, and **Mushroom safety** only in the development build intended for the demo.
- [ ] All fixture result screens display **Development demo** and “Fixture data · not a live identification.”
- [ ] Package uses `nutrition.basis=estimated` in the mobile fixture.
- [ ] Banana has `chat_available=true` and qualified recipe cards.
- [ ] Mushroom has `needs_review`, high risk, `do_not_consume=true`, `recipes=[]`, and `chat_available=false`.
- [ ] Mushroom replay from Journal remains recipe- and chat-blocked.

## 4. FastAPI service — implemented MVP

Run from `apps/api` and verify:

- [ ] A clean Python 3.11 environment can install the project and start Uvicorn.
- [ ] `pytest` succeeds and output is attached: `[ADD EVIDENCE]`.
- [ ] `GET /health` returns status, API version, mock mode, and repository kind without keys or secret values.
- [ ] `POST /analyze-image` accepts multipart field `image`; the optional legacy alias `file` behaves as documented.
- [ ] Optional `demo_scenario` only accepts `banana`, `mushroom`, or `doritos`.
- [ ] `GET /scan-history` returns newest first and enforces limit/offset validation.
- [ ] `GET /scans/{scan_id}` returns a saved scan or structured `scan_not_found` error.
- [ ] `POST /chat` validates a UUID, nonblank message, and 1000-character maximum.
- [ ] `POST /generate-recipe` validates a UUID and at most ten preferences.
- [ ] Upload MIME, byte, decode, declared/detected type, and pixel limits are enforced.
- [ ] Provider calls are bounded by the configured timeout.
- [ ] Provider output is parsed through strict Pydantic models.
- [ ] Server authors `scan_id`, `created_at`, model, prompt version, mock flag, and latency.
- [ ] Every response includes `X-Request-ID` and `X-Response-Time-Ms`.
- [ ] Errors follow `{ error: { code, message, details }, request_id }` and omit prompts, stack traces, keys, and raw provider output.
- [ ] CORS is configured appropriately for the actual demo rather than assumed production-ready.

### API safety checks

- [ ] Confidence labels follow the implemented thresholds: high ≥0.85, moderate ≥0.65, low <0.65.
- [ ] Every plant scan is expert-review/do-not-consume and has no recipes.
- [ ] Every mushroom scan is high-risk, expert-review, do-not-consume, `needs_review`, and has no recipes.
- [ ] Low-confidence scans become unknown-risk, expert-review, do-not-consume, and have no recipes.
- [ ] Unknown category scans are do-not-consume, expert-review, `needs_review`, and have no recipes.
- [ ] High/unknown-risk or existing do-not-consume scans cannot retain recipes.
- [ ] `chat_available` is false whenever do-not-consume is true, confidence is below 0.65, or expert verification is required.
- [ ] Direct `/chat` use on a non-chat-eligible scan returns the fixed safety notice without provider permission to consume.
- [ ] Medical-keyword chat requests return the non-medical escalation boundary.
- [ ] Recipe generation reloads the canonical scan before deciding eligibility.
- [ ] Do not claim that caution alone blocks recipes: current Package behavior intentionally keeps caution prominent while allowing an otherwise eligible recipe.

## 5. Provider adapters

- [ ] `MockAnalysisAdapter` and `GeminiAdapter` conform to the same analysis/chat/recipe protocol.
- [ ] Default mock mode starts without external credentials.
- [ ] Live mode refuses to start without `GEMINI_API_KEY`.
- [ ] Exact configured Gemini model identifier is checked against current official documentation before the demo.
- [ ] Gemini requests use JSON response mode with a Pydantic-derived schema.
- [ ] Returned Gemini JSON is validated into `AnalysisDraft`, `ChatProviderResponse`, or `RecipeProviderResponse` as applicable.
- [ ] Provider credentials are absent from client, repository, and projected logs.
- [ ] Prompt/model changes trigger regression tests.
- [ ] Fixture behavior is described as deterministic, not as model accuracy evidence.

Official references:

- Models: <https://ai.google.dev/gemini-api/docs/models>
- Image understanding: <https://ai.google.dev/gemini-api/docs/image-understanding>
- Pricing: <https://ai.google.dev/gemini-api/docs/pricing>

## 6. Local and optional persistence

### Always-shipped local behavior

- [ ] Journal uses `@ecolens/journal/v1` in AsyncStorage and is capped at 50 scan results.
- [ ] Favorites use `@ecolens/favorites/v1` in AsyncStorage.
- [ ] With an API URL configured, startup and manual refresh call `GET /scan-history`.
- [ ] Remote history is described as repository-wide, not per-user, because the MVP API has no identity or ownership filter; use an isolated demo API.
- [ ] Remote and local results merge by `scan_id`, sort newest first, and persist back to the local journal.
- [ ] Remote refresh failure leaves local results usable.
- [ ] The UI contains no annotation editor or journal-item removal action.
- [ ] Favorite changes make no remote API call.
- [ ] Chat turns make no persistence API call.

### API memory repository

- [ ] Without Supabase configuration, `/health` reports `repository: memory`.
- [ ] Memory history is documented as process-local and reset on restart.
- [ ] Memory mode does not retain image bytes and returns `image_url=null`.

### Optional Supabase mode — check only if shown

- [ ] `apps/api/migrations/001_initial.sql` has been applied to the isolated demo project.
- [ ] Migration creates `scans`, `favorites`, `chat_messages`, and private `scan-images` storage as documented.
- [ ] `/health` reports `repository: supabase`.
- [ ] API saves/reads/lists `scans` and stores images through the configured private bucket.
- [ ] Returned image URL is recognized as a one-hour signed URL that may expire.
- [ ] `favorites` and `chat_messages` tables are not presented as active API features.
- [ ] Migration RLS groundwork is not presented as end-to-end caller authorization; the current API has no identity flow.
- [ ] Service-role credentials remain API-host-only; if a restricted key is used instead, its no-session RLS behavior is tested rather than assumed to work.

## 7. Contract and tests

- [ ] `contracts/scan-result.schema.json` remains the referenced canonical scan contract.
- [ ] Backend test fixtures for Banana, Doritos, and Mushroom validate against that schema.
- [ ] FastAPI/Pydantic output and the TypeScript parser remain compatible with the schema.
- [ ] Mobile parser accepts all three fixtures and rejects an unexpected top-level property.
- [ ] Exact mobile route tests cover analysis, chat, history, and recipe requests.
- [ ] Backend tests cover health, history order, lookup/404, image validation, timeout, medical refusal, recipe generation, and Mushroom suppression.
- [ ] Mobile safety tests confirm the Mushroom fixture has `recipes=[]`, `chat_available=false`, and client recipe suppression; manually verify the Result screen exposes neither recipe generation nor a chat action.
- [ ] Any untested behavior is disclosed instead of being marked as verified.
- [ ] Test fixtures are not described as clinical, toxicological, security, or real-world accuracy validation.

## 8. Safety and responsible AI review

- [ ] Product never guarantees identity, edibility, freshness, allergen status, contamination status, nutrition measurement, or personal safety.
- [ ] Wild plant and Mushroom language remains conservative.
- [ ] Mushroom result never produces a recipe or chat control.
- [ ] Package label remains the authority for ingredients, allergens, serving size, and dates.
- [ ] Mobile Package fixture explicitly uses estimated provenance.
- [ ] Backend Doritos fixture’s label provenance is described as fixture data, not independent OCR/legibility proof.
- [ ] API messages matching the implemented medical-keyword set receive the fixed emergency/poison-control boundary; broader exposure phrasing and local fixture chat are not claimed covered.
- [ ] The experience does not diagnose, advise vomiting/home remedies, or recommend waiting.
- [ ] Demo and fallback results are unmistakably non-live.
- [ ] No performance metric is shown without method, sample, date/build, and reproducible evidence.
- [ ] Safety restrictions remain visible when a scan is reopened from Journal or Favorites.

## 9. Observability and operational checks

- [ ] Request IDs are visible in safe API diagnostics.
- [ ] Response-time headers and `analysis_meta.latency_ms` are not misrepresented as benchmark results.
- [ ] Unexpected exception logs do not expose prompts, raw provider output, credentials, or personal content.
- [ ] Rich structured metrics, alerting, tracing, and policy-reason telemetry are not claimed unless separately implemented and verified.
- [ ] Operator knows whether failures will produce API errors, mobile demo fallback, or local chat fallback.
- [ ] API restart procedure and presentation fallback media are available.

## 10. Demo rehearsal

- [ ] Presenter can complete Package → Banana → Mushroom → Journal/Favorites in 3:20–4:00.
- [ ] Package journey points to `estimated data` and uses the nutrition-provenance quick question.
- [ ] Banana journey shows a qualified recipe.
- [ ] Mushroom journey does not attempt chat; it proves chat is unavailable.
- [ ] Journal journey explains automatic local save and optional server-history merge.
- [ ] Presenter explicitly says mobile fixtures are not live inference.
- [ ] If backend mock scenarios are shown, presenter distinguishes them from direct mobile fixtures.
- [ ] Level 1, Level 2, and Level 3 fallback procedures in `demo-runbook.md` are rehearsed.
- [ ] No personal notifications, journal data, credentials, or dashboards will be projected.

## 11. Pitch deck and submission media

Verify but do not silently edit presentation assets during the documentation freeze:

- [ ] Deck feature claims match the current MVP scope.
- [ ] Deck does not claim authentication, remote favorites/chat history, journal annotations/removal, or mandatory Supabase persistence.
- [ ] Deck does not imply that unsafe scans expose chat.
- [ ] Fixture footage remains visibly labeled.
- [ ] Architecture visuals distinguish AsyncStorage, default memory persistence, and optional Supabase.
- [ ] No fabricated metrics, citations, customer quotes, logos, partnerships, or traction appear.
- [ ] Video duration/format/resolution comply with event rules.
- [ ] Images/music/fonts are licensed or original.
- [ ] All final links work in the judging environment.

## 12. Optional production hardening — not a shipped-MVP requirement

Record these as future work, not incomplete current features:

- authenticated identities, per-user ownership, account lifecycle, and authorization testing;
- remote favorites and remote chat history;
- journal annotations/removal, image cleanup, retention controls, and export;
- independent label/OCR provenance verification;
- rate limiting, abuse controls, moderation, monitoring, alerting, and incident response;
- expert-labeled evaluation, confidence calibration, false-safe measurement, and toxicology review;
- locale-aware emergency resources and legal review;
- production accessibility, privacy, security, and reliability validation.

## 13. Final 30-minute freeze

- [ ] Stop feature work and record the final candidate SHA/build.
- [ ] Run backend tests, mobile tests, mobile typecheck, and the chosen build/export command.
- [ ] Start the exact candidate API and mobile app.
- [ ] Verify `/health` and record mock/repository modes.
- [ ] Run all three mobile fixture journeys.
- [ ] Verify Mushroom remains recipe- and chat-blocked after Journal replay.
- [ ] Verify local favorite behavior.
- [ ] If showing remote history, verify merge on the final API process.
- [ ] Run narrow documentation searches for stale route and unimplemented-scope claims.
- [ ] Run secret scan and review the final file list/diff.
- [ ] Capture evidence and submit before the deadline.

## 14. Stop-ship conditions

Do **not** present the build as working if any of these remain:

- a Mushroom or other blocked fixture surfaces a recipe, generation control, or chat action;
- fixture/fallback data can be mistaken for live inference;
- the mobile bundle contains privileged credentials;
- invalid scan data reaches the result UI without parser rejection/fallback;
- the UI claims local or remote persistence succeeded after displaying a save/sync error;
- documentation or media presents unimplemented identity, journal annotation/removal, remote favorites, or remote chat persistence as shipped;
- documentation makes unsupported performance, safety, validation, user, impact, or cost claims; or
- the final build cannot follow the disclosed fallback path.

## 15. Final sign-off

| Role | Name | Verified at | Commit/build | Initials |
|---|---|---|---|---|
| Submission owner | `[ADD]` | `[ADD]` | `[ADD]` | `[ADD]` |
| Engineering reviewer | `[ADD]` | `[ADD]` | `[ADD]` | `[ADD]` |
| Safety/claims reviewer | `[ADD]` | `[ADD]` | `[ADD]` | `[ADD]` |
| Demo presenter | `[ADD]` | `[ADD]` | `[ADD]` | `[ADD]` |
