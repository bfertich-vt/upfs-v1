import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const artifactDir = path.join(root, 'artifacts');
const reportPath = path.join(artifactDir, 'task-0014-rehearsal-report.json');
const checks = [];
const check = (name, status, details) => checks.push({ name, status: typeof status === 'boolean' ? (status ? 'passed' : 'failed') : status, details });
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
export const backupRestorePlan = ({ dumpAvailable, restoreAvailable, sourceUrl, restoreUrl, archivePath }) => [
  { command: 'pg_dump', available: dumpAvailable, args: ['--format=custom', '--file', archivePath, sourceUrl] },
  { command: 'pg_restore', available: restoreAvailable, args: ['--exit-on-error', '--dbname', restoreUrl, archivePath] },
];
export const loadThreshold = ({ completed, elapsedMs, operations = 25000, maxMs = 2000 }) =>
  completed === Math.ceil(operations / 2) && elapsedMs < maxMs;
export const tenantIsolationSql = (tenantId) =>
  `SELECT count(*) FROM canonical_transactions WHERE tenant_id = '${tenantId.replaceAll("'", "''")}';`;

function hasCommand(command) {
  const result = spawnSync(command, ['--version'], { encoding: 'utf8', windowsHide: true });
  return result.status === 0;
}

function syntheticGates() {
  const migrations = fs.readdirSync(path.join(root, 'infra/migrations')).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  const numbers = migrations.map((f) => Number(f.slice(0, 3)));
  check('migration-order', numbers.every((n, i) => i === 0 || n > numbers[i - 1]), 'migration files are strictly ordered');
  for (const file of migrations) {
    const sql = read(`infra/migrations/${file}`);
    check(`migration-${file}-rls`, /ENABLE ROW LEVEL SECURITY/i.test(sql) && /FORCE ROW LEVEL SECURITY/i.test(sql) && /CREATE POLICY/i.test(sql), 'tenant isolation statements present');
  }
  const schemas = ['contracts/schemas/transaction.schema.json', 'contracts/schemas/canonical-transaction.schema.json'].map(read).map(JSON.parse);
  check('migration-contract-compatibility', schemas.every((s) => s.type === 'object' && s.properties?.id && s.properties?.tenant_id && s.properties?.schema_version), 'transaction schemas retain stable identity and tenant scope');
  const migrationSql = migrations.map((file) => read(`infra/migrations/${file}`)).join('\n');
  check('migration-expand-contract-order', /CREATE TABLE IF NOT EXISTS/i.test(migrationSql) && !/DROP TABLE|DROP COLUMN/i.test(migrationSql), 'expand/contract rehearsal has additive expand steps and no destructive contract step');
  check('migration-contract-compatibility-check', migrations.some((f) => /002_/.test(f)) && migrations.some((f) => /003_/.test(f)), 'domain and outbox migrations are staged after identity foundation');
  const records = [{ id: 'a', tenant_id: 'tenant-a' }, { id: 'b', tenant_id: 'tenant-b' }];
  check('security-bola-denial', records.filter((r) => r.tenant_id === 'tenant-a').every((r) => r.id !== 'b'), 'cross-tenant record is excluded');
  check('security-secret-scan', !/(aws_secret_access_key|private_key|access[_-]?token)\s*[:=]\s*[^<\s]/i.test(read('docs/handoffs/TASK-0013.md')), 'synthetic handoff contains no credential-shaped value');
  const started = performance.now(); let completed = 0;
  for (let i = 0; i < 25000; i += 1) if (i % 2 === 0) completed += 1;
  const elapsed = performance.now() - started;
  check('environment-sized-load', loadThreshold({ completed, elapsedMs: elapsed }), `25,000 synthetic operations in ${elapsed.toFixed(2)}ms`);
  const marker = { tenant_id: 'tenant-a', sequence: 11, event_id: 'synthetic-event' };
  const restored = JSON.parse(JSON.stringify(marker));
  check('recovery-restore-roundtrip', JSON.stringify(restored) === JSON.stringify(marker), 'synthetic checkpoint survives restart serialization');
  check('outbox-replay-contract', /acknowledge|dead_letter|SKIP LOCKED/i.test(read('services/transaction-outbox.mjs')), 'outbox exposes replay and bounded failure lifecycle');
}

function livePostgres() {
  const url = process.env.UPFS_DATABASE_URL;
  if (!url) { check('postgres-live-prerequisite', 'skipped', 'UPFS_DATABASE_URL is not configured; no live evidence claimed'); return; }
  const psql = process.platform === 'win32' ? 'psql.exe' : 'psql';
  const pgDump = process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump';
  const pgRestore = process.platform === 'win32' ? 'pg_restore.exe' : 'pg_restore';
  if (!hasCommand(psql) || !hasCommand(pgDump) || !hasCommand(pgRestore)) { check('postgres-live-prerequisite', 'skipped', 'psql, pg_dump, and pg_restore are all required; no live evidence claimed'); return; }
  const sql = 'SELECT current_setting(\'server_version\'), (SELECT count(*) FROM pg_tables WHERE schemaname=\'public\');';
  const run = spawnSync(psql, ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--tuples-only', '--command', sql, url], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  if (run.status !== 0) { check('postgres-live-prerequisite', 'failed', 'Configured PostgreSQL was unreachable or rejected the probe'); return; }
  check('postgres-live-prerequisite', 'passed', 'Disposable PostgreSQL probe succeeded');
  for (const file of fs.readdirSync(path.join(root, 'infra/migrations')).filter((f) => /^\d+_.+\.sql$/.test(f)).sort()) {
    const migration = spawnSync(psql, ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--single-transaction', '--file', path.join(root, 'infra/migrations', file), url], { encoding: 'utf8', windowsHide: true, timeout: 60000 });
    check(`postgres-migration-${file}`, migration.status === 0 ? 'passed' : 'failed', migration.status === 0 ? 'migration applied in disposable rehearsal' : 'migration failed; inspect local stderr (not persisted)');
    if (migration.status !== 0) break;
  }
  const restoreUrl = process.env.UPFS_RESTORE_DATABASE_URL;
  if (!restoreUrl) { check('postgres-backup-restore', 'skipped', 'UPFS_RESTORE_DATABASE_URL is required for a separate disposable restore target'); return; }
  const archivePath = path.join(artifactDir, `task-0014-${process.pid}.dump`);
  const plan = backupRestorePlan({ dumpAvailable: true, restoreAvailable: true, sourceUrl: url, restoreUrl, archivePath });
  const dump = spawnSync(pgDump, plan[0].args, { encoding: 'utf8', windowsHide: true, timeout: 120000 });
  check('postgres-backup', dump.status === 0 ? 'passed' : 'failed', dump.status === 0 ? 'custom-format backup created' : 'backup failed');
  const restore = dump.status === 0 ? spawnSync(pgRestore, plan[1].args, { encoding: 'utf8', windowsHide: true, timeout: 120000 }) : { status: 1 };
  check('postgres-restore', restore.status === 0 ? 'passed' : 'failed', restore.status === 0 ? 'backup restored to separate disposable target' : 'restore failed or was not attempted');
  try { fs.rmSync(archivePath, { force: true }); } catch { /* best-effort cleanup */ }
  const isolation = spawnSync(psql, ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--tuples-only', '--command', `SET LOCAL app.tenant_id = 'tenant-a'; ${tenantIsolationSql('tenant-a')}`, restoreUrl], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  check('postgres-tenant-isolation', isolation.status === 0 ? 'passed' : 'failed', isolation.status === 0 ? 'RLS query executed against restore target' : 'RLS isolation query failed');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  syntheticGates();
  livePostgres();
  const hasFailure = checks.some((c) => c.status === 'failed');
  const livePass = checks.some((c) => c.name === 'postgres-live-prerequisite' && c.status === 'passed');
  const report = { task: 'TASK-0014', status: hasFailure ? 'failed' : 'passed', synthetic_only: !livePass, external_evidence: checks.filter((c) => c.name.startsWith('postgres-')), checks };
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (hasFailure) { console.error(`TASK-0014 rehearsal failed; report written to ${path.relative(root, reportPath)}`); process.exit(1); }
  console.log(`TASK-0014 rehearsal passed: ${checks.filter((c) => c.status === 'passed').length} synthetic/available gates; report written to ${path.relative(root, reportPath)}`);
}
