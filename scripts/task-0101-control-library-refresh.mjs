import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRefs = ['docs/compliance/control-library.json', 'specs/11_soc2/soc2_readiness.md'];
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical = value => ({ scope: value?.scope, source_refs: value?.source_refs, evidence: value?.evidence, deployment: value?.deployment });
const fields = ['owner', 'frequency', 'systems', 'procedure', 'evidence_source', 'reviewer', 'exceptions', 'remediation', 'retention'];
const synchronizedLibrary = () => {
  try {
    const library = JSON.parse(fs.readFileSync(path.join(root, sourceRefs[0]), 'utf8'));
    return library?.schema_version === 'upfs.soc2.control-library.v1'
      && library?.attestation_status === 'engineering-readiness-only'
      && library?.synthetic_data_only === true && Array.isArray(library?.controls)
      && library.controls.length > 0 && library.controls.every(control => fields.every(field => {
        const value = control?.[field];
        return Array.isArray(value) ? value.length > 0 && value.every(item => typeof item === 'string' && item.trim()) : typeof value === 'string' && value.trim();
      }));
  } catch { return false; }
};

export function evaluateControlLibraryRefresh({ contract, synthetic_only = true } = {}) {
  const evidence = contract?.evidence;
  const checks = [];
  const check = (name, passed) => checks.push({ name, status: passed ? 'passed' : 'failed' });

  check('boundary', synthetic_only && contract?.deployment === 'not-performed');
  check('source', Array.isArray(contract?.source_refs) && JSON.stringify(contract.source_refs) === JSON.stringify(sourceRefs) && sourceRefs.every(ref => fs.existsSync(path.join(root, ref))) && synchronizedLibrary());
  check('refresh', contract?.schema_version === 'upfs.control-library-refresh.v1'
    && contract?.scope?.tenant_id === 'synthetic-tenant' && contract?.scope?.environment_id === 'pilot'
    && typeof evidence?.ref === 'string' && evidence.ref.startsWith('evidence://')
    && ['owners', 'frequency', 'systems', 'procedures', 'evidence_sources', 'reviewers', 'exceptions', 'remediation', 'retention'].every(field => evidence?.[field] === 'synchronized')
    && evidence?.review_status === 'engineering-readiness-only' && evidence?.state === 'blocked'
    && evidence?.replay === 'replayed' && evidence?.conflict === 'rejected');
  check('integrity', contract?.digest === digest(canonical(contract)));
  return { status: checks.every(check => check.status === 'passed') ? 'passed' : 'failed', decision: 'NO-GO_EXTERNAL_PREREQUISITES', checks };
}
