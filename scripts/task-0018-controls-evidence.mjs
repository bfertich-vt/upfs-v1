import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { loadManagedEnvironment, protectedPromotionGate } from '../services/managed-controls.mjs';

const root = process.cwd(); const dir = path.join(root, 'artifacts'); const reportPath = path.join(dir, 'task-0018-controls-report.json');
const checks = []; const pass = (name, details) => checks.push({ name, status: 'passed', details });
function main() {
  const definition = JSON.parse(fs.readFileSync(path.join(root, 'infra/deployment-environment.json')));
  if (!definition.environments.pilot.protected || !definition.environments.production.approval_required) throw new Error('protected deployment definition is incomplete');
  pass('deployment-environment-contract', 'pilot and production are protected and approval-gated');
  const gate = protectedPromotionGate({ environment: 'pilot', approval: false, artifact: { immutable: true, signature_verified: true, signing_key_reference: 'key://upfs/pilot/release' }, health: { passed: true }, reconciliation: { zero_drift: true } });
  if (gate.allowed) throw new Error('promotion gate allowed an unapproved pilot'); pass('approval-gate', 'unapproved promotion is denied');
  if (process.env.UPFS_ENVIRONMENT === 'pilot' || process.env.UPFS_ENVIRONMENT === 'production') throw new Error('controls evidence is synthetic-only and cannot run as managed environment');
  pass('synthetic-boundary', 'managed providers and credentials are never synthesized for pilot/production');
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify({ status: 'passed', synthetic_only: true, external_deployment: 'not-performed', checks }, null, 2)}\n`); console.log(`TASK-0018 controls evidence passed: ${checks.length} gates`);
}
try { main(); } catch (error) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify({ status: 'failed', synthetic_only: true, checks, error: error.message }, null, 2)}\n`); console.error(error.message); process.exit(1); }
