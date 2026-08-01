import test from 'node:test';import assert from 'node:assert/strict';import {evaluateGoNoGo} from './task-0040-go-no-go.mjs';
test('final handoff is truthful no-go without external prerequisites',()=>{const r=evaluateGoNoGo();assert.equal(r.decision,'NO-GO_EXTERNAL_PREREQUISITES');assert.equal(r.production_authorized,false);assert.equal(r.certified,false);});
test('deployment boundary fails closed',()=>assert.equal(evaluateGoNoGo({deployment:'performed'}).checks.find(x=>x.name==='boundary').status,'failed'));
test('GO is only possible when all external prerequisites are supplied',()=>assert.equal(evaluateGoNoGo({externalApprovals:true,managedInfrastructure:true,credentials:true}).decision,'GO_EXTERNAL_APPROVALS_VERIFIED'));
