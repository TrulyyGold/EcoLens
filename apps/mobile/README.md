# EcoLens mobile app

Expo React Native client for the EcoLens hackathon MVP. It supports camera capture, photo-library upload, analysis progress, category-aware results, safety-first recipe gating, scan-scoped chat, a local discovery journal, and favorites.

## Run

```bash
npm ci
cp .env.example .env
npm start
```

The app is linked to Expo account `@trulyygolds-team`, project slug `ecolens-mobile`, and EAS project ID `8831679b-f885-4057-9ddb-5bff2d894666`. All committed EAS build profiles point to the deployed Railway API:

```dotenv
EXPO_PUBLIC_API_URL=https://ecolens-api-production.up.railway.app
```

For a separate local backend, override `EXPO_PUBLIC_API_URL` in an uncommitted `.env`. A physical phone generally cannot reach a computer through `localhost`; use the computer's LAN address.

The development home screen also exposes Banana, Package, and Mushroom fixtures. Fixture results are visibly labeled and use the same parser and safety presentation as API responses.

App icon and splash PNG files are generated during `npm ci`, `npm start`, and `npm run export:android` by the dependency-free `assets/generate_assets.mjs` script. This keeps fresh checkouts and browser-uploaded source repositories reproducible without storing generated binaries.

## Commands

```bash
npm test
npm run typecheck
npm run android
npm run ios
```

A deterministic static bundle check can be run with:

```bash
npm run export:android
```

## Safety behavior

- Results expose confidence, visual evidence, alternatives, and expert-review state.
- Safety appears before nutrition and recipes.
- Mushroom, unknown, high-risk, do-not-consume, low-confidence, and expert-review results never render recipes.
- Nutrition values always identify their basis as label, estimated, general, or unavailable.
- Unsafe results do not expose chat controls in this MVP.
- Local fallback answers cannot grant permission to eat a wild species or provide medical advice.

## Data behavior

The journal and favorites are stored in AsyncStorage for demo resilience. When the API URL is configured, scan history is refreshed from `GET /scan-history` and merged with local discoveries. The app contains no Gemini or Supabase service-role credential.

## API contract

The TypeScript types and strict runtime parser mirror `../../contracts/scan-result.schema.json`. Integration routes are:

- `POST /analyze-image`
- `GET /scan-history`
- `POST /chat`
- `POST /generate-recipe`
