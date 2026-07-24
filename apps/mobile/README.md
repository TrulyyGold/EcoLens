# EcoLens mobile app

Expo React Native client for the EcoLens hackathon MVP. It supports camera capture, photo-library upload, analysis progress, category-aware results, safety-first recipe gating, scan-scoped chat, a local discovery journal, and favorites.

## Run

```bash
npm ci
cp .env.example .env
npm start
```

Set `EXPO_PUBLIC_API_URL` to the FastAPI base URL reachable by the simulator or phone. A physical phone generally cannot reach a server through `localhost`; use the computer's LAN address or a deployed HTTPS endpoint.

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.20:8000
```

The development home screen also exposes Banana, Package, and Mushroom fixtures. Fixture results are visibly labeled and use the same parser and safety presentation as API responses.

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
