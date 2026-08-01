import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const requiredSignals=['cpu','memory','database_connections','queue_depth'];
const nonEmpty=value=>typeof value==='string'&&value.trim().length>0;
const evidenceRef=value=>nonEmpty(value)&&/^evidence:\/\//.test(value);
const rfc3339=value=>{
  if(!nonEmpty(value)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))return false;
  const canonical=new Date(value).toISOString();
  return canonical===value||canonical.replace('.000Z','Z')===value;
};
const digestFor=review=>crypto.createHash('sha256').update(JSON.stringify({
  dimensions:review.dimensions,
  thresholds:review.thresholds,
  saturation:review.saturation,
  scaling_actions:review.scaling_actions
})).digest('hex');

export function evaluatePilotCapacity({review,synthetic_only=true,deployment='not-performed'}={}){
  const checks=[];
  const check=(name,passed)=>checks.push({name,status:passed?'passed':'failed'});
  const dimensions=review?.dimensions;
  const thresholds=review?.thresholds;
  const saturation=review?.saturation;
  const actions=review?.scaling_actions;
  check('boundary',synthetic_only===true&&deployment==='not-performed');
  check('schema',review?.schema_version==='upfs.pilot-capacity-review.v1');
  check('review',rfc3339(review?.reviewed_at)&&nonEmpty(review?.reviewer));
  check('dimensions',['pilot_tenants','concurrent_users','read_requests_per_second','ingestion_events_per_minute','cells'].every(key=>Number.isInteger(dimensions?.[key])&&dimensions[key]>0));
  check('thresholds',thresholds?.availability_min_percent>=99&&thresholds?.read_api_p95_max_ms>0&&thresholds.read_api_p95_max_ms<=750&&thresholds?.ingestion_freshness_max_minutes>0&&thresholds.ingestion_freshness_max_minutes<=15&&thresholds?.unexplained_projection_drift_max===0&&thresholds?.rpo_max_minutes>0&&thresholds.rpo_max_minutes<=15&&thresholds?.rto_max_minutes>0&&thresholds.rto_max_minutes<=60);
  check('saturation',Array.isArray(saturation)&&saturation.length===requiredSignals.length&&requiredSignals.every(signal=>{const item=saturation.find(entry=>entry?.signal===signal);return Number.isFinite(item?.pause_at_percent)&&item.pause_at_percent>0&&item.pause_at_percent<=100&&Number.isFinite(item?.observed_peak_percent)&&item.observed_peak_percent>=0&&item.observed_peak_percent<item.pause_at_percent;}));
  check('scaling-actions',Array.isArray(actions)&&actions.length===requiredSignals.length&&requiredSignals.every(signal=>{const item=actions.find(entry=>entry?.signal===signal);return nonEmpty(item?.trigger)&&nonEmpty(item?.action)&&nonEmpty(item?.owner)&&evidenceRef(item?.evidence_ref);}));
  check('evidence',evidenceRef(review?.review_evidence?.evidence_ref)&&review?.review_evidence?.review_digest===digestFor(review));
  return {schema_version:'upfs.pilot-capacity-review-report.v1',status:checks.every(check=>check.status==='passed')?'passed':'failed',decision:'NO-GO_EXTERNAL_PREREQUISITES',synthetic_only,deployment,checks};
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){
  const review=JSON.parse(fs.readFileSync(path.join(root,'contracts/task-0061-pilot-capacity.json')));
  const report=evaluatePilotCapacity({review});
  fs.writeFileSync(path.join(root,'artifacts/task-0061-pilot-capacity-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`TASK-0061 pilot capacity: ${report.decision}`);
}
