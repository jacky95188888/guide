# AI Eyes — staging handoff (not deployed)

This directory is a **staging-only** workspace for the existing Cloudflare Worker `ai-eyes-video`. It is intentionally on branch `ai-eyes-staging` in `jacky95188888/guide`, **not on main**. Do not merge into main without choosing a dedicated home for the project.

## Verified status (from user-provided screenshots, 2026-10-15)
- Cloudflare Worker URL: https://ai-eyes-video.rhtm9y855y.workers.dev
- Last shared full source: **V3.3** (in ChatGPT conversation). The exact currently deployed version must be verified at `GET /health`.
- Model listing and Gemini text request worked at least once.
- Gemini Interactions background job returned `completed` with a timestamped analysis of the sample YouTube video.
- Video content accuracy has **not** been independently compared with the original.
- Intermittent Gemini 503 high demand errors were observed.
- No Cloudflare deploy token or Cloudflare account ID is present in this GitHub repository to our knowledge; **do not add secrets to source code**.

## Cloudflare bindings
Existing secrets (do not recreate or print): `GEMINI_API_KEY`, `ACCESS_TOKEN`.
Existing model setting: `GEMINI_MODEL` (reported value `gemini-3.8-flash`).
Optional `API_REVISION`: only when current official documentation explicitly requires it.

## Existing endpoints
- `GET /` — mobile UI
- `GET /health` — version and secret-presence booleans
- `POST /models` — model list
- `POST /text` — text generation diagnostic
- `POST /analyze` — video analysis, background or synchronous
- `POST /result` — poll an Interactions background job

POST endpoints require `Authorization: Bearer <ACCESS_TOKEN>`.

## Proposed minimal changes (not yet deployed)
1. Retry only transient 429/503 and network failures with bounded exponential backoff and jitter; respect Retry-After where available. Never duplicate a background job when an ID already exists.
2. Save the background interaction ID in browser localStorage and add a resume button; treat failed/cancelled/unknown states as terminal, not infinite polling.
3. Render analysis text in a readable mobile report; keep raw JSON diagnostics behind an expandable section.
4. Preserve real HTTP status for Worker errors while retaining Google `upstreamStatus` and diagnostic body. Update frontend to parse error bodies.
5. Prevent unbounded prompt input and report size; avoid leaking secrets, sensitive request headers, or unrestricted `/health` configuration.
6. Verify syntax and browser event handlers before deployment. Preserve `String.raw` for embedded HTML.

## Release gates
1. Obtain the **complete actual deployed** Worker source from Cloudflare or an exact copy and save it as an immutable baseline.
2. Build an isolated tested candidate without modifying other Workers.
3. Verify /health, /models, /text, background /analyze, /result completed, and a user-selected YouTube video.
4. Compare three timestamped visual/audio details with the original video.
5. Only after validation and an explicit deployment setup, connect GitHub Actions to the **specific** Cloudflare Worker using restricted credentials stored as GitHub Actions secrets.

**No GitHub Actions auto-deploy is configured in this staging branch.**