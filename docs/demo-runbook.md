# EcoLens demo runbook

**Target duration:** 3 minutes 40 seconds (acceptable range: 3:20–4:00)  
**Format:** One presenter, one phone/simulator, development build with fixture buttons  
**Demo thesis:** EcoLens is valuable not because it always answers, but because it exposes uncertainty and removes unsafe next steps.

> This script uses controls and fixtures that exist in the current repository. Verify the exact build before presenting. Do not claim live inference, remote accounts, journal annotations, deletion, or remote favorites/chat persistence.

## 1. Demo mode used by this runbook

The deterministic path is the **Development demos** card on the mobile Home screen. It is rendered only when `__DEV__` is true and provides three buttons:

- **Package** → mobile `doritos` fixture;
- **Banana** → mobile `banana` fixture; and
- **Mushroom safety** → mobile `mushroom` fixture.

Each fixture is strictly parsed into the canonical scan shape, added to the AsyncStorage journal, and shown in the normal result UI. Result pages show **Development demo** and “Fixture data · not a live identification.”

This is distinct from backend mock scenarios. The backend also accepts `demo_scenario=banana|doritos|mushroom` on `POST /analyze-image`, but the mobile fixture buttons do not call the API. Backend scenarios do pass through server safety policy; direct mobile fixtures pass through the mobile parser and defensive safety presentation.

## 2. Demo assets and setup

Required:

1. A current development build or Expo development session with **Development demos** visible.
2. Journal storage either empty or containing only recognizable test fixtures.
3. The app on Home at the top of the screen.
4. Phone/simulator mirrored at a readable scale.
5. Pitch deck and a verified local recording/screenshots as backup.

Optional, only if live/API behavior will also be discussed:

6. Reachable FastAPI base URL.
7. Valid JPEG, PNG, or WebP test image for direct API smoke calls.
8. Gemini credentials for live mode, or default backend mock mode for deterministic API tests.
9. Supabase credentials only if optional remote scan persistence/private storage will be shown.

Do not bring or handle an unknown mushroom specimen for the presentation.

## 3. Preflight

### T−30 minutes

- [ ] Run the mobile tests and typecheck from `apps/mobile`.
- [ ] Run the backend tests from `apps/api`.
- [ ] Launch the exact development build and confirm the three fixture buttons are visible.
- [ ] Run **Package**, **Banana**, and **Mushroom safety** once each.
- [ ] Confirm every fixture result is visibly identified as development demo data.
- [ ] Confirm Package shows `estimated data` for nutrition in the mobile fixture.
- [ ] Confirm Banana shows recipe cards and `chat_available=true` behavior.
- [ ] Confirm Mushroom shows `do_not_consume=true`, no recipe cards/generation control, and no chat action.
- [ ] Open Journal and verify all three results reopen without another analysis.
- [ ] Favorite/unfavorite one safe result and verify Favorites updates.
- [ ] Confirm `https://ecolens-api-production.up.railway.app/health` returns HTTP 200 with `mock_mode=false` and `repository=supabase`.
- [ ] If showing remote history, use an isolated demo API process, confirm Journal refresh reaches `GET /scan-history`, and verify the repository-wide response merges without removing local fixtures; do not call it per-user history.
- [ ] Open fallback recording/screenshots locally.
- [ ] Close notifications, secret-bearing consoles, personal data, and unrelated tabs.

### T−5 minutes

- [ ] Return to Home and scroll to the top.
- [ ] Confirm **Development demos** remains visible.
- [ ] Put the device on Do Not Disturb, disable auto-lock, and set readable brightness/text size.
- [ ] Start a 4:00 hard-stop timer.
- [ ] Keep the deck on the opening slide and the backup media one action away.

## 4. Optional API fixture smoke

Use this only as preflight or technical Q&A. Run it from the repository root. A valid image file is required even though the selected mock scenario is deterministic; the committed app icon provides a known PNG upload for this smoke test.

```bash
curl -sS -X POST \
  -F "image=@apps/mobile/assets/icon.png;type=image/png" \
  -F "demo_scenario=mushroom" \
  http://localhost:8000/analyze-image
```

Check that the response includes:

```json
{
  "status": "needs_review",
  "recipes": [],
  "chat_available": false,
  "safety": {
    "risk_level": "high",
    "do_not_consume": true
  }
}
```

Do not describe this fixture response as evidence of model accuracy.

## 5. Timed demo — three executable journeys

### 0:00–0:20 — Hook

**On screen:** Deck title/problem slide.

**Speaker text**

> “A camera can suggest what it sees. The harder product question is what happens next: where did a nutrition number come from, when is a recipe appropriate, and when should the system stop? EcoLens puts uncertainty and safety into that next step.”

---

### 0:20–1:05 — Journey 1: Package and provenance

**On screen:** Mobile Home → **Development demos** → **Package**.

**Actions**

1. Tap **Package**.
2. Point immediately to **Development demo** / “Fixture data · not a live identification.”
3. Point to brand/product evidence and the caution state.
4. Scroll to **Nutrition & provenance** and point to `estimated data`.
5. Scroll to **Ask about this discovery**, open chat, and tap **Where did the nutrition values come from?**
6. Show the first response, then go back.

**Speaker text**

> “This is a disclosed fixture, not live inference. It recognizes the package, but the mobile fixture labels its nutrition as estimated and tells us to check the physical bag. The scan-grounded answer repeats that stored basis rather than upgrading it to a label reading.”

**Success signal:** The audience sees provenance beside values and hears that product recognition is not proof of label extraction.

---

### 1:05–1:45 — Journey 2: Banana and a conditional idea

**On screen:** Return Home → **Development demos** → **Banana**.

**Actions**

1. Tap **Banana**.
2. Point to confidence, evidence, alternatives, and the safety panel.
3. Scroll to **Safe recipe ideas** and show one recipe card.
4. Do not claim freshness, allergy safety, or contamination-free status.

**Speaker text**

> “For the familiar-food fixture, the result is complete and chat-eligible, so conditional recipe ideas remain available. Safety still appears first, and the recipe tells the user to verify identity, freshness, allergens, preparation, and dietary needs.”

**Success signal:** Recipes appear only in the eligible fixture and remain visibly qualified.

---

### 1:45–2:35 — Journey 3: Mushroom and the deliberate stop

**On screen:** Return Home → **Development demos** → **Mushroom safety**.

**Actions**

1. Tap **Mushroom safety**.
2. Point to low confidence, `needs_review`, alternatives, expert review, high risk, and do-not-consume guidance.
3. Scroll to **Safe recipe ideas** and show the **Recipes blocked** panel.
4. Continue to the bottom and show **Follow-up chat unavailable**.

**Speaker text**

> “A photo cannot establish mushroom edibility. This fixture is low confidence, high risk, do-not-consume, and expert-review required. Recipes are not merely disabled; no recipe cards or generation control are offered. Chat is also unavailable, so there is no interface for negotiating the warning away.”

**Success signal:** Visible uncertainty + do-not-consume + no recipe action + no chat action.

> Do not attempt the old scripted mushroom chat question. The implemented result correctly has `chat_available=false` and does not expose chat.

---

### 2:35–3:05 — Journal and favorites as implemented

**On screen:** Back to Main → **Journal**.

**Actions**

1. Show the three newest fixture scans.
2. Reopen Mushroom briefly, point out that the blocked state remains, then go back to Journal.
3. Reopen Package or Banana, ensure the heart is selected, go back to the main tabs, then open **Favorites**. If it was already selected during preflight, toggle it off and on before leaving the result.

**Speaker text**

> “Every analysis result that reaches the Result screen is added automatically to the device journal. Journal entries and favorite IDs use AsyncStorage, so they remain useful without an account. If an API URL is configured, repository-wide server scan history is merged into this local journal. There is no annotation or removal flow in this MVP.”

**Success signal:** Same scan IDs reopen; Mushroom remains blocked; local favorite appears.

---

### 3:05–3:30 — Architecture

**On screen:** Deck architecture slide.

**Speaker text**

> “Expo owns capture, strict response parsing, the safety-first interface, and local journal/favorites. FastAPI validates images, parses provider output with Pydantic, authors scan metadata, and applies deterministic safety rules. Gemini is behind an adapter; mock scenarios are available for deterministic API tests. Scan persistence is memory by default or optional Supabase. The migration includes scans, favorites, and chat messages, but this MVP exposes only scan persistence—remote favorites and chat history are not API features.”

---

### 3:30–3:40 — Close

**Speaker text**

> “EcoLens turns recognition into a governed next step: evidence when it can help, provenance when numbers matter, and a clear stop when uncertainty carries risk.”

**Hard stop:** Do not add unmeasured accuracy, latency, safety, scale, user, impact, or cost claims.

## 6. Operator cue sheet

| Time | Visual | Required proof | Cut if late |
|---:|---|---|---|
| 0:00 | Deck opening | Decision after recognition | Extra setup story |
| 0:20 | Package fixture | Demo disclosure + estimated provenance + grounded answer | Reading nutrient values |
| 1:05 | Banana fixture | Safety before qualified recipe | Second recipe |
| 1:45 | Mushroom fixture | Do-not-consume + blocked recipes + no chat | Reading every alternative |
| 2:35 | Journal/Favorites | Automatic local save/reopen + local favorite | Favorite persistence explanation |
| 3:05 | Architecture | Adapter + Pydantic + policy + optional persistence | Deployment details |
| 3:30 | Close | One-line value | Any new feature |

## 7. Fallback procedure

### Rule zero: disclose what is being shown

For a development fixture, say:

> “I’m using EcoLens development fixture data. It is visibly labeled and exercises the app’s canonical parser and safety presentation, but it is not a live model result.”

For a backend mock scenario, say:

> “This is a deterministic backend mock scenario. It passes through the API’s typed models and deterministic server safety policy, but it is not live inference.”

Never call a fixture, screenshot, or recording a live response.

### Level 1 — Live mobile analysis fails

Current behavior automatically displays a disclosed demo result for network, timeout, server, or invalid-contract failures.

1. Point to **Demo result shown** and read the short reason.
2. Say: “The live path failed into a labeled fixture fallback.”
3. If time permits, use **Retry live analysis** once.
4. Otherwise return Home and use the corresponding development fixture button.

There is no separate global **Use demo data** switch; do not rehearse or claim one.

### Level 2 — API/provider/network unavailable

1. Use the disclosure above.
2. Run all three Home-screen development fixtures.
3. Do not imply offline inference: these are local fixtures.
4. Skip remote history and explain that the local journal remains available.

### Level 3 — App or mirroring unavailable

1. Say: “The interactive build is unavailable, so I’ll show a recording from the verified build.”
2. Play the local recording or timestamped screenshots in Package → Banana → Mushroom → Journal order.
3. Keep demo labels visible.
4. Show the architecture slide and state which component was unavailable.
5. Do not fabricate a recovery.

### Live result is surprising or unsafe

1. Stop using the result; do not continue to chat or recipes.
2. Say: “That result is not safe enough to act on; the prototype must not be treated as authoritative.”
3. Record the non-sensitive request ID if available.
4. Switch to the disclosed Mushroom development fixture.
5. Preserve a sanitized regression case after the demo.

### Local journal write fails

- Point to the app’s device-save warning.
- Say: “The result is visible now, but the app correctly says it could not save it on this device.”
- Continue to architecture rather than claiming persistence.

### Remote history refresh fails

- Show that local discoveries remain visible.
- Point to the offline/retry notice.
- Do not claim the remote refresh succeeded.

## 8. Judging-criteria mapping

Rubric labels vary by event. Adapt this table to the official rubric rather than presenting it as organizer language.

| Common dimension | Current demo proof | Repository evidence |
|---|---|---|
| Problem / impact | Provenance and unsafe-next-step framing | `product-spec.md` |
| Differentiation | Package provenance + Mushroom abstention | Contract fields and safety rules |
| Technical execution | Strict mobile parser, exact API calls, provider adapter, deterministic policy | `architecture.md`, backend/mobile tests |
| UX | Safety before recipes, blocked Mushroom chat, local journal/favorites | Mobile screens/context |
| Responsible AI | Visible uncertainty, do-not-consume, demo disclosure, no accuracy claim | `safety-and-responsible-ai.md` |
| Completeness | Three fixture journeys plus journal/favorite loop | This runbook |

## 9. Likely Q&A

### “How accurate is it?”

> “We are not reporting a real-world accuracy number. The repository has deterministic contract and safety regression tests, not an expert-labeled representative evaluation. Production use would require calibration and false-safe measurement, especially for toxic look-alikes.”

### “Does the server run the JSON Schema on every response?”

> “The live server uses strict Pydantic models for provider parsing and FastAPI responses. Backend tests validate mock API responses against the checked-in JSON Schema, and mobile uses a strict runtime parser. We do not claim a separate JSON Schema execution in every request.”

### “Why can’t I chat about the mushroom?”

> “Unsafe scans set `chat_available=false`; the mobile result does not show chat. The backend also returns a fixed safety notice if someone calls the chat route directly with that scan ID.”

### “Where is data saved?”

> “The mobile journal and favorites use AsyncStorage. API scans use process memory by default. Supabase scans/private image storage are optional when configured. The current API does not expose remote favorites or chat history.”

### “Are there user accounts?”

> “No. The MVP routes are not authenticated or user-scoped. The migration contains RLS groundwork, but identity and ownership enforcement are future production hardening.”

### “What happens if someone already ate it?”

> “EcoLens does not diagnose. Its medical boundary directs them to local emergency services or poison control promptly and does not advise vomiting, home remedies, or waiting.”

### “Does demo mode bypass the safety story?”

> “There are two fixture paths. Mobile development fixtures use the same strict parser and defensive UI restrictions. Backend mock scenarios use the same Pydantic and server safety path as live provider drafts. Both are disclosed as non-live.”

## 10. Post-demo capture

- [ ] Record which paths were shown: mobile development fixture, backend mock, or live provider.
- [ ] Record whether the API repository was memory or Supabase.
- [ ] Note failed request IDs and safe error codes without secrets or personal data.
- [ ] Capture judge questions and claims that need evidence.
- [ ] Add surprising behavior to the regression backlog.
- [ ] Clear local test state only through a development reset/reinstall procedure if needed; do not imply an in-app removal feature exists.
- [ ] Do not retroactively describe fixture footage as live.
