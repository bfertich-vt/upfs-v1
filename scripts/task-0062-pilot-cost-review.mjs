import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resources=['monthly_cost_usd','compute_unit_hours','storage_gb','egress_gb','log_retention_gb'];
const nonEmpty=value=>typeof value==='string'&&value.trim().length>0;
const evidenceRef=value=>nonEmpty(value)&&/^evidence:\/\//.test(value);
const rfc3339=value=>{
  if(!nonEmpty(value)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))return false;
  const canonical=new Date(value).toISOString();
  return canonical===value||canonical.replace('.000Z','Z')===value;
};
const digestFor=review=>crypto.createHash('sha256').update(JSON.stringify({
  bounds:review.bounds,
  anomaly_thresholds:review.anomaly_thresholds,
  pause_actions:review.pause_actions
})).digest('hex');

export function evaluatePilotCostReview({review,synthetic_only=true,deployment='not-performed',billing_access='not-configured'}={}){
  const checks=[];
  const check=(name,passed)=>checks.push({name,status:passed?'passed':'failed'});
  const bounds=review?.bounds;
  const thresholds=review?.anomaly_thresholds;
  const actions=review?.pause_actions;
  check('boundary',synthetic_only===true&&deployment==='not-performed'&&billing_access==='not-configured'&&review?.billing_access==='not-configured'&&review?.resource_observation==='synthetic');
  check('schema',review?.schema_version==='upfs.pilot-cost-resource-review.v1');
  check('review',rfc3339(review?.reviewed_at)&&nonEmpty(review?.owner)&&nonEmpty(review?.reviewer)&&nonEmpty(review?.frequency));
  check('bounds',resources.every(resource=>Number.isFinite(bounds?.[resource]?.limit)&&bounds[resource].limit>0&&Number.isFinite(bounds[resource].observed)&&bounds[resource].observed>=0&&bounds[resource].observed<bounds[resource].limit));
  check('anomaly-thresholds',Array.isArray(thresholds)&&thresholds.length===resources.length&&resources.every(resource=>{const threshold=thresholds.find(item=>item?.resource===resource);return Number.isFinite(threshold?.warning_percent)&&Number.isFinite(threshold?.pause_percent)&&threshold.warning_percent>0&&threshold.warning_percent<threshold.pause_percent&&threshold.pause_percent<=100;}));
  check('pause-actions',Array.isArray(actions)&&actions.length===resources.length&&resources.every(resource=>{const action=actions.find(item=>item?.resource===resource);return nonEmpty(action?.action)&&nonEmpty(action?.owner)&&evidenceRef(action?.evidence_ref);}));
  check('evidence',evidenceRef(review?.review_evidence?.evidence_ref)&&review?.review_evidence?.review_digest===digestFor(review));
  return {schema_version:'upfs.pilot-cost-resource-review-report.v1',status:checks.every(check=>check.status==='passed')?'passed':'failed',decision:'NO-GO_EXTERNAL_PREREQUISITES',synthetic_only,deployment,billing_access,checks};
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){
  const review=JSON.parse(fs.readFileSync(path.join(root,'contracts/task-0062-pilot-cost-review.json')));
  const report=evaluatePilotCostReview({review});
  fs.writeFileSync(path.join(root,'artifacts/task-0062-pilot-cost-review-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`TASK-0062 pilot cost review: ${report.decision}`);
}
