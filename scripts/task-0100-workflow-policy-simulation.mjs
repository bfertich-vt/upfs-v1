import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRefs = ['specs/14_admin_control_plane/admin_control_plane.md', 'specs/05_apis/api_standards.md'];
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical = value => ({ scope: value?.scope, source_refs: value?.source_refs, evidence: value?.evidence, deployment: value?.deployment });
const nonemptyString = value => typeof value === 'string' && value.trim().length > 0;

export function evaluateWorkflowPolicySimulation({ contract, synthetic_only = true } = {}) {
  const evidence = contract?.evidence;
  const checks = [];
  const check = (name, passed) => checks.push({ name, status: passed ? 'passed' : 'failed' });

  check('boundary', synthetic_only && contract?.deployment === 'not-performed');
  check('source', Array.isArray(contract?.source_refs) && JSON.stringify(contract.source_refs) === JSON.stringify(sourceRefs) && sourceRefs.every(ref => fs.existsSync(path.join(root, ref))));
  check('workflow', contract?.schema_version === 'upfs.workflow-policy-simulation.v1'
    && contract?.scope?.tenant_id === 'synthetic-tenant'
    && contract?.scope?.environment_id === 'pilot'
    && nonemptyString(evidence?.ref) && evidence.ref.startsWith('evidence://')
    && evidence?.policy_decision === 'explicit-deny-default'
    && evidence?.approval_quorum === 'satisfied' && evidence?.idempotency === 'replayed'
    && evidence?.concurrency === 'if-match-enforced' && evidence?.audit === 'append-only'
    && evidence?.export === 'redacted' && evidence?.recovery === 'verified'
    && evidence?.state === 'blocked' && evidence?.replay === 'replayed'
    && evidence?.conflict === 'rejected');
  check('integrity', contract?.digest === digest(canonical(contract)));
  return { status: checks.every(check => check.status === 'passed') ? 'passed' : 'failed', decision: 'NO-GO_EXTERNAL_PREREQUISITES', checks };
}
