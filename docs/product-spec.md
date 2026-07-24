# EcoLens product specification

**Status:** Implemented hackathon MVP, audited against the repository  
**Primary surface:** Expo React Native mobile app  
**Service stack:** FastAPI; Gemini through a provider adapter; optional Supabase persistence and private storage  
**Canonical scan contract:** [`../contracts/scan-result.schema.json`](../contracts/scan-result.schema.json)

## 1. Product intent

EcoLens helps a curious person move from “What am I looking at?” to a safer, more informed next step. The implemented MVP can analyze food, packaged food, plants, mushrooms, and unknown items and return:

- a likely identification with visible uncertainty;
- visual evidence and plausible alternatives;
- nutrition with an explicit provenance basis when present;
- safety information before recipes or exploratory content;
- recipes only when deterministic policy permits them;
- scan-scoped follow-up chat only when `chat_available=true`; and
- a local discovery journal and local favorites list.

### Product promise

**Useful when confident. Honest when uncertain. Conservative when safety matters.**

### Non-goals and current limits

EcoLens does not certify identity or edibility, diagnose or treat, detect every allergen or contaminant, replace a product label or qualified expert, or provide personalized medical/nutrition advice. This MVP is not a production safety system.

The shipped experience has no sign-in/account flow, journal annotations, journal-item deletion, remote favorites API, or remote chat-history API. Those capabilities must not be presented as implemented.

## 2. Experience principles

1. **Uncertainty is visible.** Confidence, evidence, alternatives, review state, and expert-verification requirements remain attached to the result.
2. **Safety comes before inspiration.** The result renders safety before nutrition and recipes.
3. **Provenance is part of the value.** Nutrition identifies its basis as `label`, `estimated`, `general`, or `unavailable`.
4. **The server owns the main policy boundary.** Provider output is Pydantic-validated and then passed through deterministic safety rules before a scan is saved or returned.
5. **The client fails defensively.** It strictly parses scan payloads and independently suppresses recipes for blocked states.
6. **Demo behavior is disclosed.** Development fixtures and automatic fallback results are identified as demo data rather than live analysis.

## 3. Implemented product loop

```text
Capture or choose an image
        ↓
Client validates/re-encodes it as JPEG
        ↓
POST /analyze-image, or a disclosed demo fallback
        ↓
Typed provider result + deterministic server safety policy
        ↓
Identity / uncertainty / safety result
        ↓
Nutrition and recipes when permitted
        ↓
Optional chat when chat_available=true
        ↓
Automatic local journal save; optional local favorite
```

A scan result is added to the device journal when analysis completes. There is no separate journal-save form.

## 4. Result information hierarchy

The implemented result screen renders, in order:

1. fallback/demo disclosure when applicable;
2. image, when a local or signed image reference is available;
3. identity, category, status, risk, timestamp, and confidence;
4. prominent safety panel;
5. description and visible evidence;
6. alternatives;
7. nutrition and provenance;
8. safe recipes, or an explicit recipes-blocked panel;
9. facts;
10. chat action only when `chat_available=true`; and
11. analysis metadata.

The heart action stores/removes a favorite ID on the device. Journal and favorite state are not account-backed in this MVP.

## 5. Three executable demo journeys

Use the development build, where the Home screen exposes **Development demos**. These buttons load the current mobile fixtures through the same strict result parser and result UI used by API responses. The fixture result screen displays **Development demo** and “Fixture data · not a live identification.”

The backend has matching scenario names—`banana`, `doritos`, and `mushroom`—for API-level smoke tests. A valid JPEG, PNG, or WebP upload is still required even in backend mock mode.

### Journey 1 — Package: provenance without overclaiming

**Path**

1. Home → **Development demos** → **Package**.
2. On the result, review the Doritos brand/product evidence and caution panel.
3. Open **Nutrition & provenance**.
4. Confirm the fixture says `estimated data`, not a visible-label measurement.
5. Tap **Ask about this discovery** and choose **Where did the nutrition values come from?**
6. Return, tap the heart if favorite behavior should be shown, then open **Journal** and reopen the same scan.

**Expected current behavior**

- Category is `packaged_food`; the fixture brand is `Doritos`.
- The mobile fixture uses `nutrition.basis=estimated` and tells the user to check the physical package.
- The fixture-scoped local answer names the stored basis and does not upgrade it to `label`.
- The scan is already in the reverse-chronological local journal after analysis.
- Reopening preserves the same `scan_id`, safety state, nutrition provenance, and recipes.
- Favorite state is stored locally with AsyncStorage.

> The backend `doritos` mock scenario uses `nutrition.basis=label` as deterministic fixture data. It is useful for contract/UI testing, not proof that arbitrary label text has been independently verified. A production build would need stronger label-legibility/OCR validation before relying on that provenance.

### Journey 2 — Banana: recognition to a conditional recipe

**Path**

1. Home → **Development demos** → **Banana**.
2. Review identity, confidence, evidence, alternatives, and the safety qualification.
3. Scroll to **Safe recipe ideas** and open/read one of the stored recipes.
4. Optionally enter preferences and tap **Refresh safe ideas**; mock results reuse their fixture recipes locally.
5. Tap **Ask about this discovery** and ask **What visual evidence supports this?**
6. Return and reopen the scan from **Journal**.

**Expected current behavior**

- Category is `food`, status is `complete`, and `chat_available=true`.
- Safety is visible before the recipes.
- Recipes remain conditional and include allergen/dietary caveats.
- The scan-scoped local chat answer is clearly based on the saved fixture result.
- Journal replay does not rerun analysis.

### Journey 3 — Mushroom: a deliberate stop

**Path**

1. Home → **Development demos** → **Mushroom safety**.
2. Review the low-confidence identity, alternatives, expert-review badge, and high-risk panel.
3. Scroll to **Safe recipe ideas** and confirm the blocked panel contains no recipe cards or generation control.
4. Continue to the bottom and confirm there is no chat action; the UI shows **Follow-up chat unavailable**.
5. Open **Journal** and reopen the mushroom scan.

**Expected current behavior**

- Category is `mushroom`, status is `needs_review`, risk is `high`, and `do_not_consume=true`.
- `requires_expert_verification=true`, `recipes=[]`, and `chat_available=false`.
- The UI does not offer a way to ask for cooking or consumption permission.
- Journal replay preserves the blocked state and the client reapplies recipe suppression.

This journey must not be changed to expose chat. The backend also refuses direct `/chat` use for a scan whose `chat_available` is false, but the shipped mobile experience does not navigate to chat for that scan.

## 6. Implemented functional scope

### 6.1 Capture and image handling

- Camera capture and image-library selection are implemented.
- The mobile client accepts JPEG, PNG, WebP, HEIC, or HEIF source assets, rejects over-25 MB or very small sources when metadata is available, resizes the long edge to at most 1600 px, and re-encodes to JPEG.
- The API accepts decoded JPEG, PNG, or WebP multipart data, defaults to a 10 MB byte limit, and enforces a 25-megapixel limit.
- The API verifies that bytes match the declared content type.
- The user can cancel, retry, or choose another photo through the implemented screens.

### 6.2 Analysis and contract handling

- Gemini is requested to return schema-constrained JSON and its response is parsed into strict Pydantic models.
- FastAPI response models serialize the canonical scan shape.
- Backend contract tests validate mock scan responses against `scan-result.schema.json`.
- The mobile client applies a strict runtime parser that rejects unexpected fields and invalid values.
- `scan_id`, `created_at`, model name, prompt version, mock flag, and latency are authored by the service rather than accepted from provider output.

Runtime code does not separately execute the checked-in JSON Schema for each request; Pydantic models are the live server boundary and automated tests check their scan output against the canonical schema.

### 6.3 Safety policy

After provider parsing, the API:

- maps confidence to `high` (at least 0.85), `moderate` (at least 0.65), or `low`;
- forces image-identified plants and mushrooms into expert-verification/do-not-consume handling;
- makes mushroom results high risk and `needs_review`;
- makes confidence below 0.65 unknown risk, do-not-consume, and `needs_review`;
- escalates high/unknown risk or existing do-not-consume results to expert review;
- removes recipes for wild plant/mushroom, low-confidence, high/unknown-risk, do-not-consume, or expert-verification states;
- removes provider text matching the implemented medical-advice patterns; and
- sets `chat_available` only when the item is not do-not-consume, confidence is at least 0.65, and expert verification is not required.

A `caution` risk label alone does not automatically suppress a recipe in the current implementation; other blocking fields still do. The UI keeps caution prominent.

### 6.4 Contextual chat

- `POST /chat` accepts exactly `scan_id` and `message`.
- The API loads the saved scan before answering.
- Medical-keyword requests receive a fixed non-medical boundary response.
- A scan with `chat_available=false` receives a fixed expert-verification/do-not-consume response if the endpoint is called directly.
- The mobile result hides the chat action when `chat_available=false`.
- Safe mock results, or any result when no API URL is configured, use a local scan-grounded answer. Eligible non-mock results call the API when a URL is configured and fall back to the local answer on timeout/unavailability.
- Chat turns are kept in the current screen state only; there is no remote chat history or chat-message persistence in the MVP API.

### 6.5 Recipes

- `POST /generate-recipe` accepts `scan_id` and `preferences`.
- The API reloads the scan and suppresses generation for plant, mushroom, unknown, confidence below 0.65, expert-verification, or do-not-consume states.
- Generated recipes are limited to three and are removed if they match the implemented medical-advice output patterns.
- The mobile client blocks recipe requests locally for wild plant/mushroom, `needs_review`, expert-verification, high/unknown-risk, or do-not-consume states.

### 6.6 Journal and favorites

- Every analysis result that reaches Result is prepended to the local AsyncStorage journal; persisted journal storage is capped at 50 scan results.
- Favorite scan IDs are stored in AsyncStorage.
- If `EXPO_PUBLIC_API_URL` is configured, the app calls `GET /scan-history`, merges the repository-wide response with local scans by `scan_id`, sorts newest first, and writes the merged journal locally. The response is not per-user because the MVP API has no identity or ownership filter.
- Journal refresh failure leaves local discoveries available.
- There are no journal annotation or delete controls.
- There are no remote favorite routes.

### 6.7 Demo and fallback behavior

- The development Home screen exposes Banana, Package, and Mushroom fixture buttons.
- The backend mock adapter defaults to Banana and accepts optional `demo_scenario=banana|doritos|mushroom` on `/analyze-image`.
- The mobile analysis client automatically returns a disclosed demo result when no API URL/image is available or when the API fails, times out, or returns an invalid payload.
- This automatic fallback is current behavior; there is no global fixture-mode switch or separate **Use demo data** action.

## 7. Shipped API surface

| Method | Path | Request/purpose |
|---|---|---|
| `GET` | `/health` | Returns service version, mock mode, and active repository kind. |
| `POST` | `/analyze-image` | Multipart field `image` (legacy alias `file` is also accepted); optional `demo_scenario`; returns `ScanResult`. |
| `GET` | `/scan-history` | Lists newest scans first; supports `limit` (1–100) and `offset`. |
| `GET` | `/scans/{scan_id}` | Retrieves one canonical scan. |
| `POST` | `/chat` | JSON `{ "scan_id": "<uuid>", "message": "..." }`. |
| `POST` | `/generate-recipe` | JSON `{ "scan_id": "<uuid>", "preferences": ["..."] }`. |

No authentication dependency is attached to these routes in the MVP. Do not describe them as user-scoped or account-protected.

## 8. Persistence and storage modes

### Default, credential-free mode

- The API uses a process-local in-memory scan repository.
- Image bytes are not retained by that repository and `image_url` is null.
- API history disappears when the process restarts.
- The mobile journal and favorites remain device-local in AsyncStorage.

### Optional Supabase mode

When Supabase URL/key configuration is present, the API uses `SupabaseScanRepository` to:

- upsert canonical results into `scans`;
- read/list scans; and
- upload images to the private `scan-images` bucket and return a one-hour signed URL.

The backend documentation recommends a service-role key. A restricted key without an authenticated user context can be blocked by the migration’s forced RLS because the MVP API does not establish caller identity.

The committed migration creates `scans`, `favorites`, and `chat_messages` tables plus the private storage bucket and RLS policies. The current API repository only reads/writes `scans` and storage. It does not expose remote favorite or chat-persistence operations.

## 9. Failure behavior

| Case | Current behavior |
|---|---|
| Unsupported, corrupt, mismatched, oversized, or over-dimension image | API returns a structured bounded error. |
| Provider analysis/chat/recipe timeout | API returns `analysis_timeout` with HTTP 504. |
| Provider unavailable or invalid structured output | API returns `provider_unavailable` with HTTP 503. |
| Image storage or scan persistence failure | API returns a 503 storage/persistence error. |
| Scan not found | API returns structured 404 `scan_not_found`. |
| Mobile analysis network/server/timeout/contract failure | App shows a disclosed fixture result and offers **Retry live analysis** when it still has the image. |
| History refresh failure | App retains local journal data and shows an offline/retry notice. |
| Chat live failure | App displays an answer grounded in the saved scan and labels the live assistant as unavailable. |

## 10. Must-ship experience represented by this repository

1. Contract-shaped end-to-end scan response
2. Visible uncertainty and safety hierarchy
3. Deterministic server recipe gate plus defensive client suppression
4. Scan-scoped chat for results with `chat_available=true`
5. Local journal save/reopen and local favorites
6. Merge of configured API scan history into the local journal
7. Three disclosed development fixtures
8. Bounded errors and disclosed analysis fallback

## 11. Optional production hardening — not shipped

The following are intentionally aspirational and must be labeled future work:

- authentication, per-user ownership checks, and account lifecycle;
- production-tested RLS/authorization flows;
- journal annotations, item deletion, retention controls, and data export;
- remote favorites and remote chat-history APIs;
- durable chat persistence and multi-turn server context;
- independent label/OCR provenance verification;
- abuse controls, rate limiting, moderation, incident response, and monitoring;
- expert-labeled evaluation, confidence calibration, and false-safe measurement;
- locale-aware poison/emergency resources and legal review;
- production privacy/security/accessibility validation; and
- stronger deployment observability and reliability engineering.

## 12. Definition of demo-ready

EcoLens is demo-ready only after the team verifies on the exact presentation build that:

- the three development-fixture journeys above complete;
- mushroom results show `recipes=[]` and `chat_available=false` in both API and mobile fixtures;
- demo/fallback results are visibly disclosed;
- a scan appears in Journal and reopens with the same `scan_id`;
- a favorite survives an app reload on the presentation device;
- the configured API health/history path works if remote behavior will be shown;
- no screen claims certainty, medical authority, measured nutrition from an image, or validated real-world performance; and
- any future hardening item is described as planned rather than shipped.
