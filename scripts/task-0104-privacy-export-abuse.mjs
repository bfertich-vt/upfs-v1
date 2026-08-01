import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRefs = ['specs/10_security/security_baseline.md', 'specs/11_soc2/soc2_readiness.md'];
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical = value => ({ scope: value?.scope, source_refs: value?.source_refs, evidence: value?.evidence, deployment: value?.deployment });
const futureRfc3339 = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.now();

export function evaluatePrivacyExportAbuse({ contract, synthetic_only = true } = {}) {
  const evidence = contract?.evidence;
  const checks = [];
  const check = (name, passed) => checks.push({ name, status: passed ? 'passed' : 'failed' });
  check('boundary', synthetic_only && contract?.deployment === 'not-performed');
  check('source', Array.isArray(contract?.source_refs) && JSON.stringify(contract.source_refs) === JSON.stringify(sourceRefs) && sourceRefs.every(ref => fs.existsSync(path.join(root, ref))));
  check('rehearsal', contract?.schema_version === 'upfs.privacy-export-abuse.v1'
    && contract?.scope?.tenant_id === 'synthetic-tenant' && contract?.scope?.environment_id === 'pilot'
    && typeof evidence?.ref === 'string' && evidence.ref.startsWith('evidence://')
    && evidence?.request_scope === 'verified' && evidence?.approval === 'approved' && evidence?.redaction === 'applied'
    && evidence?.expiry === 'enforced' && futureRfc3339(evidence?.expires_at) && evidence?.rate_limits === 'enforced' && evidence?.abuse_detection === 'triggered'
    && evidence?.audit === 'append-only' && evidence?.deletion_interaction === 'blocked-pending-review'
    && evidence?.state === 'blocked' && evidence?.replay === 'replayed' && evidence?.conflict === 'rejected');
  check('integrity', contract?.digest === digest(canonical(contract)));
  return { status: checks.every(check => check.status === 'passed') ? 'passed' : 'failed', decision: 'NO-GO_EXTERNAL_PREREQUISITES', checks };
}
