# Architecture

## Overview

StadiumIQ 2026 is a small, layered Node.js application with a dependency-free
browser client. The design goals are: **graceful degradation** (never hard-fail
in a live venue), **testability** (pure services, injected fallbacks), and a
**small footprint** (no framework, no committed `node_modules`).

```
┌──────────────────────────────────────────────────────────────────────┐
│ Browser SPA (public/)  — vanilla ES modules, inline SVG, WCAG-AA       │
│   fetch → /api/*                                                        │
└───────────────┬────────────────────────────────────────────────────────┘
                │
┌───────────────▼────────────────────────────────────────────────────────┐
│ Express app (src/app.js)                                                 │
│   requestId → helmet → Permissions-Policy → CORS → json(16kb)           │
│           → rateLimit (general + AI tier) → requireJson → router         │
│                                                                          │
│   routes/ ── validate input ──► services/ ──► aiService.generate()       │
│                                                     │                    │
│                              ┌──────────────────────┴───────────┐        │
│                              │ ANTHROPIC_API_KEY set?            │        │
│                              │   yes → Claude (sanitised, cached)│        │
│                              │   no/err → deterministic fallback │        │
│                              └──────────────────────────────────┘        │
│   errorHandler → { error, code, requestId }                              │
└──────────────────────────────────────────────────────────────────────────┘
```

## Layers

- **`src/config.js`** — the single place environment variables are read,
  parsed and frozen. Nothing else touches `process.env`.
- **`src/middleware/`** — `requestId`, `security` (rate limiters +
  content-type guard), `validate` (typed validators + `ApiError`), and the
  central `errorHandler`.
- **`src/services/`** — one module per capability. Services are pure with
  respect to I/O except through `aiService`, which is the _only_ module that
  performs network calls. Each service supplies a deterministic `fallback` to
  `generate()`, so the whole system runs offline.
- **`src/utils/`** — `logger` (structured, silent in tests), `cache` (TTL +
  bounded LRU), `sanitize` (prompt hardening).
- **`src/data/`** — static, indexed once at startup: venues + wayfinding
  graphs, concierge knowledge base, fixtures, emission factors.

## The AI gateway pattern

Every generative feature calls `aiService.generate({ system, prompt, fallback })`.
Centralising this gives one place to enforce:

1. **Provider isolation** — swap models/providers without touching features.
2. **Timeouts** — a hard `AbortController` deadline on every model call.
3. **Sanitisation** — untrusted text is cleaned before it reaches the model.
4. **Caching** — identical prompts are memoised (TTL), with hit-rate metrics.
5. **Metrics** — model/offline/cache/error counters exposed at `/api/metrics`.
6. **Graceful fallback** — any failure silently returns the deterministic
   result, tagged `source: "offline"`.

## Wayfinding algorithm

`navigationService` builds an adjacency list from a venue's zone graph
(bidirectional corridors) and runs **Dijkstra's shortest path**. In
`accessibleOnly` mode, edges flagged non-step-free (stairs/escalators) are
excluded before the search, so the returned route provably uses only accessible
segments — or returns `422` if none exists.

## Testing strategy

- **Unit + integration** (`test/`, `npm test`) — browserless, hermetic, runs
  with no API key; covers services, validators, middleware, the AI gateway's
  live path (via a stubbed `fetch`), and the full HTTP surface. ~99% line
  coverage.
- **E2E + accessibility** (`e2e/`, `npm run test:e2e`) — drives the real UI in
  headless Chromium and runs axe-core in both themes.
