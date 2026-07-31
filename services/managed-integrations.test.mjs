import test from 'node:test';
import assert from 'node:assert/strict';
import { ManagedBackupAdapter, ManagedDeploymentAdapter, ManagedIntegrationReadService, ManagedObservabilityAdapter, syntheticBackup, syntheticDeployment, syntheticObservability } from './managed-integrations.mjs';

const actor = { issuer: 'issuer', subject: 'ops', admin_scopes: ['admin:read'] };
const providers = () => ({ observability: syntheticObservability({ 'tenant-a|env-1': { status: 'healthy', secret: 'do-not-return' } }), deployment: syntheticDeployment({ 'tenant-a|env-1': { status: 'deployed', token: 'do-not-return' } }), backup: syntheticBackup({ 'tenant-a|env-1': { status: 'current', password: 'do-not-return' } }) });

test('missing managed providers fail closed', async () => { await assert.rejects(new ManagedObservabilityAdapter().status(), { code: 'provider_not_configured' }); await assert.rejects(Promise.resolve().then(() => new ManagedIntegrationReadService()), { code: 'provider_not_configured' }); });
test('admin status is redacted and tenant-bound', async () => { const r = await new ManagedIntegrationReadService(providers()).status({ actor, tenantId: 'tenant-a', environmentId: 'env-1' }); assert.equal(r.status, 200); assert.equal(r.body.observability.secret, undefined); assert.equal(r.body.deployment.token, undefined); assert.equal(r.body.backup.password, undefined); assert.equal(r.body.tenant_id, 'tenant-a'); });
test('auth and invalid scope are rejected without provider calls', async () => { const s = new ManagedIntegrationReadService(providers()); assert.equal((await s.status({ tenantId: 'tenant-a', environmentId: 'env-1' })).status, 401); assert.equal((await s.status({ actor: { ...actor, admin_scopes: [] }, tenantId: 'tenant-a', environmentId: 'env-1' })).status, 403); assert.equal((await s.status({ actor, tenantId: 'tenant-b', environmentId: 'env-1' })).status, 404); });
