/**
 * Explicit production persistence boundaries.
 *
 * Reference services may use maps for deterministic local tests, but production
 * construction must inject all three durable seams. There is intentionally no
 * fallback implementation here: missing dependencies fail closed.
 */

const REQUIRED_METHODS = Object.freeze({
  postgres: ["transaction", "health"],
  outbox: ["append", "claim", "acknowledge", "fail"],
  checkpoint: ["load", "save"],
});

function assertAdapter(name, adapter) {
  if (!adapter || typeof adapter !== "object") {
    throw new Error(`${name} adapter is required; in-memory fallback is disabled`);
  }
  for (const method of REQUIRED_METHODS[name]) {
    if (typeof adapter[method] !== "function") {
      throw new Error(`${name} adapter must implement ${method}()`);
    }
  }
}

export function createProductionBoundaries({ postgres, outbox, checkpoint } = {}) {
  assertAdapter("postgres", postgres);
  assertAdapter("outbox", outbox);
  assertAdapter("checkpoint", checkpoint);
  return Object.freeze({ postgres, outbox, checkpoint });
}

export const productionAdapterContract = Object.freeze(
  Object.fromEntries(Object.entries(REQUIRED_METHODS).map(([name, methods]) => [name, Object.freeze([...methods])])),
);
