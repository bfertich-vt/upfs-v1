import assert from "node:assert/strict";
import test from "node:test";
import { runEmbeddedPostgresGate } from "./embedded-postgres-ci-gate.mjs";

test("embedded CI gate rejects skipped, failed, and missing execution results", async () => {
  for (const result of [
    { status: "skipped" },
    { status: "failed" },
    undefined,
  ]) {
    await assert.rejects(runEmbeddedPostgresGate(async () => result));
  }
});
