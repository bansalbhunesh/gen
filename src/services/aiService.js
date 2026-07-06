/**
 * Generative AI gateway.
 *
 * Wraps the Anthropic Claude Messages API behind a single `generate()` call.
 * The rest of the application never talks to the model directly — it composes
 * a prompt and asks this service for a completion. This gives us one place to
 * enforce timeouts, handle failures and, crucially, degrade gracefully:
 *
 *   • If `ANTHROPIC_API_KEY` is set, we call Claude for rich, context-aware
 *     natural-language answers.
 *   • If it is absent (or the call fails), we transparently fall back to a
 *     deterministic offline engine supplied by the caller, so the platform
 *     keeps working in demos, tests and connectivity-constrained venues.
 *
 * The graceful fallback is deliberate: an operations tool for a live stadium
 * must never hard-fail just because an upstream provider is unreachable.
 */
import config from '../config.js';
import logger from '../utils/logger.js';

const REQUEST_TIMEOUT_MS = 12_000;

/**
 * @typedef {Object} GenerateOptions
 * @property {string} system            System prompt describing the assistant's role.
 * @property {string} prompt            The user/context prompt.
 * @property {() => string} fallback    Deterministic offline responder (required).
 * @property {number} [maxTokens]       Optional per-call token cap.
 */

/**
 * Produce a text completion, preferring the live model and falling back to the
 * deterministic engine on any error or when no key is configured.
 * @param {GenerateOptions} options
 * @returns {Promise<{ text: string, source: 'model' | 'offline' }>}
 */
export async function generate({ system, prompt, fallback, maxTokens }) {
  if (typeof fallback !== 'function') {
    throw new TypeError('generate() requires a deterministic fallback function');
  }

  if (!config.ai.enabled) {
    return { text: fallback(), source: 'offline' };
  }

  try {
    const text = await callClaude({ system, prompt, maxTokens });
    return { text, source: 'model' };
  } catch (err) {
    logger.warn('AI provider call failed; using offline engine', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { text: fallback(), source: 'offline' };
  }
}

/**
 * Low-level Anthropic Messages API call with an enforced timeout.
 * @param {{ system: string, prompt: string, maxTokens?: number }} args
 * @returns {Promise<string>}
 */
async function callClaude({ system, prompt, maxTokens }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(config.ai.apiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.ai.apiKey,
        'anthropic-version': config.ai.apiVersion,
      },
      body: JSON.stringify({
        model: config.ai.model,
        max_tokens: maxTokens ?? config.ai.maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const detail = await safeReadError(response);
      throw new Error(`Anthropic API ${response.status}: ${detail}`);
    }

    const data = await response.json();
    const text = Array.isArray(data.content)
      ? data.content
          .filter((block) => block?.type === 'text')
          .map((block) => block.text)
          .join('')
          .trim()
      : '';

    if (!text) throw new Error('Empty completion from provider');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** @param {Response} response */
async function safeReadError(response) {
  try {
    const body = await response.json();
    return body?.error?.message || JSON.stringify(body).slice(0, 200);
  } catch {
    return response.statusText;
  }
}

export default { generate };
