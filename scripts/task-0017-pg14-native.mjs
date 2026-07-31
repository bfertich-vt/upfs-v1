import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const packageVersion = '14.10.1-beta.11';
const dumpPackageVersion = '0.0.10';
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
  const tempRequire = createRequire(packageJson);
  try {
    const install = run(npm, [...npmArgs, 'install', '--prefix', temp, '--ignore-scripts=false', `embedded-postgres@${packageVersion}`, `pg-dump-restore-nodejs@${dumpPackageVersion}`], { timeout: 300000 });
    if (install.status !== 0) { check(checks, 'pg14-package-install', 'failed', `pinned package installation failed (${install.error?.code || install.status}); ${install.stderr || install.stdout || ''}`); return report('failed', checks); }
    const installed = JSON.parse(fs.readFileSync(path.join(temp, 'node_modules', 'embedded-postgres', 'package.json')));
    const dumpInstalled = JSON.parse(fs.readFileSync(path.join(temp, 'node_modules', 'pg-dump-restore-nodejs', 'package.json')));
    const lock = JSON.parse(fs.readFileSync(path.join(temp, 'package-lock.json')));
    const lockEntry = (name) => lock.packages?.[`node_modules/${name}`];
    const embeddedLock = lockEntry('embedded-postgres');
    const dumpLock = lockEntry('pg-dump-restore-nodejs');
    const integrityOkay = Boolean(embeddedLock?.integrity && dumpLock?.integrity);
    check(checks, 'pg14-package-integrity', installed.version === packageVersion && Boolean(embeddedLock?.integrity) ? 'passed' : 'failed', `embedded-postgres ${installed.version}; npm integrity ${embeddedLock?.integrity ? 'verified' : 'missing'}`);
    check(checks, 'pg14-dump-package-integrity', dumpInstalled.version === dumpPackageVersion && Boolean(dumpLock?.integrity) ? 'passed' : 'failed', `pg-dump-restore-nodejs ${dumpInstalled.version}; npm integrity ${dumpLock?.integrity ? 'verified' : 'missing'}`);
    if (installed.version !== packageVersion || dumpInstalled.version !== dumpPackageVersion || !integrityOkay) return report('failed', checks);
    const serverBinDir = path.join(temp, 'node_modules', packageName, 'native', 'bin');
    const dumpBinDir = path.join(temp, 'node_modules', 'pg-dump-restore-nodejs', 'bin', process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'macos' : 'linux', 'bin');
    const suffix = process.platform === 'win32' ? '.exe' : '';
    const tools = ['pg_dump', 'pg_restore'].map((name) => path.join(dumpBinDir, `${name}${suffix}`));
    if (!tools.every((tool) => fs.existsSync(tool))) { check(checks, 'pg14-client-tools', 'failed', 'pinned pg-dump-restore package did not expose pg_dump and pg_restore'); return report('failed', checks); }
    for (const tool of tools) {
      const version = run(tool, ['--version']);
      check(checks, `${path.basename(tool)}-version`, version.status === 0 && version.stdout.includes(` ${toolVersion}`) ? 'passed' : 'failed', version.stdout.trim() || 'version probe failed');
    }
    if (checks.some((item) => item.status === 'failed')) return report('failed', checks);
    const platformEntry = tempRequire.resolve(packageName);
    // The pinned beta's Windows ESM shim references CommonJS __dirname. Apply a
    // disposable compatibility patch after npm integrity verification so Node 24
    // can load the unmodified server binaries without changing repository code.
    const platformSource = fs.readFileSync(platformEntry, 'utf8');
    if (platformSource.includes('__dirname')) {
      fs.writeFileSync(platformEntry, `import { fileURLToPath } from 'node:url'; const __dirname = fileURLToPath(new URL('.', import.meta.url));\n${platformSource}`);
    }
    const modulePath = tempRequire.resolve('embedded-postgres');
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
      const helperPath = path.join(temp, 'node-pg-psql.cjs');
      const pgPath = tempRequire.resolve('pg');
      fs.writeFileSync(helperPath, `const fs=require('fs'); const {Client}=require(${JSON.stringify(pgPath)}); const args=process.argv.slice(2); const url=args.at(-1); const ci=args.indexOf('--command'); const fi=args.indexOf('--file'); const sql=ci>=0?args[ci+1]:fi>=0?fs.readFileSync(args[fi+1],'utf8'):''; const c=new Client({connectionString:url}); (async()=>{try{await c.connect();const result=await c.query(sql);const rows=Array.isArray(result)?result.flatMap(x=>x.rows||[]):(result.rows||[]);for(const row of rows) console.log(Object.values(row).join(' | '));await c.end();}catch(e){console.error('NODEPG',e.code||'',e.message||'');try{await c.end();}catch{}process.exitCode=1;}})();\n`);
      const pathEnv = `${dumpBinDir}${path.delimiter}${env.PATH || ''}`;
      const sourcePort = 55000 + (process.pid % 500); const restorePort = 55000 + ((process.pid + 97) % 500);
      const { main: nativeMain } = await import('./task-0017-native-postgres.mjs');
      const nativeEnv = { ...env, PATH: pathEnv, NODE_PATH: path.join(temp, 'node_modules'), UPFS_DATABASE_URL: `postgres://postgres:upfs-test-only@localhost:${sourcePort}/postgres`, UPFS_RESTORE_DATABASE_URL: `postgres://postgres:upfs-test-only@localhost:${restorePort}/postgres` };
      const { Client } = tempRequire('pg');
      const setup = async (url) => { const client = new Client({ connectionString: url }); await client.connect(); try { await client.query("CREATE ROLE upfs_probe LOGIN NOSUPERUSER PASSWORD 'upfs-probe-only'"); } catch (error) { if (error.code !== '42710') throw error; } await client.query("GRANT USAGE ON SCHEMA public TO upfs_probe"); await client.query("GRANT SELECT, INSERT ON organizations, tenants, environments, transactional_outbox, durable_checkpoints TO upfs_probe"); await client.end(); };
      const previous = { PATH: process.env.PATH, UPFS_DATABASE_URL: process.env.UPFS_DATABASE_URL, UPFS_RESTORE_DATABASE_URL: process.env.UPFS_RESTORE_DATABASE_URL };
      Object.assign(process.env, nativeEnv);
      const result = await nativeMain(nativeEnv, { clients: { psql: process.execPath, pg_dump: tools[0], pg_restore: tools[1] }, psqlArgsPrefix: [helperPath], prepareSource: async (url) => { const client = new Client({ connectionString: url }); await client.connect(); await client.query("INSERT INTO organizations (id,name) VALUES ('00000000-0000-0000-0000-000000000001','synthetic-org') ON CONFLICT DO NOTHING"); await client.query("INSERT INTO tenants (id,organization_id,name) VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','synthetic-tenant') ON CONFLICT DO NOTHING"); await client.query("INSERT INTO environments (id,tenant_id,name) VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','synthetic-env') ON CONFLICT DO NOTHING"); await client.end(); }, prepareProbe: async (url) => { await setup(url); }, probeUrl: `postgres://upfs_probe:upfs-probe-only@localhost:${restorePort}/postgres` });
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
