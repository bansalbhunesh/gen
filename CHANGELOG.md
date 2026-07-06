# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/).

## [1.0.0]

### Added — platform

- Multilingual AI concierge (10 languages, RTL-aware, RAG-grounded).
- In-stadium wayfinding with Dijkstra routing, a step-free accessible mode, and
  an accessible inline SVG route map (3 venue maps).
- Crowd & operational intelligence snapshots with AI-authored, prioritised
  recommendations.
- Real-time incident triage / decision support (priority matrix, dispatch team,
  response SLA, escalation, AI action brief).
- Multilingual PA announcement generator.
- Sustainability & transport carbon-footprint comparison.
- Smart match-day plan from the fixture schedule.
- On-demand translation.
- 7-panel accessible single-page client (no framework).

### Added — engineering

- Single AI gateway (Anthropic Claude) with a deterministic offline fallback,
  prompt-injection sanitisation, TTL response cache, and runtime metrics.
- Endpoints: `/api/health`, `/api/metrics`, `/api/openapi.json` (OpenAPI 3.1),
  `/api/config/options`, plus every feature route.
- Layered security: helmet CSP + HSTS + Permissions-Policy, CORS allow-list,
  two-tier rate limiting, bounded JSON bodies, JSON content-type enforcement,
  typed input validation with machine-readable error codes, and request-id
  correlation.

### Testing & tooling

- 100+ unit + integration tests on the Node built-in runner (~99% line
  coverage), including the AI gateway's live path via a stubbed `fetch`.
- Browser E2E suite with axe-core accessibility checks (WCAG 2.1 AA) in light
  and dark themes — zero violations.
- ESLint (flat config) + Prettier + EditorConfig; CI on Node 20 & 22.
