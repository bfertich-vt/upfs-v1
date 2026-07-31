import { createProductionRuntime } from "../services/production-runtime.mjs";

const fn = () => undefined;
const adapter = (methods) => Object.fromEntries(methods.map((method) => [method, fn]));
const services = Object.fromEntries(["evidence", "transactions", "projection", "workflow"].map((name) => [name, { repository: null }]));
for (const service of Object.values(services)) service.repository = null;
// Build the service graph only after the durable repository exists.
const postgres = adapter(["transaction", "health"]);
for (const service of Object.values(services)) service.repository = postgres;

const runtime = createProductionRuntime({
  postgres,
  outbox: adapter(["append", "claim", "acknowledge", "fail"]),
  checkpoint: adapter(["load", "save"]),
  services,
});
if (runtime.services !== services || runtime.boundaries.postgres === undefined) {
  throw new Error("production composition did not preserve injected seams");
}
console.log("Production composition check passed: injected durable seams and services invoked.");
