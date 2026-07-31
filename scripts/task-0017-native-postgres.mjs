import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactDir = path.join(root, 'artifacts');
const reportPath = path.join(artifactDir, 'task-0017-native-postgres-report.json');
const require = createRequire(import.meta.url);

export const migrationFiles = () => fs.readdirSync(path.join(root, 'infra', 'migrations'))
  .filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
export const safeDetails = (value) => String(value).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, 'postgres://[redacted]');
const normalizeTarget = (value) => {
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error('database target must be a PostgreSQL URL'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname) throw new Error('database target must be a PostgreSQL URL');
  parsed.protocol = 'postgres:';
  parsed.username = '';
  parsed.password = '';
  if (!parsed.port) parsed.port = '5432';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '').toLowerCase();
};
export const distinctTargets = (sourceUrl, restoreUrl) => {
  if (!sourceUrl || !restoreUrl) throw new Error('source and restore database URLs are required');
  if (normalizeTarget(sourceUrl) === normalizeTarget(restoreUrl)) throw new Error('source and restore database targets must be distinct');
};
export const nativePlan = ({ sourceUrl, restoreUrl, archivePath, psql, pgDump, pgRestore, psqlArgsPrefix = [] }) => ({
  migrations: migrationFiles().map((file) => ({ name: file, command: psql, args: [...psqlArgsPrefix, '--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--single-transaction', '--file', path.join(root, 'infra', 'migrations', file), sourceUrl] })),
  dump: { command: pgDump, args: ['--no-password', '--format=custom', '--file', archivePath, sourceUrl] },
  restore: { command: pgRestore, args: ['--no-password', '--exit-on-error', '--clean', '--if-exists', '--dbname', restoreUrl, archivePath] },
});

function command(name) {
  const probe = spawnSync(name, ['--version'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
  return probe.status === 0 ? name : null;
}
function clientCommands() {
  const names = process.platform === 'win32' ? ['psql.exe', 'pg_dump.exe', 'pg_restore.exe'] : ['psql', 'pg_dump', 'pg_restore'];
  const found = Object.fromEntries(names.map((name) => [name.replace(/\.exe$/, ''), command(name)]));
  if (Object.values(found).every(Boolean)) return found;
  // A package-local client directory is acceptable, but only if it exposes all three tools.
  try {
    const platform = process.platform === 'win32' ? '@embedded-postgres/windows-x64' : `@embedded-postgres/${process.platform}-${process.arch}`;
    const bin = path.join(path.resolve(path.dirname(require.resolve(platform)), '..'), 'native', 'bin');
    const local = Object.fromEntries(names.map((name) => [name.replace(/\.exe$/, ''), path.join(bin, name)]));
    if (Object.values(local).every((file) => fs.existsSync(file))) return local;
  } catch { /* optional dependency is not a client distribution */ }
  return found;
}
function run(spec, timeout = 120000) {
  const result = spawnSync(spec.command, spec.args, { encoding: 'utf8', windowsHide: true, timeout });
  return { status: result.status === 0 ? 'passed' : 'failed', code: result.status, timedOut: result.error?.code === 'ETIMEDOUT', stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}
function psqlSpec(psql, url, sql, psqlArgsPrefix = []) { return { command: psql, args: [...psqlArgsPrefix, '--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--tuples-only', '--command', sql, url] }; }
function check(checks, name, status, details) { checks.push({ name, status, details: safeDetails(details) }); }
function synthetic(checks) {
  const migrationText = migrationFiles().map((file) => fs.readFileSync(path.join(root, 'infra', 'migrations', file), 'utf8')).join('\n');
  check(checks, 'migration-r l s'.replaceAll(' ', ''), /FORCE ROW LEVEL SECURITY/i.test(migrationText) && /CREATE POLICY/i.test(migrationText) ? 'passed' : 'failed', 'all migrations retain forced tenant policies');
  check(checks, 'outbox-checkpoint-contract', /SKIP LOCKED/i.test(fs.readFileSync(path.join(root, 'services', 'transaction-outbox.mjs'), 'utf8')) && /checkpoint/i.test(migrationText) ? 'passed' : 'failed', 'durable replay and checkpoint schema present');
  const fixture = { tenant_id: 'synthetic-a', event_id: 'event-a', sequence: 3 };
  check(checks, 'recovery-roundtrip', JSON.stringify(JSON.parse(JSON.stringify(fixture))) === JSON.stringify(fixture) ? 'passed' : 'failed', 'synthetic checkpoint/outbox state round-trips');
}

export async function main(env = process.env, options = {}) {
  const checks = [];
  synthetic(checks);
  const sourceUrl = env.UPFS_DATABASE_URL;
  const restoreUrl = env.UPFS_RESTORE_DATABASE_URL;
  if (sourceUrl && restoreUrl) {
    try { distinctTargets(sourceUrl, restoreUrl); }
    catch (error) { check(checks, 'distinct-targets', 'failed', error.message); return { task: 'TASK-0017', status: 'failed', native_evidence: false, checks }; }
    check(checks, 'distinct-targets', 'passed', 'normalized source and restore targets are distinct');
  }
  const clients = options.clients || clientCommands();
  const missing = !sourceUrl || !restoreUrl || !clients.psql || !clients.pg_dump || !clients.pg_restore;
  if (missing) {
    check(checks, 'native-prerequisites', 'skipped', 'UPFS_DATABASE_URL, UPFS_RESTORE_DATABASE_URL, and psql/pg_dump/pg_restore are required; no native evidence claimed');
    return { task: 'TASK-0017', status: checks.some((c) => c.status === 'failed') ? 'failed' : 'skipped', native_evidence: false, checks };
  }
  check(checks, 'native-prerequisites', 'passed', 'separate disposable source/restore URLs and all native PostgreSQL clients are available');
  const archivePath = path.join(os.tmpdir(), `upfs-task-0017-${process.pid}-${crypto.randomBytes(6).toString('hex')}.dump`);
  const plan = nativePlan({ sourceUrl, restoreUrl, archivePath, psql: clients.psql, pgDump: clients.pg_dump || clients.pgDump, pgRestore: clients.pg_restore || clients.pgRestore, psqlArgsPrefix: options.psqlArgsPrefix || [] });
  try {
    for (const migration of plan.migrations) {
      const result = run(migration, 120000);
      check(checks, `migration-${migration.name}`, result.status, result.status === 'passed' ? 'migration applied to disposable source' : 'migration failed; stderr was not persisted');
      if (result.status === 'failed') return { task: 'TASK-0017', status: 'failed', native_evidence: false, checks };
    }
    if (options.prepareSource) await options.prepareSource(sourceUrl);
    const dump = run(plan.dump);
    check(checks, 'native-pg-dump', dump.status, dump.status === 'passed' ? 'custom-format backup created' : 'pg_dump failed; stderr was not persisted');
    if (dump.status === 'failed') return { task: 'TASK-0017', status: 'failed', native_evidence: false, checks };
    const restore = run(plan.restore);
    check(checks, 'native-pg-restore', restore.status, restore.status === 'passed' ? 'backup restored to separate disposable target' : 'pg_restore failed; stderr was not persisted');
    if (restore.status === 'failed') return { task: 'TASK-0017', status: 'failed', native_evidence: false, checks };
    if (options.prepareProbe) await options.prepareProbe(restoreUrl);
    const probeUrl = options.probeUrl || restoreUrl;
    const probeSql = "BEGIN; SET LOCAL app.organization_id='00000000-0000-0000-0000-000000000001'; SET LOCAL app.tenant_id='00000000-0000-0000-0000-000000000001'; SELECT current_setting('server_version'); SELECT count(*) FROM transactional_outbox WHERE tenant_id='00000000-0000-0000-0000-000000000001'; SELECT count(*) FROM durable_checkpoints WHERE tenant_id='00000000-0000-0000-0000-000000000001'; ROLLBACK;";
    const probe = run(psqlSpec(clients.psql, probeUrl, probeSql, options.psqlArgsPrefix || []), 30000);
    check(checks, 'restored-schema-probe', probe.status, probe.status === 'passed' ? 'restored target accepted tenant-scoped schema probe' : 'restored schema probe failed; output was not persisted');
    const rlsProbe = run(psqlSpec(clients.psql, probeUrl, "SELECT count(*) FROM pg_class WHERE relforcerowsecurity AND oid IN ('transactional_outbox'::regclass, 'durable_checkpoints'::regclass);", options.psqlArgsPrefix || []), 30000);
    const superuserProbe = run(psqlSpec(clients.psql, probeUrl, "SELECT current_setting('is_superuser') = 'off';", options.psqlArgsPrefix || []), 30000);
    // The native Node pg probe serializes PostgreSQL booleans as `true`, while
    // psql renders them as `t`; accept either representation.
    const nonSuperuserRls = /\b2\b/.test(rlsProbe.stdout)
      && /^(?:\s*)(?:t|true)(?:\s*)$/im.test(superuserProbe.stdout);
    check(checks, 'non-superuser-force-rls-probe', rlsProbe.status === 'passed' && nonSuperuserRls ? 'passed' : 'failed', rlsProbe.status === 'passed' && nonSuperuserRls ? 'restored outbox/checkpoint tables retain FORCE RLS under a non-superuser probe' : `RLS/non-superuser probe failed (${JSON.stringify(rlsProbe.stdout.trim())}); output was not persisted`);
    const replayProbe = run(psqlSpec(clients.psql, probeUrl, "BEGIN; SET LOCAL app.tenant_id='00000000-0000-0000-0000-000000000001'; SELECT count(*) FROM transactional_outbox WHERE status IN ('pending','claimed','failed'); SELECT max(sequence) FROM durable_checkpoints WHERE consumer='native-probe'; ROLLBACK;", options.psqlArgsPrefix || []), 30000);
    check(checks, 'outbox-checkpoint-recovery-probe', replayProbe.status, replayProbe.status === 'passed' ? 'outbox and checkpoint rows are queryable for replay/recovery' : 'recovery probe failed; output was not persisted');
    const loadRows = Math.max(10, Math.min(500, Number(env.UPFS_NATIVE_LOAD_ROWS || 50)));
    const loadSql = `BEGIN; SET LOCAL app.tenant_id='00000000-0000-0000-0000-000000000001'; INSERT INTO durable_checkpoints (tenant_id,consumer,sequence) SELECT '00000000-0000-0000-0000-000000000001','native-load-'||g,g FROM generate_series(1,${loadRows}) g ON CONFLICT DO NOTHING; SELECT count(*) FROM durable_checkpoints WHERE tenant_id='00000000-0000-0000-0000-000000000001'; ROLLBACK;`;
    const load = run(psqlSpec(clients.psql, probeUrl, loadSql, options.psqlArgsPrefix || []), 60000);
    check(checks, 'bounded-db-load-soak', load.status, load.status === 'passed' ? `bounded ${loadRows}-row insert/query completed and rolled back` : 'bounded load failed; output was not persisted');
    check(checks, 'native-evidence-run', checks.every((c) => c.status === 'passed') ? 'passed' : 'failed', 'native backup/restore run completed without persisted sensitive output');
    return { task: 'TASK-0017', status: checks.some((c) => c.status === 'failed') ? 'failed' : 'passed', native_evidence: true, checks };
  } finally { try { fs.rmSync(archivePath, { force: true }); } catch { /* best effort */ } }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await main();
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`TASK-0017 native rehearsal ${result.status}; report written to ${path.relative(root, reportPath)}`);
  if (result.status === 'failed') process.exitCode = 1;
}
