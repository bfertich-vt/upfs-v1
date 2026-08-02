import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createTestClient,
  fixedTestDatabaseUrl,
  runPostgresServiceGate,
  taskId,
  validateWorkflowPortBinding,
  validatedTestConnection,
} from "./postgres-service-ci-gate.mjs";

const safeUrl = fixedTestDatabaseUrl;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = path.join(root, ".github", "workflows", "validate.yml");

test("PostgreSQL CI service publishes the exact fixed loopback port used by migration gate", async () => {
  const workflow = await fs.readFile(workflowPath, "utf8");
  assert.equal(validateWorkflowPortBinding(workflow), true);
  assert.throws(() =>
    validateWorkflowPortBinding(workflow.replace("- 5432:5432", "- 6543:5432")),
  );
  assert.throws(() =>
    validateWorkflowPortBinding(workflow.replace("- 5432:5432", "- 0:5432")),
  );
  assert.throws(() =>
    validateWorkflowPortBinding(workflow.replace("- 5432:5432\n", "")),
  );
  assert.throws(() =>
    validateWorkflowPortBinding(
      workflow.replace("- 5432:5432", "- 5432:5432\n          - 6543:5432"),
    ),
  );
  for (const malformed of [
    "5432:5432:123",
    '"5432:5432:123"',
    "5432:5432/tcp",
    '"5432:5432/tcp"',
    "5432-5432:5432",
    "5432:5432-5433",
    '" 5432:5432"',
    '"5432:5432 "',
    "[5432:5432]",
    "{host: 5432, container: 5432}",
    "${POSTGRES_PORT}:5432",
    "!!str 5432:5432",
    "!local 5432:5432",
    "!<tag:example.test,2026:port> 5432:5432",
    '"5432:5432"',
    "'5432:5432'",
    "&fixedPort 5432:5432",
  ]) {
    assert.throws(
      () =>
        validateWorkflowPortBinding(workflow.replace("5432:5432", malformed)),
      `must reject malformed PostgreSQL CI port mapping ${malformed}`,
    );
  }
  assert.throws(() =>
    validateWorkflowPortBinding(
      workflow.replace(
        "- 5432:5432",
        "- &fixedPort 5432:5432\n          - *fixedPort",
      ),
    ),
  );
  assert.throws(() =>
    validateWorkflowPortBinding(
      workflow.replace(":5432/upfs_ci", ":6543/upfs_ci"),
    ),
  );
});

test("disposable PostgreSQL gate constructs pg client only from fixed loopback components", () => {
  const client = createTestClient(safeUrl);
  assert.equal(client.connectionParameters.host, "127.0.0.1");
  assert.equal(client.connectionParameters.port, 5432);
  assert.equal(client.connectionParameters.database, "upfs_ci");
  assert.equal(client.connectionParameters.user, "upfs_ci");
});

for (const value of [
  undefined,
  "postgresql://upfs_ci:upfs-ci-test-only@db.example:5432/upfs_ci",
  "postgresql://upfs_ci:upfs-ci-test-only@localhost:5432/upfs_ci",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5433/upfs_ci",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/production",
  "postgresql://other:upfs-ci-test-only@127.0.0.1:5432/upfs_ci",
  "postgresql://upfs_ci:wrong@127.0.0.1:5432/upfs_ci",
  "https://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci?host=db.example",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci?",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci#",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci?#",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci?%23",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci%3F",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci%23",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci%3f%23",
  "postgresql://upfs_ci%3F:upfs-ci-test-only@127.0.0.1:5432/upfs_ci",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci?host=%2Ftmp%2Fevil",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci?%68ost=db.example",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci?hostaddr=203.0.113.1",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci?port=6543",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1,db.example:5432/upfs_ci",
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci#host=db.example",
]) {
  test(`disposable PostgreSQL gate rejects target override ${String(value)}`, () =>
    assert.throws(() => validatedTestConnection(value)));
}

class FakeClient {
  constructor(options) {
    this.options = options;
    this.rows = [];
  }

  async connect() {}

  async end() {}

  async query(sql) {
    if (sql === "SELECT id FROM canonical_transactions ORDER BY id")
      return { rows: this.scoped ? this.rows : [] };
    if (sql === "SELECT set_config($1,$2,true)") this.scoped = true;
    return { rows: [] };
  }
}

test("every PostgreSQL gate result records only the current task identity", async () => {
  const boundary = await runPostgresServiceGate({ databaseUrl: undefined });
  assert.equal(boundary.task, taskId);
  assert.equal(boundary.task, "RECOVERY-CI-PG-YAML-TAG-020");

  class FailingClient extends FakeClient {
    async connect() {
      throw new Error("synthetic connectivity failure");
    }
  }
  const execution = await runPostgresServiceGate({
    databaseUrl: safeUrl,
    ClientClass: FailingClient,
  });
  assert.equal(execution.task, taskId);

  const scopedRows = [{ id: "ci-a" }];
  let clients = 0;
  class PassingClient extends FakeClient {
    constructor(options) {
      super(options);
      clients += 1;
      if (clients === 2) this.rows = scopedRows;
    }
  }
  const success = await runPostgresServiceGate({
    databaseUrl: safeUrl,
    ClientClass: PassingClient,
    loadMigrations: async () => [{ name: "001_test.sql", sql: "SELECT 1" }],
  });
  assert.equal(success.status, "passed");
  assert.equal(success.task, taskId);

  for (const result of [boundary, execution, success]) {
    assert.equal(
      JSON.stringify(result).includes("RECOVERY-CI-PG-URL-BINDING-015"),
      false,
    );
    assert.equal(
      JSON.stringify(result).includes("RECOVERY-CI-PG-LEXICAL-BINDING-016"),
      false,
    );
    assert.equal(
      JSON.stringify(result).includes("RECOVERY-CI-PG-IDENTITY-017"),
      false,
    );
    assert.equal(
      JSON.stringify(result).includes("RECOVERY-CI-PG-PORT-PARSER-019"),
      false,
    );
  }
});
