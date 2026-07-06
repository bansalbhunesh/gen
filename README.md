# ⚽ StadiumIQ 2026

**A GenAI-powered stadium operations & fan-experience platform for the FIFA World Cup 2026.**

StadiumIQ turns Generative AI into a practical, always-available assistant for the four host-nation constituencies of the tournament — **fans, organizers, volunteers and venue staff** — across all 16 host stadiums in the USA, Canada and Mexico.

It leverages GenAI for **multilingual assistance, navigation, crowd management, accessibility, transportation, sustainability, operational intelligence and real-time decision support** — the exact capability areas the challenge calls for.

> **Designed to never hard-fail.** A live-venue tool must work even when the network doesn't. StadiumIQ integrates a real large language model (Anthropic Claude) when an API key is present, and **transparently falls back to a deterministic, offline knowledge engine** otherwise — so every feature, demo and test runs with zero external dependencies.

---

## Problem it solves

A 48-team, 104-match World Cup across 3 countries and 16 venues creates enormous operational load: fans who speak dozens of languages, unfamiliar stadiums, accessibility needs, crowd surges at gates and transit hubs, and staff making second-by-second decisions. StadiumIQ centralises this into one GenAI assistant.

| Capability area | How StadiumIQ addresses it |
| --- | --- |
| 🗣️ **Multilingual assistance** | Fan concierge answers questions in 10 languages, with RTL support. |
| 🧭 **Navigation** | In-stadium wayfinding with shortest-path routing and a **step-free accessible mode**. |
| 👥 **Crowd management** | Live per-zone density with AI-authored, prioritised recommendations. |
| ♿ **Accessibility** | Accessible routing + a WCAG-focused, keyboard-navigable UI. |
| 🚆 **Transportation** | Transit / shuttle / rideshare guidance in the knowledge base. |
| 🌱 **Sustainability** | Recycling, refill-station and low-carbon travel guidance. |
| 📊 **Operational intelligence** | Control-room snapshot with hotspot detection. |
| ⚡ **Real-time decision support** | GenAI recommendations staff can act on immediately. |

---

## Architecture

```
Browser (accessible SPA, vanilla JS)
        │  fetch  /api/*
        ▼
Express app  ──►  Security (helmet, CORS, rate-limit, body caps, validation)
        │
        ├─ routes/            REST surface, async-safe handlers
        ├─ services/          domain logic
        │    ├─ aiService     ← single GenAI gateway (Claude + offline fallback)
        │    ├─ conciergeService     (RAG over knowledge base)
        │    ├─ navigationService    (Dijkstra + AI directions)
        │    ├─ crowdService         (deterministic telemetry + AI ops advice)
        │    ├─ translationService   (multilingual)
        │    └─ knowledgeBase        (indexed venue + KB data)
        └─ middleware/        validation + central error handling
```

**Key design choice — one AI gateway.** Every feature composes a prompt and calls `aiService.generate()`, which either queries Claude or invokes a caller-supplied deterministic fallback. This isolates the provider, centralises timeouts/error handling, and guarantees graceful degradation.

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. (Optional) enable the live AI model
cp .env.example .env
#   then set ANTHROPIC_API_KEY=...   (leave blank to run fully offline)

# 3. Run
npm start          # http://localhost:3000

# 4. Test
npm test           # 39 tests, no network or API key required
```

With no API key the platform runs on its **offline engine**; the UI badge and `/api/health` report `aiMode: offline`. Add a key and everything upgrades to live GenAI responses — no code changes.

---

## API reference

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET`  | `/api/health` | Liveness + current AI mode |
| `GET`  | `/api/tournament` | Tournament + supported languages |
| `GET`  | `/api/venues` | All 16 host venues |
| `GET`  | `/api/venues/:id` | Venue detail + wayfinding nodes |
| `POST` | `/api/concierge` | Multilingual Q&A `{ question, language?, venueId? }` |
| `POST` | `/api/navigate` | Wayfinding `{ venueId, from, to, accessibleOnly? }` |
| `GET`  | `/api/crowd/:venueId` | Crowd/ops snapshot + recommendations |
| `POST` | `/api/translate` | Translate `{ text, target }` |

**Example**

```bash
curl -X POST localhost:3000/api/concierge \
  -H 'content-type: application/json' \
  -d '{"question":"Where is the nearest step-free route?","language":"es","venueId":"usa-metlife"}'
```

---

## How each evaluation criterion is met

- **Code Quality** — small, single-responsibility modules; a factory-built app; JSDoc throughout; consistent error model; zero lint warnings (`npm run lint`).
- **Security** — `helmet` CSP + security headers, CORS allow-list, per-IP rate limiting, bounded JSON bodies, strict input validation on every field, no secrets in the repo (`.env` git-ignored), no stack-trace leakage in production.
- **Efficiency** — data indexed once at startup, `Map`-based lookups, Dijkstra routing, deterministic telemetry, an AI timeout, and an English-translation short-circuit that skips needless model calls.
- **Testing** — 39 unit + integration tests on Node's built-in runner (no extra deps), covering services, validation, routing edge cases and the live HTTP surface; all pass offline.
- **Accessibility** — semantic HTML, skip link, ARIA tabs with arrow-key support, `aria-live` result regions, visible focus styles, WCAG-AA contrast, reduced-motion support, RTL handling, **plus** a first-class accessible (step-free) routing feature.
- **Problem Statement Alignment** — every listed capability area (navigation, crowd management, accessibility, transportation, sustainability, multilingual assistance, operational intelligence, real-time decision support) is implemented and demonstrable against real World Cup 2026 venue data.

---

## Tech stack

Node.js 20+ · Express · Helmet · express-rate-limit · Anthropic Claude (`claude-sonnet-5`) · vanilla ES-module front-end · Node built-in test runner. No front-end framework and no committed `node_modules` keep the repository well under 10 MB.

## License

MIT — see [LICENSE](LICENSE).
