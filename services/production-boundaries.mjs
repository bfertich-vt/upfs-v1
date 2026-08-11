/** Explicit, reference-level production persistence boundaries. */

const REQUIRED_METHODS = Object.freeze({
  postgres: Object.freeze(["transaction", "health"]),
  outbox: Object.freeze(["append", "claim", "acknowledge", "fail"]),
  checkpoint: Object.freeze(["load", "save"]),
});
const registeredAdapters = new WeakMap();
const registeredBoundarySets = new WeakMap();

function fail(message) {
  throw new Error(message);
}

export function createProductionAdapter(kind, ...implementations) {
  if (typeof kind !== "string" || !Object.hasOwn(REQUIRED_METHODS, kind))
    fail("unknown production adapter kind");
  const methods = REQUIRED_METHODS[kind];
  if (
    implementations.length !== methods.length ||
    implementations.some(
      (implementation) => typeof implementation !== "function",
    )
  ) {
    fail(
      `${kind} adapter requires exactly ${methods.length} function capabilities`,
    );
  }
  const adapter = Object.create(null);
  for (let index = 0; index < methods.length; index += 1) {
    Object.defineProperty(adapter, methods[index], {
      value: implementations[index],
      enumerable: true,
    });
  }
  Object.freeze(adapter);
  registeredAdapters.set(adapter, kind);
  return adapter;
}

export function createProductionBoundarySet(postgres, outbox, checkpoint) {
  const boundarySet = Object.freeze(
    Object.assign(Object.create(null), { postgres, outbox, checkpoint }),
  );
  registeredBoundarySets.set(
    boundarySet,
    Object.freeze({ postgres, outbox, checkpoint }),
  );
  return boundarySet;
}

export function createProductionBoundaries(boundarySet) {
  const values = registeredBoundarySets.get(boundarySet);
  if (!values) fail("registered production boundary set is required");
  for (const kind of ["postgres", "outbox", "checkpoint"]) {
    if (registeredAdapters.get(values[kind]) !== kind)
      fail(`registered ${kind} adapter is required`);
  }
  return Object.freeze(Object.assign(Object.create(null), values));
}

export const productionAdapterContract = Object.freeze(
  Object.fromEntries(
    Object.entries(REQUIRED_METHODS).map(([name, methods]) => [name, methods]),
  ),
);
