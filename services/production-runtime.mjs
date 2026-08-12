import { createProductionBoundaries } from "./production-boundaries.mjs";

const SERVICE_NAMES = Object.freeze([
  "evidence",
  "transactions",
  "projection",
  "workflow",
]);
const registeredServices = new WeakMap();
const registeredServiceSets = new WeakMap();
const registeredRuntimeConfigs = new WeakMap();

function fail(message) {
  throw new Error(message);
}

export function createProductionService(repository) {
  if (arguments.length !== 1)
    fail("production service requires exactly 1 repository");
  const service = Object.freeze(Object.create(null));
  registeredServices.set(service, repository);
  return service;
}

export function createProductionServiceSet(
  evidence,
  transactions,
  projection,
  workflow,
) {
  if (arguments.length !== 4)
    fail("production service set requires exactly 4 services");
  const values = Object.freeze([evidence, transactions, projection, workflow]);
  const serviceSet = Object.freeze(
    Object.assign(
      Object.create(null),
      Object.fromEntries(
        SERVICE_NAMES.map((name, index) => [name, values[index]]),
      ),
    ),
  );
  registeredServiceSets.set(serviceSet, values);
  return serviceSet;
}

export function createProductionRuntimeConfig(
  boundarySet,
  serviceSet,
  mode = "production",
) {
  if (arguments.length !== 2 && arguments.length !== 3)
    fail("production runtime configuration requires exactly 2 or 3 values");
  if (mode !== "production" && mode !== "reference-test")
    fail("production runtime mode is invalid");
  const config = Object.freeze(Object.create(null));
  registeredRuntimeConfigs.set(
    config,
    Object.freeze({ boundarySet, serviceSet, mode }),
  );
  return config;
}

export function createProductionRuntime(config) {
  if (arguments.length !== 1)
    fail("production runtime requires exactly 1 registered configuration");
  const values = registeredRuntimeConfigs.get(config);
  if (!values) fail("registered production runtime configuration is required");
  const boundaries = createProductionBoundaries(values.boundarySet);
  const services = registeredServiceSets.get(values.serviceSet);
  if (!services || services.some((service) => !registeredServices.has(service)))
    fail("registered production services are required");
  if (
    values.mode === "production" &&
    services.some(
      (service) => registeredServices.get(service) !== boundaries.postgres,
    )
  ) {
    fail(
      "production services must be wired to the injected postgres repository",
    );
  }
  return Object.freeze({
    boundaries,
    services: values.serviceSet,
    mode: values.mode,
  });
}
