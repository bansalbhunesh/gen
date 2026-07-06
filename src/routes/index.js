/**
 * API router. Mounts every feature route under a single versioned prefix and
 * provides the shared async-handler wrapper so route bodies can `await`
 * services without repetitive try/catch.
 */
import { Router } from 'express';
import { ask } from '../services/conciergeService.js';
import { route as findRoute } from '../services/navigationService.js';
import { snapshot } from '../services/crowdService.js';
import { translate, LANGUAGES, RTL_LANGUAGES } from '../services/translationService.js';
import { venues, tournament, getVenue, getZoneGraph } from '../services/knowledgeBase.js';
import { requireString, optionalString, requireEnum } from '../middleware/validate.js';
import config from '../config.js';

/** Wrap an async handler so rejected promises reach the error middleware. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const router = Router();

// --- Health & metadata -----------------------------------------------------
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    aiMode: config.ai.enabled ? 'model' : 'offline',
    uptimeSeconds: Math.round(process.uptime()),
  });
});

router.get('/tournament', (req, res) => {
  res.json({ tournament, languages: LANGUAGES, rtlLanguages: RTL_LANGUAGES });
});

// --- Venues ----------------------------------------------------------------
router.get('/venues', (req, res) => {
  res.json({ count: venues.length, venues });
});

router.get('/venues/:id', (req, res) => {
  const venue = getVenue(req.params.id);
  if (!venue) return res.status(404).json({ error: `Unknown venue "${req.params.id}"` });
  const graph = getZoneGraph(venue.id);
  const wayfindingNodes = graph
    ? graph.nodes.map(({ id, label, type }) => ({ id, label, type }))
    : [];
  res.json({ venue, hasWayfinding: Boolean(graph), wayfindingNodes });
});

// --- Multilingual concierge (GenAI) ---------------------------------------
router.post(
  '/concierge',
  wrap(async (req, res) => {
    const question = requireString(req.body?.question, 'question');
    const language = optionalString(req.body?.language, 'language', 8);
    const venueId = optionalString(req.body?.venueId, 'venueId', 64);
    const result = await ask({ question, language, venueId });
    res.json(result);
  }),
);

// --- Wayfinding / navigation (GenAI) --------------------------------------
router.post(
  '/navigate',
  wrap(async (req, res) => {
    const venueId = requireString(req.body?.venueId, 'venueId', 64);
    const from = requireString(req.body?.from, 'from', 64);
    const to = requireString(req.body?.to, 'to', 64);
    const accessibleOnly = Boolean(req.body?.accessibleOnly);
    const result = await findRoute({ venueId, from, to, accessibleOnly });
    res.json(result);
  }),
);

// --- Crowd & operational intelligence (GenAI) -----------------------------
router.get(
  '/crowd/:venueId',
  wrap(async (req, res) => {
    const timeBucket = optionalString(req.query?.t, 't', 32);
    const result = await snapshot({ venueId: req.params.venueId, timeBucket });
    res.json(result);
  }),
);

// --- Translation (GenAI) ---------------------------------------------------
router.post(
  '/translate',
  wrap(async (req, res) => {
    const text = requireString(req.body?.text, 'text');
    const target = requireEnum(req.body?.target, 'target', LANGUAGES);
    const result = await translate({ text, target });
    res.json(result);
  }),
);

export default router;
