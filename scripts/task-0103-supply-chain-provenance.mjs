import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRefs = ['specs/09_cicd/delivery_pipeline.md', 'specs/10_security/security_baseline.md'];
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical = value => ({ scope: value?.scope, source_refs: value?.source_refs, evidence: value?.evidence, deployment: value?.deployment });

export function evaluateSupplyChainProvenance({ contract, synthetic_only = true } = {}) {
  const evidence = contract?.evidence;
  const checks = [];
  const check = (name, passed) => checks.push({ name, status: passed ? 'passed' : 'failed' });
  check('boundary', synthetic_only && contract?.deployment === 'not-performed');
  check('source', Array.isArray(contract?.source_refs) && JSON.stringify(contract.source_refs) === JSON.stringify(sourceRefs) && sourceRefs.every(ref => fs.existsSync(path.join(root, ref))));
  check('refresh', contract?.schema_version === 'upfs.supply-chain-provenance.v1'
    && contract?.scope?.tenant_id === 'synthetic-tenant' && contract?.scope?.environment_id === 'pilot'
    && typeof evidence?.ref === 'string' && evidence.ref.startsWith('evidence://')
    && evidence?.pins === 'verified' && evidence?.advisories === 'reviewed' && evidence?.sbom === 'generated'
    && evidence?.provenance === 'verified' && evidence?.signatures === 'verified' && evidence?.remediation === 'tracked'
    && evidence?.state === 'blocked' && evidence?.replay === 'replayed' && evidence?.conflict === 'rejected');
  check('integrity', contract?.digest === digest(canonical(contract)));
  return { status: checks.every(check => check.status === 'passed') ? 'passed' : 'failed', decision: 'NO-GO_EXTERNAL_PREREQUISITES', checks };
}
