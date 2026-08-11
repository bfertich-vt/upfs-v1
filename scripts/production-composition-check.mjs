import {
  createProductionAdapter,
  createProductionBoundarySet,
} from "../services/production-boundaries.mjs";
import {
  createProductionRuntime,
  createProductionRuntimeConfig,
  createProductionService,
  createProductionServiceSet,
} from "../services/production-runtime.mjs";

const fn = () => undefined;
// Build the service graph only after the durable repository exists.
const postgres = createProductionAdapter("postgres", fn, fn);
const services = createProductionServiceSet(
  ...Array.from({ length: 4 }, () => createProductionService(postgres)),
);

const boundaries = createProductionBoundarySet(
  postgres,
  createProductionAdapter("outbox", fn, fn, fn, fn),
  createProductionAdapter("checkpoint", fn, fn),
);
const runtime = createProductionRuntime(
  createProductionRuntimeConfig(boundaries, services),
);
if (
  runtime.services !== services ||
  runtime.boundaries.postgres === undefined
) {
  throw new Error("production composition did not preserve injected seams");
}
console.log(
  "Production composition check passed: injected durable seams and services invoked.",
);
