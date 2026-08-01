import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const nonEmpty=value=>typeof value==='string'&&value.trim().length>0;
const evidenceRef=value=>nonEmpty(value)&&/^evidence:\/\//.test(value);
const rfc3339=value=>{
  if(!nonEmpty(value)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))return false;
  const canonical=new Date(value).toISOString();
  return canonical===value||canonical.replace('.000Z','Z')===value;
};
const digestFor=review=>crypto.createHash('sha256').update(JSON.stringify({
  retention:review.retention,
  legal_hold:review.legal_hold,
  deletion:review.deletion,
  quarantine:review.quarantine,
  audit:review.audit,
  restore:review.restore
})).digest('hex');

export function evaluateRetentionDeletion({review,synthetic_only=true,deployment='not-performed'}={}){
  const checks=[];
  const check=(name,passed)=>checks.push({name,status:passed?'passed':'failed'});
  const retention=review?.retention;
  const legalHold=review?.legal_hold;
  const deletion=review?.deletion;
  const quarantine=review?.quarantine;
  const audit=review?.audit;
  const restore=review?.restore;
  check('boundary',synthetic_only===true&&deployment==='not-performed'&&deletion?.execution==='not-performed'&&deletion?.dry_run===true);
  check('schema',review?.schema_version==='upfs.retention-deletion-review.v1');
  check('review',rfc3339(review?.reviewed_at)&&nonEmpty(review?.owner)&&nonEmpty(review?.reviewer));
  check('retention',Number.isInteger(retention?.raw_evidence_days)&&retention.raw_evidence_days>0&&Number.isInteger(retention?.quarantine_days)&&retention.quarantine_days>0&&Number.isInteger(retention?.backup_days)&&retention.backup_days>0&&Number.isInteger(retention?.audit_days)&&retention.audit_days>=retention.raw_evidence_days&&evidenceRef(retention?.policy_ref));
  check('legal-hold',legalHold?.checked===true&&legalHold?.held_records_blocked===true&&evidenceRef(legalHold?.evidence_ref));
  check('deletion',Number.isInteger(deletion?.eligible_records)&&deletion.eligible_records>=0&&deletion?.held_records_excluded===true&&deletion?.approval_required===true&&evidenceRef(deletion?.evidence_ref));
  check('quarantine',quarantine?.isolated===true&&quarantine?.release_requires_scan===true&&quarantine?.deletion_requires_approval===true&&evidenceRef(quarantine?.evidence_ref));
  check('audit',audit?.append_only===true&&audit?.tenant_scoped===true&&audit?.redacted===true&&evidenceRef(audit?.evidence_ref));
  check('restore',restore?.retention_reapplied===true&&restore?.legal_holds_preserved===true&&restore?.quarantine_state_preserved===true&&evidenceRef(restore?.evidence_ref));
  check('evidence',evidenceRef(review?.review_evidence?.evidence_ref)&&review?.review_evidence?.review_digest===digestFor(review));
  return {schema_version:'upfs.retention-deletion-review-report.v1',status:checks.every(check=>check.status==='passed')?'passed':'failed',decision:'NO-GO_EXTERNAL_PREREQUISITES',synthetic_only,deployment,checks};
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){
  const review=JSON.parse(fs.readFileSync(path.join(root,'contracts/task-0063-retention-deletion.json')));
  const report=evaluateRetentionDeletion({review});
  fs.writeFileSync(path.join(root,'artifacts/task-0063-retention-deletion-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`TASK-0063 retention and deletion: ${report.decision}`);
}
