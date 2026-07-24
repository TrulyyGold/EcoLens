# Safety and responsible AI

**Purpose:** Document the implemented MVP safety controls and separate them from optional production hardening.  
**Applies to:** Scan analysis, result rendering, recipes, contextual chat, journal replay, demo fixtures, and presentation claims.  
**Principle:** A useful abstention is better than a persuasive guess.

> [!CAUTION]
> EcoLens is educational decision support. It is not a medical device, poison-control service, dietitian, food inspector, allergen detector, or field-identification authority. A photo cannot establish identity, edibility, freshness, contamination, dosage, or individual safety.

## 1. Safety objectives

EcoLens should:

1. communicate uncertainty before the user acts;
2. avoid turning visual similarity into permission to consume;
3. preserve nutrition provenance rather than presenting estimates as measured facts;
4. place deterministic controls between model output and recipes;
5. make chat at least as conservative as the original result;
6. reject invalid API input/output and clearly disclose the mobile’s deterministic fallback rather than presenting it as live analysis;
7. apply the fixed escalation boundary for matched medical terms and display emergency guidance on do-not-consume scans, while disclosing detection limits;
8. minimize and protect image, chat, and journal data; and
9. represent demo-mode and system performance honestly.

## 2. Foreseeable harms

| Harm | Example | Primary mitigation |
|---|---|---|
| Misidentification | A toxic mushroom resembles an edible species | Visible alternatives/uncertainty, expert-verification state, no mushroom recipes, do-not-consume policy |
| False reassurance | “Low risk” is read as “safe” | Qualified wording, persistent limitations, server gate, no guarantee language |
| Allergy exposure | Package front is recognized but allergen panel is hidden | Never infer absence; direct user to intact package label and professional guidance |
| Nutrition misinformation | Calories estimated from an image appear label-derived | `nutrition.basis` shown beside every value/group; unavailable beats invented precision |
| Spoilage/contamination | Familiar food is identified but unsafe to eat | State that identity does not establish freshness or contamination; ask user to inspect/discard when in doubt |
| Medical delay | User reports symptoms and continues chatting | API medical-keyword boundary and do-not-consume guidance; incomplete exposure-language coverage is disclosed |
| Unsafe recipe leakage | Model includes a recipe alongside a blocking risk/state | Deterministic API removal plus client defensive hiding and focused regression tests |
| Prompt injection | Text on a package says to ignore safety instructions | Treat image/OCR text as untrusted scene content; schema and policy remain authoritative |
| Privacy loss | A photo contains location metadata or personal surroundings | Current: mobile JPEG re-encoding, no location request, optional private storage; future: deletion/retention controls |
| Automation bias | Polished language makes a low-confidence answer feel certain | Confidence adjacent to name, evidence/alternatives, status/risk badges, and qualified copy |
| Demo deception | Fixture result is presented as live model output | Development fixture label or fallback notice plus `analysis_meta.mock=true` |

## 3. Risk and uncertainty model

The scan contract carries several signals because no one number is sufficient:

- `status`: `complete` or `needs_review`
- numeric `confidence` in `[0,1]`
- `confidence_label`: `high`, `moderate`, or `low`
- evidence and plausible alternatives
- `requires_expert_verification`
- safety `risk_level`: `low`, `caution`, `high`, or `unknown`
- `do_not_consume`

### Interpretation rules

- Numeric confidence is a model signal, **not a validated probability of correctness** unless a future evaluation establishes calibration.
- `high` confidence does not override category risk, missing context, warnings, or expert verification.
- `unknown` is a legitimate safety outcome, not an error to hide.
- The service can escalate risk/review/do-not-consume state after provider output and does not lower provider risk or clear a provider do-not-consume flag; it may replace headlines and filter text that matches its medical-advice patterns.
- The UI shows the confidence label and review state near the identity; numeric confidence is secondary.
- Alternatives should be concrete enough to explain ambiguity but must not become a choose-your-own-edibility list.

The implemented confidence labels are deterministic: `high` at `>=0.85`, `moderate` at `>=0.65` and `<0.85`, and `low` below `0.65`. Confidence below `0.65` also forces unknown risk, expert verification, do-not-consume, `needs_review`, no recipes, and `chat_available=false`. These thresholds are policy constants, not evidence that confidence is calibrated; production calibration remains future work.

## 4. Deterministic policy matrix

The live server first parses provider JSON into strict Pydantic models and then applies `apps/api/app/safety.py` before storage or response. The checked-in JSON Schema is exercised by contract tests, not separately executed in the request path. The mobile client repeats recipe/display restrictions defensively but is not the server trust boundary.

| Implemented condition | Canonical server posture | Recipes | Chat |
|---|---|---|---|
| Category `plant` | Expert verification, do-not-consume, at least caution risk, `needs_review` | Removed | `chat_available=false` |
| Category `mushroom` | Expert verification, high risk, do-not-consume, `needs_review` | Removed | `chat_available=false` |
| Category `unknown` | Expert verification, unknown risk, do-not-consume, `needs_review` | Removed | `chat_available=false` |
| Confidence `<0.65` | Low label, expert verification, unknown risk, do-not-consume, `needs_review` | Removed | `chat_available=false` |
| Provider high/unknown risk or do-not-consume | Expert review / `needs_review`; deterministic high-risk warning is added (medical-pattern text may be filtered) | Removed | `chat_available=false` through expert/do-not-consume state |
| `requires_expert_verification=true` | `needs_review` | Removed | `chat_available=false` |
| Caution alone, with no other blocker | Caution remains prominent | May remain | May be true when confidence is at least `0.65` |
| Otherwise eligible food/packaged food | Warnings and image limitations remain visible | Up to three | `chat_available=true` when confidence is at least `0.65` |

### Implemented recipe gates

The API removes or suppresses recipes for plant, mushroom, or unknown categories; confidence below `0.65`; expert-verification; or do-not-consume. Provider high/unknown risk is converted into expert-review handling, so those scans are also blocked even when the provider did not set do-not-consume. The mobile additionally suppresses recipes for wild plant/mushroom, `needs_review`, expert-verification, high/unknown risk, or do-not-consume.

A `caution` label by itself is **not** a recipe blocker in the current code. The mobile Package fixture intentionally demonstrates caution with an otherwise eligible stored recipe. A future policy may become stricter, but documentation must not claim that stricter rule is shipped.

## 5. Category-specific posture

### Mushrooms

- Vision-only identification never establishes edibility.
- Do not provide tasting, cooking, preparation, dosage, or “look-alike test” instructions.
- Do not imply that cooking neutralizes toxins.
- Show plausible alternatives only to explain uncertainty.
- Recommend verification by a qualified local mycologist/poison resource when relevant.
- If ingestion or symptoms are mentioned, skip further identification debate and direct the user to local emergency services or a poison information center immediately.

### Wild plants

- Do not provide consumption or medicinal-use permission from an image.
- Account for toxic look-alikes, harmful plant parts, growth stage, region, and preparation differences.
- Avoid claims that “natural” means safe.
- For skin/contact risks, suggest avoiding handling and seeking qualified advice; do not diagnose a reaction.

### Packaged food

- The intact product label is the authority for ingredients, allergens, preparation, and dates—not visual recognition.
- The live-provider prompt instructs the model to use `nutrition.basis=label` only when relevant values can be read, but the MVP has no independent OCR/legibility verifier; treat that provenance as a model claim requiring user confirmation.
- The mobile Package fixture deliberately uses `estimated`; the backend Doritos mock uses `label` only as deterministic contract fixture data, not proof of OCR or label validation.
- A recognized brand/product does not prove the photographed package is the same size/formulation or untampered.
- Never infer “allergen-free” from absence in the visible image.

### Familiar food

- Identification does not establish freshness, storage history, contamination, cooking temperature, or suitability for a specific person.
- Recipes are conditional suggestions, not safety clearance.
- The live-provider prompt asks for no recipes when there is a safety concern, but the deterministic MVP gate does not suppress on `caution` alone; a stricter spoilage/ambiguity rule remains future hardening.

## 6. Nutrition provenance

Every nutrition object has a `basis`:

| Basis | Contract meaning | Current mobile presentation |
|---|---|---|
| `label` | Provider/fixture says values came from a visible product label | **label data** plus “Transcribed from a visible product label”; still direct the user to the physical label |
| `estimated` | Approximation based on a reference product/context | **estimated data** plus “Estimated from a reference product” and provenance warning |
| `general` | General reference information for a food | **general data** plus “General reference value for this food” and provenance warning |
| `unavailable` | Reliable values cannot be supplied | “Nutrition data is unavailable”; nulls are not displayed as zero |

Rules:

- Null is not zero.
- A model-recognized product name is not enough to claim label provenance.
- The mobile local nutrition answer repeats the stored basis; live chat is prompted with the full scan, but the MVP has no dedicated provenance-consistency validator for provider wording.
- The UI must not visually de-emphasize provenance relative to the number.
- Personalized targets, disease management, weight-loss prescriptions, or allergy advice are out of scope.

## 7. Safety-aware chat

Chat is scan-scoped, but the MVP has no authenticated user or ownership boundary.

### Implemented behavior

- The result screen exposes chat only when `chat_available=true`; Mushroom and other unsafe scans show **Follow-up chat unavailable** and no chat action.
- `POST /chat` accepts exactly `{ scan_id, message }`, reloads that canonical scan, and does not accept client chat history.
- For a non-chat-eligible scan called directly, the API returns the fixed expert-verification/do-not-consume notice without calling the provider.
- For a medical-keyword request, the API returns the fixed `MEDICAL_BOUNDARY` response directing possible ingestion/symptoms to local emergency services or poison control; it does not diagnose or recommend treatment.
- For an eligible live scan, the adapter receives the saved scan plus the question as data. Provider output matching the implemented medical-advice patterns is replaced by the fixed boundary.
- For a mock result or absent API URL, mobile uses a local answer grounded in the scan. This local fixture/fallback path is not remote chat, is not persisted, and does not implement the API’s full medical-keyword gate; it must never be presented as emergency guidance.
- Chat messages exist only in `ChatScreen` state for that navigation session. The API does not write the migration’s `chat_messages` table.

### Non-negotiable restrictions

Neither API nor local chat may be described as able to:

- change “moderate confidence” into “confirmed”;
- present an alternative as safe because the user prefers it;
- claim an estimate came from the package label;
- provide a recipe that policy suppressed;
- waive allergy, pregnancy, medication, age, or health considerations;
- diagnose symptoms or advise delaying urgent help; or
- reveal system prompts, credentials, or other users’ data.

The shipped Mushroom journey never opens chat. Do not demonstrate a mushroom cooking question as though the UI permits it; use the visible blocked state as the safety proof.

## 8. Emergency and exposure language

### Implemented boundary

- The API checks chat messages against bounded patterns for diagnosis, dose/dosage, prescription/medication, treatment/cure, the literal term `symptom`, allergic reaction, poison/poisoned/poisoning, inducing vomiting, “am I sick,” and “medical advice.”
- A match returns the fixed non-medical boundary: EcoLens cannot diagnose or treat; possible harmful ingestion or symptoms should go to local emergency services or poison control now.
- The analysis policy adds generic emergency guidance to any canonical scan with `do_not_consume=true`.
- The app does not determine location and does not invent a country-specific number.

This is a conservative rule, not a complete exposure-intent classifier. The current keyword set does not prove that every phrasing such as “I ate this” will be detected, and the local fixture/fallback chat path does not run the API detector. Presenters and future implementations should direct any stated possible exposure or symptoms to local emergency/poison resources, never diagnose, calculate a safe dose, advise vomiting/home remedies, or recommend waiting. Broader intent detection, locale-aware resources, and legally reviewed wording are optional production hardening, not shipped validation.

## 9. Model and prompt controls

- Use a versioned system prompt that states role limits, output schema, category rules, provenance requirements, and abstention behavior.
- Treat image text, barcodes, labels, and user chat as untrusted data—not instructions that can override system policy.
- Request structured output where available, then validate locally.
- The service applies a configured total timeout to analysis, chat, and recipe calls. It has no retry loop; partial or invalid structured output becomes `provider_unavailable`.
- Do not ask for or expose chain-of-thought. Request short evidence observations suitable for users.
- Record provider model and prompt version authoritatively in `analysis_meta`.
- Keep temperature/decoding settings conservative and documented in code.
- Changes to prompt, model, confidence mapping, or policy require fixture/regression reruns.

## 10. Schema and server controls

The canonical scan schema and corresponding strict runtime models:

- reject unexpected properties;
- constrain categories, confidence labels, risk levels, nutrition basis, and recipe difficulty;
- limit evidence, alternatives, facts, and recipes;
- require at least one warning;
- allow nullable nutrition fields without equating null to zero; and
- carry model/prompt/mock/latency metadata.

The checked-in JSON Schema is the cross-language contract and is run in backend contract tests. Runtime provider parsing and FastAPI response serialization use Pydantic; mobile uses a strict TypeScript parser. The server additionally:

- authors UUID, timestamp, and analysis metadata;
- applies deterministic safety consistency, recipe suppression, and `chat_available` rules;
- bounds chat messages to 1000 characters and preferences to ten items through request models;
- converts invalid provider structure into a provider-unavailable error; and
- returns bounded error envelopes; the implemented handlers do not place prompts, stack traces, keys, or raw provider output in response bodies.

The MVP does **not** authenticate callers, validate ownership, or provide general-purpose user-visible-string sanitization/length limits beyond the declared models. React Native renders returned strings as text rather than executable HTML.

## 11. User-interface guardrails

### Implemented MVP behavior

- Safety appears before nutrition and recipes.
- `needs_review`, risk, expert-review, and do-not-consume states are visible without expanding a panel.
- Text and badges supplement color for risk.
- Development fixtures display **Development demo** / “Fixture data · not a live identification”; automatic analysis fallback displays **Demo result shown**.
- Nutrition basis is shown with the values and a provenance warning.
- Alternatives are labeled as alternatives, not recommendations.
- Blocked scans show a prominent **Recipes blocked** panel with no recipe cards or generation control.
- Results with `chat_available=false` show **Follow-up chat unavailable** and no chat action.
- Journal/Favorites replay the canonical result, reapply client recipe suppression, and honor the stored `chat_available` flag.

### Wording guide

| Prefer | Avoid |
|---|---|
| “Likely match” | “Confirmed” |
| “The image suggests…” | “This is definitely…” |
| “No issue is apparent in this photo; that does not establish safety” | “Safe” |
| “Do not consume based on this scan” | “Probably fine” |
| “From visible label / Estimate / General reference” | Unqualified nutrition numbers |
| “Seek qualified local verification” | “Ask someone who knows plants” |

Avoid gamified confidence, celebratory animation on a safety-sensitive identification, and visual treatment that makes recipes more prominent than warnings.

## 12. Privacy and data responsibility

### Implemented MVP boundaries

- Mobile re-encodes the selected asset as JPEG and does not request location; it sends the image only when analysis begins after the user captures or chooses it.
- In-memory API mode discards image bytes after analysis and keeps scan results only for the process lifetime.
- Optional Supabase mode uploads to a private bucket and stores a one-hour signed URL in the scan; the URL can expire and is not refreshed.
- Journal results and favorite IDs are device-local AsyncStorage data. Configured API scan history is merged into the journal, but it is repository-wide rather than owner-scoped.
- Chat turns are screen-memory only; remote chat/favorite persistence is not exposed.
- Provider and Supabase privileged credentials stay on the API host.
- The code does not deliberately log request images or chat bodies, but the MVP has no completed privacy/logging audit.

### Optional production hardening — not shipped

Before accepting real user data, add authenticated ownership, deletion/export and image cleanup, documented retention/backup behavior, explicit provider-disclosure/consent UX, audited log redaction, provider data-use review, and governance for any model-training use. The current MVP has none of those account/privacy lifecycle guarantees.

## 13. Evaluation status

The repository contains a **focused behavioral regression set**, not scientific, toxicological, clinical, security, or real-world accuracy validation.

### Automated coverage present

Backend tests cover:

- Banana, Doritos, and Mushroom mock API scenarios against the canonical JSON Schema;
- Mushroom escalation/recipe removal/`chat_available=false`;
- synthetic low-confidence and plant policy cases;
- scan history order, lookup/404, normal mock chat, a medical-keyword refusal, eligible/blocked recipe generation, image validation, and analysis timeout errors.

Mobile tests cover:

- strict parsing of the three fixtures and rejection of an unexpected top-level property;
- exact analysis, chat, history, and recipe request paths/bodies;
- local Mushroom recipe suppression without an API call; and
- fixture safety presentation, including Mushroom `recipes=[]` and `chat_available=false`.

There are no automated screen-rendering tests for the Journal replay, visible demo labels, blocked recipe panel, or absence of the Mushroom chat action; those are manual checks in the demo runbook/checklist. There is also no implemented blurred-label, spoilage, unknown-object, multi-item, dark-image, printed-prompt-injection, multi-turn jailbreak, or comprehensive exposure-language suite. Do not imply those cases passed.

### Optional evaluation before production — not shipped

- Expert-labeled, representative datasets by category, geography, lighting, device, and demographic context
- Top-1/top-k identification performance and abstention quality
- Confidence calibration and selective-risk curves
- False-safe rate, especially for poisonous look-alikes and allergen claims
- Expanded policy-gate bypass, exposure-language, and multi-turn jailbreak testing
- Nutrition extraction/OCR error by provenance type
- Accessibility/usability studies under stress
- Privacy/security review, legal review, incident response, and monitoring thresholds

## 14. Known limitations to disclose

- One image lacks smell, texture, underside, scale, habitat, preparation, and storage history.
- The model may hallucinate names, evidence, ingredients, or values.
- Look-alikes can be visually indistinguishable to a non-expert or from a single view.
- Packaged products change formulation and serving size.
- The prototype has no complete barcode, nutrition, toxicology, or regional-species database.
- Safety policy reduces risk but cannot make the system authoritative.
- Demo fixtures show intended behavior, not general accuracy.
- This hackathon prototype has not undergone clinical, toxicological, security, or production reliability validation.

## 15. Incident posture for the demo

If the product produces an unsafe or misleading live result during rehearsal/demo:

1. Stop using that result; do not explain it away.
2. State the limitation plainly.
3. Switch to the disclosed fixture path.
4. Capture request ID and non-sensitive diagnostics.
5. Preserve the failing test case without retaining unnecessary personal data.
6. Add a regression fixture and tighten prompt/policy/UI before the next build.

No hackathon narrative is more important than avoiding a false safety claim.

## 16. Responsible presentation rules

The team may say:

- “EcoLens exposes uncertainty and applies a deterministic recipe gate.”
- “The provider is behind an adapter. Backend mock scenarios use the server’s Pydantic and safety-policy path; mobile development fixtures use the strict mobile parser and defensive result UI.”
- “This is a prototype designed for conservative behavior.”

The team must not say without evidence:

- “EcoLens accurately identifies any food, plant, or mushroom.”
- “It is safe to rely on.”
- “It prevents poisoning.”
- “It is clinically validated.”
- “It achieves a particular accuracy, latency, or cost.”

## 17. Release gate

Before presenting:

- [ ] The current Mushroom mobile fixture and backend scenario suppress recipes and set `chat_available=false`.
- [ ] High/unknown-risk, do-not-consume, low-confidence, plant, mushroom, and expert-review cases remain blocked; caution alone is not falsely described as a current recipe blocker.
- [ ] Unsafe results expose no chat action; a direct API call for a non-chat-eligible scan returns the fixed safety notice.
- [ ] Nutrition provenance is visible for the exercised fixtures, and no untested provenance/OCR behavior is claimed validated.
- [ ] Development fixtures and automatic fallback data are unmistakably labeled.
- [ ] Invalid provider output becomes a bounded error/fallback and does not render as a live result.
- [ ] Safety is conveyed with text/badges as well as color and appears before recipes.
- [ ] The implemented medical-keyword API test returns the fixed emergency/poison-resource boundary; broader exposure-language coverage is not claimed.
- [ ] No secret or personal data is projected; do not claim a completed logging/privacy audit.
- [ ] The presenter can state the product limits without minimizing them.
- [ ] Demo fixtures are described as fixtures, not evidence of accuracy.

## 18. Source note

Provider assumptions should be checked against current official documentation:

- Gemini model catalog: <https://ai.google.dev/gemini-api/docs/models>
- Gemini image understanding: <https://ai.google.dev/gemini-api/docs/image-understanding>
- Gemini Developer API pricing: <https://ai.google.dev/gemini-api/docs/pricing>

Capabilities, model identifiers, quotas, pricing, and data-use conditions can change. This safety plan makes no accuracy, latency, or cost claim.