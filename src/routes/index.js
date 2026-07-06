/**
 * API router. Mounts every feature route under a single versioned prefix and
 * provides the shared async-handler wrapper so route bodies can `await`
 * services without repetitive try/catch. All input passes through the
 * validators in ../middleware/validate.js before reaching a service.
 */
import { Router } from 'express';
import { ask } from '../services/conciergeService.js';
import { route as findRoute } from '../services/navigationService.js';
import { snapshot } from '../services/crowdService.js';
import { translate, LANGUAGES, RTL_LANGUAGES } from '../services/translationService.js';
import { footprint } from '../services/sustainabilityService.js';
import { triage, INCIDENT_TYPES, SEVERITIES } from '../services/incidentService.js';
import { announce, SCENARIOS } from '../services/announcementService.js';
import { listMatches, planMatchDay } from '../services/scheduleService.js';
import { metrics } from '../services/aiService.js';
import {
  venues,
  tournament,
  getVenue,
  getZoneGraph,
  emissionModes,
} from '../services/knowledgeBase.js';
import {
  ApiError,
  requireString,
  optionalString,
  requireEnum,
  requireNumber,
  optionalNumber,
  optionalStringArray,
  toBoolean,
} from '../middleware/validate.js';
import { openapi } from './openapi.js';
import config from '../config.js';

/** Wrap an async handler so rejected promises reach the error middleware. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const router = Router();

// --- Health, metrics & metadata -------------------------------------------
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    aiMode: config.ai.enabled ? 'model' : 'offline',
    uptimeSeconds: Math.round(process.uptime()),
  });
});

router.get('/metrics', (req, res) => {
  const total = metrics.modelCalls + metrics.offlineCalls + metrics.cacheHits;
  res.json({
    ai: { ...metrics },
    totalGenerations: total,
    cacheHitRate: total ? Number((metrics.cacheHits / total).toFixed(3)) : 0,
    uptimeSeconds: Math.round(process.uptime()),
    memoryMB: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1)),
  });
});

router.get('/tournament', (req, res) => {
  res.json({ tournament, languages: LANGUAGES, rtlLanguages: RTL_LANGUAGES });
});

router.get('/openapi.json', (req, res) => res.json(openapi));

// --- Reference data --------------------------------------------------------
router.get('/venues', (req, res) => {
  res.json({ count: venues.length, venues });
});

router.get('/venues/:id', (req, res) => {
  const venue = getVenue(req.params.id);
  if (!venue) throw new ApiError(`Unknown venue "${req.params.id}"`, 404, 'not_found');
  const graph = getZoneGraph(venue.id);
  const wayfindingNodes = graph
    ? graph.nodes.map(({ id, label, type }) => ({ id, label, type }))
    : [];
  res.json({ venue, hasWayfinding: Boolean(graph), wayfindingNodes });
});

router.get('/matches', (req, res) => {
  res.json({ count: listMatches().length, matches: listMatches() });
});

router.get('/transport/modes', (req, res) => {
  res.json({ modes: emissionModes });
});

router.get('/config/options', (req, res) => {
  res.json({
    languages: LANGUAGES,
    rtlLanguages: RTL_LANGUAGES,
    incidentTypes: INCIDENT_TYPES,
    severities: SEVERITIES,
    announcementScenarios: Object.keys(SCENARIOS),
    transportModes: emissionModes.map((m) => ({ id: m.id, label: m.label })),
  });
});

// --- Multilingual concierge (GenAI) ---------------------------------------
router.post(
  '/concierge',
  wrap(async (req, res) => {
    const question = requireString(req.body?.question, 'question');
    const language = optionalString(req.body?.language, 'language', 8);
    const venueId = optionalString(req.body?.venueId, 'venueId', 64);
    res.json(await ask({ question, language, venueId }));
  }),
);

// --- Wayfinding / navigation (GenAI) --------------------------------------
router.post(
  '/navigate',
  wrap(async (req, res) => {
    const venueId = requireString(req.body?.venueId, 'venueId', 64);
    const from = requireString(req.body?.from, 'from', 64);
    const to = requireString(req.body?.to, 'to', 64);
    const accessibleOnly = toBoolean(req.body?.accessibleOnly);
    res.json(await findRoute({ venueId, from, to, accessibleOnly }));
  }),
);

// --- Crowd & operational intelligence (GenAI) -----------------------------
router.get(
  '/crowd/:venueId',
  wrap(async (req, res) => {
    const timeBucket = optionalString(req.query?.t, 't', 32);
    res.json(await snapshot({ venueId: req.params.venueId, timeBucket }));
  }),
);

// --- Translation (GenAI) ---------------------------------------------------
router.post(
  '/translate',
  wrap(async (req, res) => {
    const text = requireString(req.body?.text, 'text');
    const target = requireEnum(req.body?.target, 'target', LANGUAGES);
    res.json(await translate({ text, target }));
  }),
);

// --- Sustainability & transport (GenAI) -----------------------------------
router.post(
  '/sustainability/footprint',
  wrap(async (req, res) => {
    const distanceKm = requireNumber(req.body?.distanceKm, 'distanceKm', { min: 0.1, max: 20_000 });
    const partySize = optionalNumber(req.body?.partySize, 'partySize', {
      min: 1,
      max: 60,
      integer: true,
    });
    const modes = optionalStringArray(req.body?.modes, 'modes');
    res.json(await footprint({ distanceKm, partySize, modes }));
  }),
);

// --- Real-time incident decision support (GenAI) --------------------------
router.post(
  '/incident',
  wrap(async (req, res) => {
    const type = requireEnum(req.body?.type, 'type', INCIDENT_TYPES);
    const severity = requireEnum(req.body?.severity, 'severity', SEVERITIES);
    const zone = optionalString(req.body?.zone, 'zone', 80);
    const detail = optionalString(req.body?.detail, 'detail', 500);
    const venueId = optionalString(req.body?.venueId, 'venueId', 64);
    res.json(await triage({ venueId, type, severity, zone, detail }));
  }),
);

// --- Multilingual PA announcements (GenAI) --------------------------------
router.post(
  '/announce',
  wrap(async (req, res) => {
    const message = optionalString(req.body?.message, 'message', 500);
    const scenario = optionalString(req.body?.scenario, 'scenario', 40);
    const languages = optionalStringArray(req.body?.languages, 'languages');
    res.json(await announce({ message, scenario, languages }));
  }),
);

// --- Match-day plan (GenAI) -----------------------------------------------
router.get(
  '/plan/:venueId',
  wrap(async (req, res) => {
    const travelMinutes = optionalNumber(req.query?.travelMinutes, 'travelMinutes', {
      min: 0,
      max: 480,
    });
    res.json(await planMatchDay({ venueId: req.params.venueId, travelMinutes }));
  }),
);

export default router;
