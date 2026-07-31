import { createProductionRuntime } from "../services/production-runtime.mjs";

const fn = () => undefined;
const adapter = (methods) => Object.fromEntries(methods.map((method) => [method, fn]));
const services = { evidence: {}, transactions: {}, projection: {}, workflow: {} };

const runtime = createProductionRuntime({
  postgres: adapter(["transaction", "health"]),
  outbox: adapter(["append", "claim", "acknowledge", "fail"]),
  checkpoint: adapter(["load", "save"]),
  services,
});
if (runtime.services !== services || runtime.boundaries.postgres === undefined) {
  throw new Error("production composition did not preserve injected seams");
}
console.log("Production composition check passed: injected durable seams and services invoked.");

