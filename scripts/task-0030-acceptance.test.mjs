import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { evaluateAcceptance } from './task-0030-acceptance.mjs';

const reports=['task-0017-pg14-native-report.json','task-0015-release-report.json','task-0018-controls-report.json','task-0019-pilot-report.json','task-0020-authorization-report.json','task-0028-dr-report.json','task-0029-resilience-report.json'];
function fixture({deployment='not-performed'}={}){const root=fs.mkdtempSync(path.join(os.tmpdir(),'upfs-task-0030-'));const write=(file,value)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value);};write('docs/MASTER_PLAN.md','# plan');write('docs/compliance/control-library.json',JSON.stringify({scope:'engineering-readiness-only; no-go; no certification'}));write('docs/compliance/pilot-go-no-go.md','NO-GO; no attestation');for(const file of reports)write(`artifacts/${file}`,JSON.stringify({status:'passed',synthetic_only:true,production_deployment:deployment}));for(const file of ['specs/10_security/security_baseline.md','specs/04_schema/canonical_model.md','specs/12_testing/test_strategy.md','specs/02_ui/console_experience.md','specs/06_ai/ai_runtime.md','specs/03_architecture/system_architecture.md','specs/07_workflows/workflow_runtime.md','specs/14_admin_control_plane/admin_control_plane.md','specs/09_cicd/delivery_pipeline.md','specs/05_apis/api_standards.md','specs/13_docs/documentation_platform.md'])write(file,'fixture');return root;}

test('controlled complete evidence retains external-prerequisite no-go', () => {
  const root=fixture();const report = evaluateAcceptance({root});
  assert.equal(report.synthetic_only, true);
  assert.equal(report.production_deployment, 'not-performed');
  assert.equal(report.status, 'passed');
  assert.equal(report.decision, 'NO-GO_EXTERNAL_PREREQUISITES');
  assert.ok(report.external_prerequisites.length >= 3);
  fs.rmSync(root,{recursive:true,force:true});
});

test('missing evidence fails closed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'upfs-task-0030-'));
  fs.mkdirSync(path.join(root, 'docs/compliance'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/MASTER_PLAN.md'), '# plan');
  const report = evaluateAcceptance({ root });
  assert.equal(report.decision, 'NO-GO');
  assert.ok(report.checks.some((c) => c.id === 'artifact:native-postgres' && c.status === 'failed'));
  fs.rmSync(root, { recursive: true, force: true });
});

test('production deployment claim fails closed', () => {
  const root = fixture({deployment:'performed'});
  const report = evaluateAcceptance({ root });
  assert.equal(report.decision, 'NO-GO');
  assert.ok(report.checks.some((c) => c.id === 'synthetic-boundary' && c.status === 'failed'));
  fs.rmSync(root, { recursive: true, force: true });
});
