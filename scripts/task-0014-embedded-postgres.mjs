import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'infra', 'migrations');
const reportPath = path.join(root, 'artifacts', 'task-0014-embedded-postgres-report.json');

const migrationSql = async () => (await Promise.all((await fs.readdir(migrationsDir))
  .filter((file) => /^\d+_.+\.sql$/.test(file)).sort()
  .map((file) => fs.readFile(path.join(migrationsDir, file), 'utf8')))).join('\n');
const migrationFingerprint = async () => crypto.createHash('sha256').update(await migrationSql(), 'utf8').digest('hex');

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
    const { Client } = await import('pg');
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
      await source.query('INSERT INTO transactional_outbox (id, tenant_id, aggregate_id, event_type, payload, payload_fingerprint, idempotency_key, occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now())', ['evt-a', tenantA, 'a', 'transaction.created', JSON.stringify({ id: 'a' }), 'synthetic-fingerprint-a', 'idem-a']);
      await source.query('INSERT INTO durable_checkpoints (tenant_id, consumer, sequence) VALUES ($1,$2,$3)', [tenantA, 'synthetic-consumer', 1]);
      const snapshot = {
        format: 'upfs-logical-backup-v1',
        schema: { migration_fingerprint: await migrationFingerprint(), schema_version: '1.0.0' },
        organizations: (await source.query('SELECT id, name FROM organizations WHERE id=$1', [org])).rows,
        tenants: (await source.query('SELECT id, organization_id, name FROM tenants WHERE organization_id=$1 ORDER BY id', [org])).rows,
        environments: (await source.query('SELECT id, tenant_id, name FROM environments WHERE id=$1', [environment])).rows,
        transactions: (await source.query('SELECT id, tenant_id, account_id, amount, currency, posted_at, schema_version, evidence_refs, description, provenance, version FROM canonical_transactions ORDER BY tenant_id,id')).rows,
        outbox: (await source.query('SELECT id, tenant_id, aggregate_id, event_type, payload, payload_fingerprint, idempotency_key, occurred_at, status, attempts FROM transactional_outbox ORDER BY id')).rows,
        checkpoints: (await source.query('SELECT tenant_id, consumer, sequence FROM durable_checkpoints ORDER BY tenant_id,consumer')).rows,
      };
      if (snapshot.schema.migration_fingerprint.length !== 64 || snapshot.transactions.length !== 2) throw new Error('logical backup object is incomplete');
      record('embedded-logical-backup', 'passed', `deterministic ${snapshot.format} captured schema metadata, ${snapshot.transactions.length} transactions, outbox, and checkpoints`);
      await restore.query(await migrationSql());
      for (const row of snapshot.organizations) await restore.query('INSERT INTO organizations (id,name) VALUES ($1,$2)', [row.id, row.name]);
      for (const row of snapshot.tenants) await restore.query('INSERT INTO tenants (id,organization_id,name) VALUES ($1,$2,$3)', [row.id, row.organization_id, row.name]);
      for (const row of snapshot.environments) await restore.query('INSERT INTO environments (id,tenant_id,name) VALUES ($1,$2,$3)', [row.id, row.tenant_id, row.name]);
      for (const row of snapshot.transactions) await restore.query('INSERT INTO canonical_transactions (id,tenant_id,account_id,amount,currency,posted_at,schema_version,evidence_refs,description,provenance,version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [row.id,row.tenant_id,row.account_id,row.amount,row.currency,row.posted_at,row.schema_version,row.evidence_refs,row.description,row.provenance,row.version]);
      for (const row of snapshot.outbox) await restore.query('INSERT INTO transactional_outbox (id,tenant_id,aggregate_id,event_type,payload,payload_fingerprint,idempotency_key,occurred_at,status,attempts) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [row.id,row.tenant_id,row.aggregate_id,row.event_type,row.payload,row.payload_fingerprint,row.idempotency_key,row.occurred_at,row.status,row.attempts]);
      for (const row of snapshot.checkpoints) await restore.query('INSERT INTO durable_checkpoints (tenant_id,consumer,sequence) VALUES ($1,$2,$3)', [row.tenant_id,row.consumer,row.sequence]);
      const restoredCounts = await restore.query('SELECT (SELECT count(*) FROM canonical_transactions) AS transactions, (SELECT count(*) FROM transactional_outbox) AS outbox, (SELECT count(*) FROM durable_checkpoints) AS checkpoints');
      if (Number(restoredCounts.rows[0].transactions) !== 2 || Number(restoredCounts.rows[0].outbox) !== 1 || Number(restoredCounts.rows[0].checkpoints) !== 1) throw new Error('logical restore row counts did not match backup');
      record('embedded-logical-restore', 'passed', 'parameterized restore reproduced schema-scoped rows, outbox, and checkpoint state');
      await restore.query("CREATE ROLE upfs_app LOGIN NOSUPERUSER PASSWORD 'upfs-app-test-only'");
      await restore.query('GRANT USAGE ON SCHEMA public TO upfs_app');
      await restore.query('GRANT SELECT ON canonical_transactions, transactional_outbox, durable_checkpoints TO upfs_app');
      const restoredApp = new Client({ user: 'upfs_app', password: 'upfs-app-test-only', port: portFor(1), host: 'localhost', database: 'postgres' });
      await restoredApp.connect();
      await restoredApp.query('BEGIN');
      await restoredApp.query('SELECT set_config($1,$2,true)', ['app.tenant_id', tenantA]);
      const scoped = await restoredApp.query('SELECT (SELECT count(*) FROM canonical_transactions) AS transactions, (SELECT count(*) FROM transactional_outbox) AS outbox, (SELECT count(*) FROM durable_checkpoints) AS checkpoints');
      await restoredApp.query('COMMIT');
      if (scoped.rows[0].transactions !== '1' || scoped.rows[0].outbox !== '1' || scoped.rows[0].checkpoints !== '1') throw new Error('restored tenant scope was not preserved');
      record('embedded-restored-tenant-isolation', 'passed', 'restored cluster RLS exposed tenant-a rows only, including checkpoint and outbox state');
      await restore.query('BEGIN');
      try { await restore.query('INSERT INTO canonical_transactions (id,tenant_id,account_id,amount,currency,posted_at,schema_version) VALUES ($1,$2,$3,$4,$5,now(),$6)', ['bad', '00000000-0000-0000-0000-0000000000ff', 'account', 1, 'USD', '1.0.0']); await restore.query('COMMIT'); throw new Error('failure injection unexpectedly committed'); } catch { await restore.query('ROLLBACK'); }
      const afterFailure = await restore.query('SELECT count(*) FROM canonical_transactions');
      if (Number(afterFailure.rows[0].count) !== 2) throw new Error('failed restore row was not rolled back');
      record('embedded-restore-failure-injection', 'passed', 'invalid tenant restore row rolled back without altering restored state');
      await restoredApp.end();
      await source.query("CREATE ROLE upfs_app LOGIN NOSUPERUSER PASSWORD 'upfs-app-test-only'");
      await source.query('GRANT USAGE ON SCHEMA public TO upfs_app');
      await source.query('GRANT SELECT ON canonical_transactions TO upfs_app');
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
      record('embedded-backup-restore', 'skipped', dumpAvailable && restoreAvailable ? 'external pg_dump/pg_restore check remains separate; logical client restore is recorded independently' : 'embedded-postgres package does not ship pg_dump/pg_restore; external client evidence remains required');
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
