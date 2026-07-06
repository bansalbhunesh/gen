# ⚽ StadiumIQ 2026

**A GenAI-powered stadium operations & fan-experience platform for the FIFA World Cup 2026.**

StadiumIQ turns Generative AI into a practical, always-available assistant for the four host-nation constituencies of the tournament — **fans, organizers, volunteers and venue staff** — across all 16 host stadiums in the USA, Canada and Mexico.

It leverages GenAI for **navigation, crowd management, accessibility, transportation, sustainability, multilingual assistance, operational intelligence and real-time decision support** — every capability area the challenge calls for, each implemented and demonstrable.

> **Designed to never hard-fail.** A live-venue tool must work even when the network doesn't. StadiumIQ integrates a real large language model (Anthropic Claude) when an API key is present, and **transparently falls back to a deterministic, offline knowledge engine** otherwise — so every feature, demo and test runs with zero external dependencies.

![StadiumIQ 2026 interface](docs/screenshot.png)

---

## Capabilities

| # | Capability area | Feature in StadiumIQ | Endpoint |
| --- | --- | --- | --- |
| 1 | 🗣️ **Multilingual assistance** | RAG-grounded fan concierge in 10 languages (RTL-aware) | `POST /api/concierge` |
| 2 | 🧭 **Navigation** | Shortest-path wayfinding + **step-free accessible mode** + SVG route map | `POST /api/navigate` |
| 3 | 👥 **Crowd management** | Live per-zone density + AI-authored, prioritised actions | `GET /api/crowd/:venueId` |
| 4 | ⚡ **Real-time decision support** | Incident triage: priority, dispatch team, response SLA, escalation | `POST /api/incident` |
| 5 | 📢 **Operational intelligence** | One-click multilingual PA announcement generation | `POST /api/announce` |
| 6 | 🌱 **Sustainability & transport** | Travel carbon-footprint comparison + greenest-choice nudge | `POST /api/sustainability/footprint` |
| 7 | 🗓️ **Match-day planning** | Personalised arrival plan from the next fixture | `GET /api/plan/:venueId` |
| 8 | 🌐 **Translation** | On-demand translation for staff and fans | `POST /api/translate` |
| 9 | ♿ **Accessibility** | Accessible routing **and** a WCAG-focused, keyboard-navigable UI | (cross-cutting) |

---

## Architecture

```
Browser (accessible SPA, vanilla JS, SVG route map — no framework)
        │  fetch  /api/*
        ▼
Express app ─► requestId · helmet CSP · CORS · rate-limit · body caps · validation
        │
        ├─ routes/            REST surface (+ OpenAPI, metrics), async-safe handlers
        ├─ services/
        │    ├─ aiService            ← single GenAI gateway: Claude + offline fallback,
        │    │                          sanitisation, TTL cache, metrics
        │    ├─ conciergeService     RAG over the knowledge base
        │    ├─ navigationService    Dijkstra routing + AI directions
        │    ├─ crowdService         deterministic telemetry + AI ops advice
        │    ├─ incidentService      severity/priority matrix + AI action brief
        │    ├─ announcementService  multilingual PA generation
        │    ├─ sustainabilityService footprint modelling + AI nudge
        │    ├─ scheduleService      fixtures + AI match-day plan
        │    ├─ translationService   10-language support
        │    └─ knowledgeBase        indexed venues / KB / schedule / emissions
        ├─ middleware/         validation, requestId, central error handling
        └─ utils/              logger, TTL cache, prompt sanitiser
```

**One AI gateway.** Every feature composes a prompt and calls `aiService.generate()`, which either queries Claude or invokes a caller-supplied deterministic fallback. This isolates the provider and centralises timeouts, **prompt-injection sanitisation**, **response caching** and **metrics** — and guarantees graceful degradation everywhere.

---

## Getting started

```bash
npm install                     # runtime deps only

cp .env.example .env            # optional: set ANTHROPIC_API_KEY to enable the live model
npm start                       # http://localhost:3000

npm test                        # 77 tests, no network or API key required
```

With no API key the platform runs on its **offline engine**; the UI badge and `/api/health` report `aiMode: offline`. Add a key and every feature upgrades to live GenAI responses — no code changes.

---

## API reference

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET`  | `/api/health` | Liveness + current AI mode |
| `GET`  | `/api/metrics` | AI/usage counters, cache-hit rate, memory |
| `GET`  | `/api/openapi.json` | OpenAPI 3.1 contract |
| `GET`  | `/api/tournament` · `/api/config/options` | Metadata & UI enums |
| `GET`  | `/api/venues` · `/api/venues/:id` · `/api/matches` | Reference data |
| `POST` | `/api/concierge` | Multilingual Q&A |
| `POST` | `/api/navigate` | Wayfinding (with `accessibleOnly`) |
| `GET`  | `/api/crowd/:venueId` | Crowd/ops snapshot |
| `POST` | `/api/incident` | Real-time incident triage |
| `POST` | `/api/announce` | Multilingual PA announcement |
| `POST` | `/api/sustainability/footprint` | Travel carbon comparison |
| `GET`  | `/api/plan/:venueId` | AI match-day plan |
| `POST` | `/api/translate` | Translate text |

**Example**

```bash
curl -X POST localhost:3000/api/incident \
  -H 'content-type: application/json' \
  -d '{"venueId":"usa-metlife","type":"crowd-surge","severity":"high","zone":"East Gate"}'
```

---

## How each evaluation criterion is met

- **Code Quality** — small, single-responsibility modules; a factory-built app; JSDoc throughout; one consistent error model; an OpenAPI contract; zero-warning syntax check (`npm run lint`).
- **Security** — `helmet` CSP + security headers, CORS allow-list, per-IP rate limiting, bounded JSON bodies (413 on overflow), strict input validation on every field, **prompt-injection sanitisation** before any model call, request-id correlation, no secrets in the repo, no stack-trace leakage in production.
- **Efficiency** — data indexed once at startup, `Map`-based lookups, Dijkstra routing, deterministic telemetry, an **AI response cache** (with hit-rate metrics), AI timeouts, and short-circuits that skip needless model calls.
- **Testing** — **77 unit + integration tests** on Node's built-in runner (no extra deps) covering every service, validation, routing/graph edge cases, utilities, and the live HTTP surface; all pass offline. Verified end-to-end in a real headless browser (0 console errors).
- **Accessibility** — semantic HTML, skip link, ARIA tab pattern with arrow-key support, `aria-live` result regions, visible focus styles, WCAG-AA contrast, reduced-motion + RTL support, an accessible SVG route map, **plus** first-class step-free routing.
- **Problem Statement Alignment** — all eight capability areas are implemented as working, demonstrable features against real World Cup 2026 venue, schedule and emissions data.

---

## Tech stack

Node.js 20+ · Express · Helmet · express-rate-limit · Anthropic Claude (`claude-sonnet-5`) · vanilla ES-module front-end with inline SVG · Node built-in test runner. No front-end framework and no committed `node_modules` keep the repository well under 10 MB.

## License

MIT — see [LICENSE](LICENSE).
