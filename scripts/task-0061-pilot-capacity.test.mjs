import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {evaluatePilotCapacity} from './task-0061-pilot-capacity.mjs';

const good=()=>{
  const review={schema_version:'upfs.pilot-capacity-review.v1',reviewed_at:'2030-01-01T00:00:00Z',reviewer:'capacity-owner',dimensions:{pilot_tenants:10,concurrent_users:100,read_requests_per_second:250,ingestion_events_per_minute:5000,cells:2},thresholds:{availability_min_percent:99,read_api_p95_max_ms:750,ingestion_freshness_max_minutes:15,unexplained_projection_drift_max:0,rpo_max_minutes:15,rto_max_minutes:60},saturation:[{signal:'cpu',pause_at_percent:85,observed_peak_percent:65},{signal:'memory',pause_at_percent:85,observed_peak_percent:60},{signal:'database_connections',pause_at_percent:80,observed_peak_percent:50},{signal:'queue_depth',pause_at_percent:80,observed_peak_percent:40}],scaling_actions:[{signal:'cpu',trigger:'sustained saturation',action:'scale workers',owner:'capacity-owner',evidence_ref:'evidence://capacity/cpu'},{signal:'memory',trigger:'sustained saturation',action:'scale memory',owner:'capacity-owner',evidence_ref:'evidence://capacity/memory'},{signal:'database_connections',trigger:'connection saturation',action:'scale pool',owner:'database-owner',evidence_ref:'evidence://capacity/database'},{signal:'queue_depth',trigger:'backpressure',action:'scale consumers',owner:'ingestion-owner',evidence_ref:'evidence://capacity/queue'}]};
  review.review_evidence={evidence_ref:'evidence://capacity/review/1',review_digest:crypto.createHash('sha256').update(JSON.stringify({dimensions:review.dimensions,thresholds:review.thresholds,saturation:review.saturation,scaling_actions:review.scaling_actions})).digest('hex')};
  return review;
};

test('pilot capacity review passes a bound synthetic contract',()=>assert.equal(evaluatePilotCapacity({review:good()}).status,'passed'));
test('versioned pilot capacity contract evaluates cleanly',()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const review=JSON.parse(fs.readFileSync(path.join(root,'contracts/task-0061-pilot-capacity.json')));
  assert.equal(evaluatePilotCapacity({review}).status,'passed');
});
for(const mutate of [
  review=>{review.dimensions.pilot_tenants=0;},
  review=>{review.thresholds.read_api_p95_max_ms=751;},
  review=>{review.saturation[0].observed_peak_percent=85;},
  review=>{review.scaling_actions[0].evidence_ref='action://cpu';},
  review=>{review.review_evidence.review_digest='bad';},
  review=>{review.reviewed_at='2030-02-30T00:00:00Z';},
  review=>{review.scaling_actions[0].owner='';}
])test('pilot capacity review fails closed on mutation',()=>{const review=good();mutate(review);assert.equal(evaluatePilotCapacity({review}).status,'failed');});
