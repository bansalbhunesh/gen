/**
 * Tiny, dependency-free request validation helpers.
 *
 * Rather than pull in a schema library, we expose small validators that assert
 * shape, coerce safe types, and enforce length limits. This keeps untrusted
 * input from reaching the services and caps the size of anything forwarded to
 * the AI provider (a cost and abuse-mitigation control).
 */

/** Maximum length for any free-text field forwarded to the model. */
export const MAX_TEXT_LENGTH = 500;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

/**
 * Require a non-empty string within the allowed length.
 * @param {unknown} value @param {string} field @param {number} [max]
 * @returns {string}
 */
export function requireString(value, field, max = MAX_TEXT_LENGTH) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${field}" is required and must be a non-empty string`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new ValidationError(`"${field}" must be ${max} characters or fewer`);
  }
  return trimmed;
}

/**
 * Optional string with the same safety limits.
 * @param {unknown} value @param {string} field @param {number} [max]
 * @returns {string|undefined}
 */
export function optionalString(value, field, max = MAX_TEXT_LENGTH) {
  if (value === undefined || value === null || value === '') return undefined;
  return requireString(value, field, max);
}

/**
 * Require a value from a fixed allow-list.
 * @param {unknown} value @param {string} field @param {ReadonlyArray<string>} allowed
 * @returns {string}
 */
export function requireEnum(value, field, allowed) {
  const str = requireString(value, field, 64);
  if (!allowed.includes(str)) {
    throw new ValidationError(`"${field}" must be one of: ${allowed.join(', ')}`);
  }
  return str;
}

export { ValidationError };
