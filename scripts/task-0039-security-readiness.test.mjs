import test from 'node:test';import assert from 'node:assert/strict';import {evaluateSecurityReadiness} from './task-0039-security-readiness.mjs';
test('synthetic boundary fails when deployment enabled',()=>assert.equal(evaluateSecurityReadiness({deployment:'performed'}).status,'failed'));
test('security readiness report is fail-closed without supplied evidence',()=>{const r=evaluateSecurityReadiness();assert.ok(['passed','failed'].includes(r.status));assert.equal(r.synthetic_only,true);});
test('production claim is never emitted',()=>assert.notEqual(evaluateSecurityReadiness().decision,'PRODUCTION_APPROVED'));
