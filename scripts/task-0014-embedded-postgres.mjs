import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'infra', 'migrations');
const reportPath = path.join(root, 'artifacts', 'task-0014-embedded-postgres-report.json');

const migrationSql = async () => (await Promise.all((await fs.readdir(migrationsDir))
  .filter((file) => /^\d+_.+\.sql$/.test(file)).sort()
  .map((file) => fs.readFile(path.join(migrationsDir, file), 'utf8')))).join('\n');

const result = { task: 'TASK-0014', runner: 'embedded-postgres', status: 'skipped', checks: [] };
const record = (name, status, details) => result.checks.push({ name, status, details });

function portFor(offset) {
  return 54000 + ((process.pid + offset * 997) % 1000);
}

async function main() {
  let EmbeddedPostgres;
  try {
    ({ default: EmbeddedPostgres } = await import('embedded-postgres'));
  } catch (error) {
    record('embedded-runtime', 'skipped', `embedded-postgres is unavailable: ${error.message}`);
    return result;
  }
  if (typeof EmbeddedPostgres !== 'function') {
    record('embedded-runtime', 'skipped', 'embedded-postgres did not expose its documented constructor');
    return result;
  }

  const directories = [];
  const clusters = [];
  try {
    for (let index = 0; index < 2; index += 1) {
      const databaseDir = await fs.mkdtemp(path.join(os.tmpdir(), `upfs-embedded-${process.pid}-${index}-`));
      directories.push(databaseDir);
      const cluster = new EmbeddedPostgres({
        databaseDir,
        port: portFor(index),
        user: 'postgres',
        password: 'upfs-test-only',
        persistent: false,
        onLog: () => {},
        onError: () => {},
      });
      await cluster.initialise();
      await cluster.start();
      clusters.push(cluster);
    }
    record('embedded-runtime', 'passed', 'two isolated temporary PostgreSQL clusters started');
    const source = clusters[0].getPgClient();
    const restore = clusters[1].getPgClient();
    await source.connect();
    await restore.connect();
    try {
      await source.query(await migrationSql());
      record('embedded-migrations', 'passed', 'all repository migrations applied to the source cluster');
      const org = '00000000-0000-0000-0000-000000000001';
      const tenantA = '00000000-0000-0000-0000-00000000000a';
      const tenantB = '00000000-0000-0000-0000-00000000000b';
      const environment = '00000000-0000-0000-0000-0000000000ee';
      await source.query('INSERT INTO organizations (id, name) VALUES ($1, $2)', [org, 'synthetic-org']);
      await source.query('INSERT INTO tenants (id, organization_id, name) VALUES ($1, $2, $3), ($4, $2, $5)', [tenantA, org, 'synthetic-a', tenantB, 'synthetic-b']);
      await source.query('INSERT INTO environments (id, tenant_id, name) VALUES ($1, $2, $3)', [environment, tenantA, 'synthetic-env']);
      await source.query('INSERT INTO canonical_transactions (id, tenant_id, account_id, amount, currency, posted_at, schema_version) VALUES ($1, $2, $3, $4, $5, now(), $6), ($7, $8, $3, $4, $5, now(), $6)', ['a', tenantA, 'account', 1, 'USD', '1.0.0', 'b', tenantB]);
      await source.query("CREATE ROLE upfs_app LOGIN NOSUPERUSER PASSWORD 'upfs-app-test-only'");
      await source.query('GRANT USAGE ON SCHEMA public TO upfs_app');
      await source.query('GRANT SELECT ON canonical_transactions TO upfs_app');
      const { Client } = await import('pg');
      const app = new Client({ user: 'upfs_app', password: 'upfs-app-test-only', port: portFor(0), host: 'localhost', database: 'postgres' });
      await app.connect();
      await app.query('BEGIN');
      await app.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantA]);
      const visible = await app.query('SELECT id FROM canonical_transactions ORDER BY id');
      await app.query('COMMIT');
      await app.end();
      const rows = visible.rows;
      if (rows.length !== 1 || rows[0].id !== 'a') throw new Error('RLS returned a cross-tenant row or hid the scoped row');
      record('embedded-tenant-isolation', 'passed', 'FORCE RLS exposed only tenant-a data under an authorized tenant setting');
      const platformPackage = process.platform === 'win32' ? '@embedded-postgres/windows-x64' : `@embedded-postgres/${process.platform}-${process.arch}`;
      const binDir = path.resolve(path.dirname(require.resolve(platformPackage)), '..');
      const packageBin = path.join(binDir, 'native', 'bin');
      const dumpAvailable = await fs.access(path.join(packageBin, process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump')).then(() => true).catch(() => false);
      const restoreAvailable = await fs.access(path.join(packageBin, process.platform === 'win32' ? 'pg_restore.exe' : 'pg_restore')).then(() => true).catch(() => false);
      record('embedded-backup-restore', 'skipped', dumpAvailable && restoreAvailable ? 'client binaries are present; backup/restore is exercised by the primary client-based rehearsal' : 'embedded-postgres package does not ship pg_dump/pg_restore; external client evidence remains required');
    } finally {
      await source.end();
      await restore.end();
    }
    result.status = result.checks.some((check) => check.status === 'failed') ? 'failed' : 'passed';
  } catch (error) {
    record('embedded-execution', 'failed', error instanceof Error ? error.message : String(error));
  } finally {
    for (const cluster of clusters.reverse()) {
      try { await cluster.stop(); } catch { /* best effort shutdown */ }
    }
    for (const directory of directories) {
      try { await fs.rm(directory, { recursive: true, force: true }); } catch { /* best effort cleanup */ }
    }
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`TASK-0014 embedded rehearsal ${result.status}; report written to ${path.relative(root, reportPath)}`);
  if (result.status === 'failed') process.exitCode = 1;
}

export { main };
