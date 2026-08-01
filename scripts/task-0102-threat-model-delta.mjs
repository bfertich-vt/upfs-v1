import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRefs = ['specs/10_security/security_baseline.md'];
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical = value => ({ scope: value?.scope, source_refs: value?.source_refs, evidence: value?.evidence, deployment: value?.deployment });
const nonemptyString = value => typeof value === 'string' && value.trim().length > 0;
const futureRfc3339 = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.now();

export function evaluateThreatModelDelta({ contract, synthetic_only = true } = {}) {
  const evidence = contract?.evidence;
  const checks = [];
  const check = (name, passed) => checks.push({ name, status: passed ? 'passed' : 'failed' });
  check('boundary', synthetic_only && contract?.deployment === 'not-performed');
  check('source', Array.isArray(contract?.source_refs) && JSON.stringify(contract.source_refs) === JSON.stringify(sourceRefs) && sourceRefs.every(ref => fs.existsSync(path.join(root, ref))));
  check('review', contract?.schema_version === 'upfs.threat-model-delta.v1'
    && contract?.scope?.tenant_id === 'synthetic-tenant' && contract?.scope?.environment_id === 'pilot'
    && nonemptyString(evidence?.ref) && evidence.ref.startsWith('evidence://') && nonemptyString(evidence?.version)
    && evidence?.new_boundaries === 'reviewed' && evidence?.abuse_cases === 'reviewed'
    && evidence?.residual_risks === 'accepted-with-expiry' && futureRfc3339(evidence?.expires_at) && evidence?.mitigations === 'tracked'
    && nonemptyString(evidence?.owner) && nonemptyString(evidence?.approval_ref) && evidence.approval_ref.startsWith('approval://')
    && evidence?.approval_state === 'approved' && evidence?.state === 'blocked' && evidence?.replay === 'replayed' && evidence?.conflict === 'rejected');
  check('integrity', contract?.digest === digest(canonical(contract)));
  return { status: checks.every(check => check.status === 'passed') ? 'passed' : 'failed', decision: 'NO-GO_EXTERNAL_PREREQUISITES', checks };
}
