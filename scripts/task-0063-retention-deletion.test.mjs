import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {evaluateRetentionDeletion} from './task-0063-retention-deletion.mjs';

const good=()=>{
  const review={schema_version:'upfs.retention-deletion-review.v1',reviewed_at:'2030-01-01T00:00:00Z',owner:'governance-owner',reviewer:'security-reviewer',retention:{raw_evidence_days:35,quarantine_days:35,backup_days:35,audit_days:2555,policy_ref:'evidence://retention/policy'},legal_hold:{checked:true,held_records_blocked:true,evidence_ref:'evidence://retention/legal-hold'},deletion:{dry_run:true,execution:'not-performed',eligible_records:3,held_records_excluded:true,approval_required:true,evidence_ref:'evidence://retention/deletion'},quarantine:{isolated:true,release_requires_scan:true,deletion_requires_approval:true,evidence_ref:'evidence://retention/quarantine'},audit:{append_only:true,tenant_scoped:true,redacted:true,evidence_ref:'evidence://retention/audit'},restore:{retention_reapplied:true,legal_holds_preserved:true,quarantine_state_preserved:true,evidence_ref:'evidence://retention/restore'}};
  review.review_evidence={evidence_ref:'evidence://retention/review',review_digest:crypto.createHash('sha256').update(JSON.stringify({retention:review.retention,legal_hold:review.legal_hold,deletion:review.deletion,quarantine:review.quarantine,audit:review.audit,restore:review.restore})).digest('hex')};
  return review;
};

test('retention and deletion review passes a bound synthetic contract',()=>assert.equal(evaluateRetentionDeletion({review:good()}).status,'passed'));
test('versioned retention and deletion contract evaluates cleanly',()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const review=JSON.parse(fs.readFileSync(path.join(root,'contracts/task-0063-retention-deletion.json')));
  assert.equal(evaluateRetentionDeletion({review}).status,'passed');
});
for(const mutate of [
  review=>{review.deletion.execution='performed';},
  review=>{review.legal_hold.held_records_blocked=false;},
  review=>{review.deletion.held_records_excluded=false;},
  review=>{review.quarantine.release_requires_scan=false;},
  review=>{review.audit.append_only=false;},
  review=>{review.restore.legal_holds_preserved=false;},
  review=>{review.review_evidence.review_digest='tampered';},
  review=>{review.audit.evidence_ref='audit://unbound';}
])test('retention and deletion review fails closed on mutation',()=>{const review=good();mutate(review);assert.equal(evaluateRetentionDeletion({review}).status,'failed');});
