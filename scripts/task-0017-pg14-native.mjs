import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageVersion = '14.10.1-beta.11';
const toolVersion = '14.9';

const run = (command, args, options = {}) => spawnSync(command, args, { encoding: 'utf8', windowsHide: true, ...options });
const npm = process.platform === 'win32' ? process.execPath : 'npm';
const npmArgs = process.platform === 'win32' ? [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')] : [];
const packageName = process.platform === 'win32' ? '@embedded-postgres/windows-x64' : `@embedded-postgres/${process.platform}-${process.arch}`;

function report(status, checks) { return { task: 'TASK-0017', runner: 'pg14-native-pairing', status, native_evidence: status === 'passed', checks }; }
function check(checks, name, status, details) { checks.push({ name, status, details: String(details).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, 'postgres://[redacted]') }); }

export async function main(env = process.env) {
  const checks = [];
  if (env.UPFS_RUN_PG14_NATIVE !== '1') {
    check(checks, 'pg14-opt-in', 'skipped', 'set UPFS_RUN_PG14_NATIVE=1 to permit network download and native disposable-cluster execution');
    return report('skipped', checks);
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'upfs-pg14-native-'));
  const packageJson = path.join(temp, 'package.json');
  fs.writeFileSync(packageJson, JSON.stringify({ private: true }));
  try {
    const install = run(npm, [...npmArgs, 'install', '--prefix', temp, '--no-package-lock', '--ignore-scripts=false', `embedded-postgres@${packageVersion}`], { timeout: 300000 });
    if (install.status !== 0) { check(checks, 'pg14-package-install', 'failed', `pinned package installation failed (${install.error?.code || install.status}); ${install.stderr || install.stdout || ''}`); return report('failed', checks); }
    const installed = JSON.parse(fs.readFileSync(path.join(temp, 'node_modules', 'embedded-postgres', 'package.json')));
    check(checks, 'pg14-package-integrity', installed.version === packageVersion ? 'passed' : 'failed', `embedded-postgres package version ${installed.version}`);
    if (installed.version !== packageVersion) return report('failed', checks);
    const binDir = path.join(temp, 'node_modules', packageName, 'native', 'bin');
    const suffix = process.platform === 'win32' ? '.exe' : '';
    const tools = ['pg_dump', 'pg_restore', 'psql'].map((name) => path.join(binDir, `${name}${suffix}`));
    if (!tools.every((tool) => fs.existsSync(tool))) { check(checks, 'pg14-client-tools', 'failed', 'pinned package did not expose all native client tools'); return report('failed', checks); }
    for (const tool of tools) {
      const version = run(tool, ['--version']);
      check(checks, `${path.basename(tool)}-version`, version.status === 0 && version.stdout.includes(` ${toolVersion}`) ? 'passed' : 'failed', version.stdout.trim() || 'version probe failed');
    }
    if (checks.some((item) => item.status === 'failed')) return report('failed', checks);
    const modulePath = require.resolve(path.join(temp, 'node_modules', 'embedded-postgres'));
    const { default: EmbeddedPostgres } = await import(pathToFileURL(modulePath));
    const clusters = [];
    const dirs = [];
    try {
      for (let i = 0; i < 2; i += 1) {
        const databaseDir = fs.mkdtempSync(path.join(os.tmpdir(), `upfs-pg14-cluster-${process.pid}-${i}-`));
        dirs.push(databaseDir);
        const cluster = new EmbeddedPostgres({ databaseDir, port: 55000 + ((process.pid + i * 97) % 500), user: 'postgres', password: 'upfs-test-only', persistent: false, onLog: () => {}, onError: () => {} });
        await cluster.initialise(); await cluster.start(); clusters.push(cluster);
      }
      check(checks, 'pg14-disposable-clusters', 'passed', 'two isolated PostgreSQL 14 disposable clusters started');
      const pathEnv = `${binDir}${path.delimiter}${env.PATH || ''}`;
      const sourcePort = 55000 + (process.pid % 500); const restorePort = 55000 + ((process.pid + 97) % 500);
      const { main: nativeMain } = await import('./task-0017-native-postgres.mjs');
      const nativeEnv = { ...env, PATH: pathEnv, UPFS_DATABASE_URL: `postgres://postgres:upfs-test-only@localhost:${sourcePort}/postgres`, UPFS_RESTORE_DATABASE_URL: `postgres://postgres:upfs-test-only@localhost:${restorePort}/postgres` };
      const previous = { PATH: process.env.PATH, UPFS_DATABASE_URL: process.env.UPFS_DATABASE_URL, UPFS_RESTORE_DATABASE_URL: process.env.UPFS_RESTORE_DATABASE_URL };
      Object.assign(process.env, nativeEnv);
      const result = await nativeMain(nativeEnv);
      if (previous.PATH === undefined) delete process.env.PATH; else process.env.PATH = previous.PATH;
      for (const key of ['UPFS_DATABASE_URL', 'UPFS_RESTORE_DATABASE_URL']) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
      checks.push(...result.checks.filter((item) => !checks.some((existing) => existing.name === item.name)));
      return report(result.status === 'passed' ? 'passed' : 'failed', checks);
    } finally {
      for (const cluster of clusters.reverse()) await Promise.resolve(cluster.stop()).catch(() => {});
      for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
    }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] || '')).href) {
  const result = await main(); fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'artifacts', 'task-0017-pg14-native-report.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(`TASK-0017 PG14 native pairing ${result.status}`); if (result.status === 'failed') process.exitCode = 1;
}
