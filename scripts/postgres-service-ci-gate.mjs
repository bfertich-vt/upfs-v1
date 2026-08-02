import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client } from "pg";
import { parseDocument } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "infra", "migrations");
const testConnection = Object.freeze({
  host: "127.0.0.1",
  port: 5432,
  database: "upfs_ci",
  user: "upfs_ci",
  password: "upfs-ci-test-only",
  connectionTimeoutMillis: 10_000,
});
export const taskId = "RECOVERY-CI-PG-NODE-RANGE-022";
export const fixedTestDatabaseUrl =
  "postgresql://upfs_ci:upfs-ci-test-only@127.0.0.1:5432/upfs_ci";

function rawPortNodeSource(workflowText, portsNode) {
  const range = portsNode?.range;
  if (
    !Array.isArray(range) ||
    range.length !== 3 ||
    !range.every(Number.isSafeInteger) ||
    range[0] < 0 ||
    range[0] > range[1] ||
    range[1] > range[2] ||
    range[2] > workflowText.length
  )
    throw new Error(
      "PostgreSQL CI service port AST node must expose a bounded source range",
    );

  // YAML's sequence-node range begins at the first list indicator, omitting
  // indentation. Expand only backward to that node's own source line: this
  // retains the exact lexical spelling without searching unrelated services.
  const lineStart = workflowText.lastIndexOf("\n", range[0] - 1) + 1;
  if (lineStart < 0 || lineStart > range[0])
    throw new Error(
      "PostgreSQL CI service port AST node source range cannot be located",
    );
  return workflowText.slice(lineStart, range[2]);
}

export function validateWorkflowPortBinding(workflowText) {
  const document = parseDocument(workflowText, {
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length)
    throw new Error(
      `PostgreSQL CI workflow must be valid YAML: ${document.errors.map((error) => error.message).join("; ")}`,
    );
  const workflow = document.toJS({ maxAliasCount: 100 });
  const service = workflow?.jobs?.["repository-validation"]?.services?.postgres;
  const migrationStep = workflow?.jobs?.["repository-validation"]?.steps?.find(
    (step) => step?.name === "Migration gate",
  );
  if (!Array.isArray(service?.ports) || service.ports.length !== 1)
    throw new Error(
      "PostgreSQL CI service must publish exactly one fixed 5432:5432 port mapping",
    );
  const portsNode = document.getIn(
    ["jobs", "repository-validation", "services", "postgres", "ports"],
    true,
  );
  const [mapping] = portsNode?.items ?? [];
  // The resolved JS value alone is insufficient: `!!str 5432:5432` resolves
  // to the same string as the one permitted literal. Keep the AST node until
  // all lexical and metadata assertions have completed.
  if (
    mapping?.constructor?.name !== "Scalar" ||
    mapping.type !== "PLAIN" ||
    mapping.tag !== undefined ||
    mapping.anchor !== undefined ||
    mapping.source !== "5432:5432" ||
    mapping.value !== "5432:5432"
  )
    throw new Error(
      "PostgreSQL CI service must publish exactly one ordinary untagged plain scalar 5432:5432 mapping",
    );
  if (rawPortNodeSource(workflowText, portsNode) !== "          - 5432:5432\n")
    throw new Error(
      "PostgreSQL CI service port source must contain exactly one canonical raw list item within its AST node range",
    );
  if (migrationStep?.env?.UPFS_TEST_DATABASE_URL !== fixedTestDatabaseUrl)
    throw new Error(
      "PostgreSQL CI migration URL must match the fixed loopback 127.0.0.1:5432 service",
    );
  return true;
}

export function validatedTestConnection(value) {
  if (!value)
    throw new Error(
      "UPFS_TEST_DATABASE_URL is required for the disposable PostgreSQL migration gate",
    );
  // URL() normalizes bare `?` and `#` delimiters to empty search/hash values.
  // Reject them in the original token before parsing so no override syntax is
  // silently accepted. Encoded delimiters are rejected too: this boundary
  // accepts only fixed disposable-service connection components.
  if (/[?#]/.test(value) || /%(?:3f|23)/i.test(value))
    throw new Error(
      "UPFS_TEST_DATABASE_URL must not contain query or fragment connection overrides",
    );
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("UPFS_TEST_DATABASE_URL must be a valid PostgreSQL URL");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("UPFS_TEST_DATABASE_URL must use a PostgreSQL URL");
  if (url.search || url.hash)
    throw new Error(
      "UPFS_TEST_DATABASE_URL must not contain query or fragment connection overrides",
    );
  if (
    url.hostname !== testConnection.host ||
    url.port !== String(testConnection.port) ||
    url.pathname !== `/${testConnection.database}` ||
    url.username !== testConnection.user ||
    url.password !== testConnection.password
  )
    throw new Error(
      "UPFS_TEST_DATABASE_URL must target exactly the disposable loopback service",
    );
  return { ...testConnection };
}

export function createTestClient(value, ClientClass = Client) {
  return new ClientClass(validatedTestConnection(value));
}

async function migrations() {
  const names = (await fs.readdir(migrationsDir))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();
  if (!names.length)
    throw new Error("no executable repository migrations were found");
  return Promise.all(
    names.map(async (name) => ({
      name,
      sql: await fs.readFile(path.join(migrationsDir, name), "utf8"),
    })),
  );
}

function applicationConnection() {
  return {
    ...testConnection,
    user: "upfs_ci_app",
    password: "upfs-ci-app-test-only",
  };
}

export async function runPostgresServiceGate({
  databaseUrl = process.env.UPFS_TEST_DATABASE_URL,
  ClientClass = Client,
  loadMigrations = migrations,
} = {}) {
  const checks = [];
  const record = (name, status, details) =>
    checks.push({ name, status, details });
  let admin;
  let app;
  try {
    admin = createTestClient(databaseUrl, ClientClass);
  } catch (error) {
    record("disposable-postgres-boundary", "failed", error.message);
    return {
      task: taskId,
      runner: "postgres-service",
      status: "failed",
      checks,
    };
  }
  try {
    await admin.connect();
    await admin.query("SELECT 1");
    record(
      "disposable-postgres-connectivity",
      "passed",
      "fixed loopback-only disposable PostgreSQL service accepted the dedicated test principal",
    );
    for (const migration of await loadMigrations())
      await admin.query(migration.sql);
    record(
      "repository-migrations",
      "passed",
      "all executable repository migrations applied to the disposable service",
    );

    const org = "00000000-0000-0000-0000-000000000001";
    const tenantA = "00000000-0000-0000-0000-00000000000a";
    const tenantB = "00000000-0000-0000-0000-00000000000b";
    await admin.query("INSERT INTO organizations (id,name) VALUES ($1,$2)", [
      org,
      "ci-org",
    ]);
    await admin.query(
      "INSERT INTO tenants (id,organization_id,name) VALUES ($1,$2,$3),($4,$2,$5)",
      [tenantA, org, "ci-a", tenantB, "ci-b"],
    );
    await admin.query(
      "INSERT INTO canonical_transactions (id,tenant_id,account_id,amount,currency,posted_at,schema_version) VALUES ($1,$2,$3,$4,$5,now(),$6),($7,$8,$3,$4,$5,now(),$6)",
      ["ci-a", tenantA, "ci-account", 1, "USD", "1.0.0", "ci-b", tenantB],
    );
    await admin.query(
      "DO $$ BEGIN CREATE ROLE upfs_ci_app LOGIN NOSUPERUSER PASSWORD 'upfs-ci-app-test-only'; EXCEPTION WHEN duplicate_object THEN ALTER ROLE upfs_ci_app PASSWORD 'upfs-ci-app-test-only'; END $$",
    );
    await admin.query("GRANT USAGE ON SCHEMA public TO upfs_ci_app");
    await admin.query("GRANT SELECT ON canonical_transactions TO upfs_ci_app");
    app = new ClientClass(applicationConnection());
    await app.connect();
    const unscoped = await app.query(
      "SELECT id FROM canonical_transactions ORDER BY id",
    );
    if (unscoped.rows.length !== 0)
      throw new Error("unscoped application principal observed tenant data");
    await app.query("BEGIN");
    try {
      await app.query("SELECT set_config($1,$2,true)", [
        "app.tenant_id",
        tenantA,
      ]);
      const scoped = await app.query(
        "SELECT id FROM canonical_transactions ORDER BY id",
      );
      if (scoped.rows.length !== 1 || scoped.rows[0].id !== "ci-a")
        throw new Error("tenant scope did not isolate canonical transactions");
      await app.query("COMMIT");
    } catch (error) {
      await app.query("ROLLBACK").catch(() => {});
      throw error;
    }
    record(
      "tenant-isolation",
      "passed",
      "unscoped access was denied and tenant-a scope observed only tenant-a data",
    );
    return {
      task: taskId,
      runner: "postgres-service",
      status: "passed",
      checks,
    };
  } catch (error) {
    record(
      "postgres-service-execution",
      "failed",
      error instanceof Error
        ? error.message.replace(
            /postgres(?:ql)?:\/\/[^\s]+/gi,
            "[redacted database URL]",
          )
        : "disposable PostgreSQL execution failed",
    );
    return {
      task: taskId,
      runner: "postgres-service",
      status: "failed",
      checks,
    };
  } finally {
    await app?.end().catch(() => {});
    await admin?.end().catch(() => {});
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const result = await runPostgresServiceGate();
  console.log(
    `${taskId} disposable PostgreSQL migration gate ${result.status}; ${result.checks.map((check) => `${check.name}:${check.status}`).join(", ")}`,
  );
  if (result.status !== "passed") process.exitCode = 1;
}
