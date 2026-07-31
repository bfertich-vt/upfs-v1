import test from "node:test";
import assert from "node:assert/strict";
import { createProductionBoundaries } from "./production-boundaries.mjs";

const adapter = (methods) => Object.fromEntries(methods.map((method) => [method, () => undefined]));

test("production boundaries fail closed when durable adapters are absent", () => {
  assert.throws(() => createProductionBoundaries(), /postgres adapter is required/);
  assert.throws(() => createProductionBoundaries({ postgres: adapter(["transaction", "health"]) }), /outbox adapter is required/);
});

test("production boundaries reject incomplete adapters and do not synthesize maps", () => {
  assert.throws(() => createProductionBoundaries({
    postgres: adapter(["transaction", "health"]),
    outbox: adapter(["append", "claim", "acknowledge"]),
    checkpoint: adapter(["load", "save"]),
  }), /outbox adapter must implement fail/);
});

test("production boundaries preserve injected durable implementations", () => {
  const postgres = adapter(["transaction", "health"]);
  const outbox = adapter(["append", "claim", "acknowledge", "fail"]);
  const checkpoint = adapter(["load", "save"]);
  const boundaries = createProductionBoundaries({ postgres, outbox, checkpoint });
  assert.equal(boundaries.postgres, postgres);
  assert.equal(boundaries.outbox, outbox);
  assert.equal(boundaries.checkpoint, checkpoint);
});
