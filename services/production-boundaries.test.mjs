import test from "node:test";
import assert from "node:assert/strict";
import { createProductionBoundaries } from "./production-boundaries.mjs";
import { createProductionRuntime } from "./production-runtime.mjs";

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

test("production composition requires and preserves injected runtime services", () => {
  const durable = {
    postgres: adapter(["transaction", "health"]),
    outbox: adapter(["append", "claim", "acknowledge", "fail"]),
    checkpoint: adapter(["load", "save"]),
  };
  assert.throws(() => createProductionRuntime(durable), /production services are required/);
  const services = { evidence: {}, transactions: {}, projection: {}, workflow: {} };
  const runtime = createProductionRuntime({ ...durable, mode: "reference-test", services });
  assert.equal(runtime.services, services);
  assert.throws(() => createProductionRuntime({ ...durable, services: { evidence: {} } }), /must be injected/);
});

test("production runtime rejects map-backed services without repository wiring", () => {
  const postgres = adapter(["transaction", "health"]);
  const durable = { postgres, outbox: adapter(["append", "claim", "acknowledge", "fail"]), checkpoint: adapter(["load", "save"]) };
  const services = { evidence: {}, transactions: {}, projection: {}, workflow: {} };
  assert.throws(() => createProductionRuntime({ ...durable, services }), /wired to the injected postgres repository/);
  const wired = Object.fromEntries(Object.keys(services).map((name) => [name, { repository: postgres }]));
  assert.equal(createProductionRuntime({ ...durable, services: wired }).services, wired);
});
