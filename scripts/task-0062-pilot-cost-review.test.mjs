import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {evaluatePilotCostReview} from './task-0062-pilot-cost-review.mjs';

const resources=['monthly_cost_usd','compute_unit_hours','storage_gb','egress_gb','log_retention_gb'];
const good=()=>{
  const bounds=Object.fromEntries(resources.map(resource=>[resource,{limit:100,observed:50}]));
  const review={schema_version:'upfs.pilot-cost-resource-review.v1',reviewed_at:'2030-01-01T00:00:00Z',owner:'finops-owner',reviewer:'independent-reviewer',frequency:'weekly',billing_access:'not-configured',resource_observation:'synthetic',bounds,anomaly_thresholds:resources.map(resource=>({resource,warning_percent:70,pause_percent:90})),pause_actions:resources.map(resource=>({resource,action:'pause and investigate',owner:'owner',evidence_ref:`evidence://cost/${resource}`}))};
  review.review_evidence={evidence_ref:'evidence://cost/review/1',review_digest:crypto.createHash('sha256').update(JSON.stringify({bounds:review.bounds,anomaly_thresholds:review.anomaly_thresholds,pause_actions:review.pause_actions})).digest('hex')};
  return review;
};

test('pilot cost review passes a bound synthetic contract',()=>assert.equal(evaluatePilotCostReview({review:good()}).status,'passed'));
test('versioned pilot cost contract evaluates cleanly',()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const review=JSON.parse(fs.readFileSync(path.join(root,'contracts/task-0062-pilot-cost-review.json')));
  assert.equal(evaluatePilotCostReview({review}).status,'passed');
});
for(const mutate of [
  review=>{review.bounds.storage_gb.observed=100;},
  review=>{review.anomaly_thresholds[0].pause_percent=70;},
  review=>{review.pause_actions[0].owner='';},
  review=>{review.pause_actions[0].evidence_ref='cost://cpu';},
  review=>{review.billing_access='configured';},
  review=>{review.review_evidence.review_digest='bad';},
  review=>{review.reviewed_at='2030-02-30T00:00:00Z';}
])test('pilot cost review fails closed on mutation',()=>{const review=good();mutate(review);assert.equal(evaluatePilotCostReview({review}).status,'failed');});
