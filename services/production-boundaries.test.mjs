import test from "node:test";
import assert from "node:assert/strict";
import {
  createProductionAdapter,
  createProductionBoundarySet,
  createProductionBoundaries,
} from "./production-boundaries.mjs";
import {
  createProductionRuntime,
  createProductionRuntimeConfig,
  createProductionService,
  createProductionServiceSet,
} from "./production-runtime.mjs";

const fn = () => undefined;
const durable = () => {
  const postgres = createProductionAdapter("postgres", fn, fn);
  return {
    postgres,
    boundarySet: createProductionBoundarySet(
      postgres,
      createProductionAdapter("outbox", fn, fn, fn, fn),
      createProductionAdapter("checkpoint", fn, fn),
    ),
  };
};
const serviceSet = (repository) =>
  createProductionServiceSet(
    ...Array.from({ length: 4 }, () => createProductionService(repository)),
  );

test("production boundaries require registered complete durable capabilities", () => {
  assert.throws(() => createProductionAdapter("postgres", fn), /exactly 2/);
  assert.throws(() => createProductionAdapter("unknown", fn), /unknown/);
  assert.throws(
    () => createProductionBoundaries({}),
    /registered production boundary set/,
  );
  const { postgres, boundarySet } = durable();
  assert.equal(createProductionBoundaries(boundarySet).postgres, postgres);
});

test("production composition requires registered configuration, services, and repository wiring", () => {
  const { postgres, boundarySet } = durable();
  assert.throws(
    () => createProductionRuntime({}),
    /registered production runtime configuration/,
  );
  assert.throws(
    () =>
      createProductionRuntime(
        createProductionRuntimeConfig(boundarySet, {}, "production"),
      ),
    /registered production services/,
  );
  assert.throws(
    () =>
      createProductionRuntime(
        createProductionRuntimeConfig(boundarySet, serviceSet(null)),
      ),
    /wired to the injected postgres/,
  );
  const services = serviceSet(postgres);
  assert.equal(
    createProductionRuntime(
      createProductionRuntimeConfig(boundarySet, services),
    ).services,
    services,
  );
  assert.equal(
    createProductionRuntime(
      createProductionRuntimeConfig(
        boundarySet,
        serviceSet(null),
        "reference-test",
      ),
    ).mode,
    "reference-test",
  );
  assert.throws(
    () => createProductionRuntimeConfig(boundarySet, services, "test"),
    /mode is invalid/,
  );
});

test("hostile unregistered objects fail closed without invoking traps or accessors", () => {
  let traps = 0;
  const hostile = new Proxy(
    Object.create(null, {
      postgres: {
        get() {
          traps += 1;
          throw new Error("secret");
        },
      },
    }),
    {
      get() {
        traps += 1;
        throw new Error("secret");
      },
      ownKeys() {
        traps += 1;
        throw new Error("secret");
      },
      getPrototypeOf() {
        traps += 1;
        throw new Error("secret");
      },
    },
  );
  for (const invoke of [
    () => createProductionBoundaries(hostile),
    () => createProductionRuntime(hostile),
  ])
    assert.throws(invoke, /registered/, "bounded generic rejection");
  assert.equal(traps, 0);
});

test("closed factories reject wrong arity before touching hostile extra values", () => {
  let traps = 0;
  const hostile = new Proxy(Object.create(null), {
    get() {
      traps += 1;
      throw new Error("secret");
    },
    ownKeys() {
      traps += 1;
      throw new Error("secret");
    },
    getPrototypeOf() {
      traps += 1;
      throw new Error("secret");
    },
  });
  const oversized = "x".repeat(1024 * 1024);
  const circular = Object.create(null);
  circular.self = circular;
  const accessor = Object.create(null, {
    secret: {
      get() {
        traps += 1;
        throw new Error("secret");
      },
    },
  });
  const { postgres, boundarySet } = durable();
  const services = serviceSet(postgres);
  const config = createProductionRuntimeConfig(boundarySet, services);
  const cases = [
    [() => createProductionAdapter(), /unknown/],
    [() => createProductionAdapter("postgres", fn), /exactly 2/],
    [() => createProductionAdapter("postgres", fn, fn, hostile), /exactly 2/],
    [() => createProductionAdapter("checkpoint", fn, fn, accessor), /exactly 2/],
    [() => createProductionBoundarySet(), /exactly 3/],
    [() => createProductionBoundarySet(postgres, null, null, hostile), /exactly 3/],
    [() => createProductionService(), /exactly 1/],
    [() => createProductionService(postgres, hostile), /exactly 1/],
    [() => createProductionServiceSet(), /exactly 4/],
    [() => createProductionServiceSet(...Array(4).fill(null), hostile), /exactly 4/],
    [() => createProductionRuntimeConfig(), /exactly 2 or 3/],
    [() => createProductionRuntimeConfig(boundarySet, services, "production", hostile), /exactly 2 or 3/],
    [() => createProductionBoundaries(), /exactly 1/],
    [() => createProductionBoundaries(boundarySet, Symbol("extra")), /exactly 1/],
    [() => createProductionRuntime(), /exactly 1/],
    [() => createProductionRuntime(config, circular), /exactly 1/],
    [() => createProductionRuntime(config, oversized), /exactly 1/],
  ];
  for (const [invoke, pattern] of cases)
    assert.throws(invoke, pattern, "wrong arity rejects generically");
  assert.equal(traps, 0);

  assert.equal(createProductionBoundaries(boundarySet).postgres, postgres);
  assert.equal(createProductionRuntime(config).mode, "production");
});

test("capability tokens are immutable, closed, and non-substitutable", () => {
  const { postgres, boundarySet } = durable();
  assert.equal(Object.getPrototypeOf(postgres), null);
  assert.deepEqual(Object.keys(postgres), ["transaction", "health"]);
  assert.ok(Object.isFrozen(postgres));
  const fake = Object.freeze(Object.assign(Object.create(null), postgres));
  assert.throws(
    () =>
      createProductionBoundaries(
        createProductionBoundarySet(
          fake,
          createProductionBoundaries(boundarySet).outbox,
          createProductionBoundaries(boundarySet).checkpoint,
        ),
      ),
    /registered postgres/,
  );
});
