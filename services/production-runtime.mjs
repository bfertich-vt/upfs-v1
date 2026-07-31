import { createProductionBoundaries } from "./production-boundaries.mjs";

/**
 * Production composition root. Durable adapters and API services are explicit
 * inputs; reference in-memory services are intentionally not constructed here.
 */
export function createProductionRuntime({ postgres, outbox, checkpoint, services, mode = "production" } = {}) {
  const boundaries = createProductionBoundaries({ postgres, outbox, checkpoint });
  if (!services || typeof services !== "object") {
    throw new Error("production services are required; reference in-memory services are test-only");
  }
  const required = ["evidence", "transactions", "projection", "workflow"];
  for (const name of required) {
    if (!services[name] || typeof services[name] !== "object") {
      throw new Error(`production service '${name}' must be injected`);
    }
  }
  if (mode !== "reference-test") {
    for (const name of required) {
      if (services[name].repository !== postgres) {
        throw new Error(`production service '${name}' must be wired to the injected postgres repository`);
      }
    }
  }
  return Object.freeze({ boundaries, services, mode });
}
