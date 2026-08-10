import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AdminControlPlaneService } from './admin-control-plane.mjs';

const secret = 'synthetic-admin-cursor-secret-0000000001';
const admin = Object.freeze({ issuer: 'https://issuer.test', subject: 'ops-1', session_id: 'session-ops-1', step_up: true, admin_scopes: ['admin:read', 'admin:tenant_metadata'], tenant_ids: ['tenant-a'], environment_ids: ['env-a'] });
const otherAdmin = Object.freeze({ ...admin, subject: 'ops-2', session_id: 'session-ops-2', tenant_ids: ['tenant-b'], environment_ids: ['env-b'] });
const supportActor = Object.freeze({ issuer: 'https://issuer.test', subject: 'support-1', session_id: 'session-support-1', step_up: true, admin_scopes: ['admin:read'], tenant_ids: [], environment_ids: [] });
const supportToken = 'support-session-reference-0001';
const support = Object.freeze({ id: supportToken, actor_id: 'https://issuer.test|support-1', tenant_id: 'tenant-a', environment_ids: ['env-a'], case_id: 'case-100', reason_code: 'incident-investigation', approved_by: 'security-reviewer', step_up: true, expires_at: '2026-01-01T00:05:00Z' });
const make = (overrides = {}) => new AdminControlPlaneService({
  health: { postgres: { status: 'healthy', observed_at: '2026-01-01T00:00:00Z' }, search: { status: 'degraded', observed_at: '2026-01-01T00:00:00Z' } },
  tenants: [{ id: 'tenant-a', name: 'Synthetic Bank', organization_id: 'org-a', status: 'active' }, { id: 'tenant-b', name: 'Other Bank', organization_id: 'org-b', status: 'active' }],
  environments: [{ id: 'env-a', tenant_id: 'tenant-a', name: 'test', status: 'active' }, { id: 'env-b', tenant_id: 'tenant-b', name: 'test', status: 'active' }],
  projection: { 'tenant-a': { status: 'healthy', watermark: 9, indexed_count: 2 }, 'tenant-b': { status: 'healthy', watermark: 4, indexed_count: 1 } },
  requestId: () => 'req-fixed', now: () => new Date('2026-01-01T00:00:00Z'), cursorSecret: secret,
  resolveSupportSession: (reference) => reference === supportToken ? support : null,
  ...overrides,
});

test('health is authenticated, redacted, classified, correlated, and atomically audited', () => {
  const service = make(); const response = service.healthRead({ actor: admin });
  assert.equal(response.status, 200); assert.equal(response.body.request_id, 'req-fixed'); assert.equal(response.body.status, 'degraded');
  assert.deepEqual(Object.keys(response.body.components.postgres).sort(), ['data_classification', 'observed_at', 'status']);
  assert.deepEqual(service.audit().map((entry) => [entry.action, entry.decision, entry.metadata_only]), [['admin.health.read', 'allow', true]]);
});

test('identity and RBAC are deny-default without resource disclosure', () => {
  const service = make();
  for (const actor of [undefined, {}, { issuer: 'i', subject: 's', session_id: 'x', admin_scopes: [], tenant_ids: [], environment_ids: [] }]) assert.ok([401, 403].includes(service.healthRead({ actor }).status));
  const foreign = service.tenantRead({ actor: otherAdmin, tenantId: 'tenant-a', environmentId: 'env-a' });
  const absent = service.tenantRead({ actor: admin, tenantId: 'tenant-z' });
  assert.deepEqual([foreign.status, foreign.body.code], [404, 'resource_not_found']); assert.deepEqual([absent.status, absent.body.code], [404, 'resource_not_found']);
});

test('tenant list is derived from verified actor scope and excludes financial/customer payloads', () => {
  const service = make(); const response = service.tenantList({ actor: admin });
  assert.equal(response.status, 200); assert.deepEqual(response.body.data.map((value) => value.id), ['tenant-a']);
  assert.deepEqual(Object.keys(response.body.data[0]).sort(), ['data_classification', 'id', 'name', 'organization_id', 'status']);
  assert.doesNotMatch(JSON.stringify(response), /account|transaction|credential|secret|routing/i);
});

test('tenant detail derives tenant and environment scope and closes response shapes', () => {
  const service = make(); const response = service.tenantRead({ actor: admin, tenantId: 'tenant-a', environmentId: 'env-a' });
  assert.equal(response.status, 200); assert.deepEqual(response.body.environments.map((value) => value.id), ['env-a']);
  assert.deepEqual(Object.keys(response.body.tenant).sort(), ['data_classification', 'id', 'name', 'organization_id', 'status']);
  assert.deepEqual(Object.keys(response.body.projection).sort(), ['data_classification', 'indexed_count', 'status', 'watermark']);
});

test('cursor is endpoint, scope, snapshot bound, tamper evident, and bounded', () => {
  const scoped = { ...admin, tenant_ids: ['tenant-a', 'tenant-b'], environment_ids: ['env-a', 'env-b'] };
  const service = make(); const page = service.tenantList({ actor: scoped, limit: 1 }); const cursor = page.body.page.next_cursor;
  assert.ok(cursor); assert.equal(service.tenantList({ actor: scoped, limit: 1, cursor: `${cursor.slice(0, -1)}x` }).body.code, 'invalid_cursor');
  assert.equal(service.tenantList({ actor: admin, limit: 1, cursor }).body.code, 'invalid_cursor');
  assert.equal(service.tenantList({ actor: scoped, cursor: 'x'.repeat(2049) }).body.code, 'invalid_cursor');
  for (const limit of [0, 101, 1.5, '1']) assert.equal(service.tenantList({ actor: scoped, limit }).body.code, 'invalid_limit');
});

test('support access is broker-derived, actor-bound, approved, stepped-up, scoped, expiring, and audited without reason text', () => {
  const service = make(); const response = service.tenantRead({ actor: supportActor, tenantId: 'tenant-a', environmentId: 'env-a', supportSession: supportToken });
  assert.equal(response.status, 200); const audit = service.audit()[0]; assert.equal(audit.case_id, 'case-100'); assert.equal(audit.support_session_id, supportToken); assert.equal(audit.support_scope, 'redacted_read');
  assert.equal('reason_code' in audit, false); assert.doesNotMatch(JSON.stringify(audit), /incident-investigation/);
});

test('forged, transferred, widened, unapproved, unstepped, and expired support sessions fail closed', () => {
  const mutations = [
    null,
    { ...support, actor_id: 'https://issuer.test|someone-else' },
    { ...support, tenant_id: 'tenant-b' },
    { ...support, environment_ids: ['env-b'] },
    { ...support, approved_by: 'https://issuer.test|support-1' },
    { ...support, step_up: false },
    { ...support, expires_at: '2025-12-31T23:59:59Z' },
  ];
  for (const resolved of mutations) {
    const service = make({ resolveSupportSession: () => resolved });
    assert.equal(service.tenantRead({ actor: supportActor, tenantId: 'tenant-a', environmentId: 'env-a', supportSession: supportToken }).body.code, 'invalid_support_session');
  }
  const noStep = { ...supportActor, step_up: false }; assert.equal(make().tenantRead({ actor: noStep, tenantId: 'tenant-a', environmentId: 'env-a', supportSession: supportToken }).body.code, 'invalid_support_session');
  assert.equal(make().tenantRead({ actor: supportActor, tenantId: 'tenant-a', supportSession: support }).body.code, 'invalid_support_session');
});

test('support broker exception and timeout fail closed and are audited', () => {
  const outage = make({ resolveSupportSession: () => { throw new Error('private detail'); } });
  assert.equal(outage.tenantRead({ actor: supportActor, tenantId: 'tenant-a', supportSession: supportToken }).body.code, 'support_broker_unavailable');
  const timeout = make({ adapterTimeoutMs: 1, resolveSupportSession: () => { const until = Date.now() + 5; while (Date.now() < until); return support; } });
  assert.equal(timeout.tenantRead({ actor: supportActor, tenantId: 'tenant-a', supportSession: supportToken }).body.code, 'support_broker_timeout');
  assert.doesNotMatch(JSON.stringify(outage.audit()), /private detail/);
});

test('stale or malformed health and partial projection data fail closed', () => {
  assert.equal(make({ health: { postgres: { status: 'healthy', observed_at: '2025-01-01T00:00:00Z' } } }).healthRead({ actor: admin }).body.code, 'health_dependency_unavailable');
  assert.equal(make({ projection: { 'tenant-a': { status: 'healthy', watermark: -1, indexed_count: 2 } } }).tenantRead({ actor: admin, tenantId: 'tenant-a' }).body.code, 'projection_dependency_unavailable');
  assert.equal(make({ projection: { 'tenant-a': { status: 'healthy', watermark: 1, indexed_count: 2, private_data: 'x' } } }).tenantRead({ actor: admin, tenantId: 'tenant-a' }).body.code, 'projection_dependency_unavailable');
});

test('pre and post shaping cancellation releases no data', () => {
  const signal = { aborted: true }; const service = make(); const response = service.tenantRead({ actor: admin, tenantId: 'tenant-a', signal });
  assert.equal(response.body.code, 'request_cancelled'); assert.equal('tenant' in response.body, false);
});

test('mandatory audit failure prevents success and denial release', () => {
  const service = make({ auditSink: () => { throw new Error('audit payload secret'); } });
  assert.deepEqual([service.healthRead({ actor: admin }).status, service.healthRead({ actor: admin }).body.code], [503, 'audit_unavailable']);
  assert.equal(service.healthRead({ actor: { ...admin, admin_scopes: [] } }).body.code, 'audit_unavailable'); assert.deepEqual(service.audit(), []);
});

test('constructor and request boundaries reject accessors, proxies, symbols, sparse arrays, circular and oversized values', () => {
  const accessor = {}; Object.defineProperty(accessor, 'issuer', { get() { throw new Error('getter'); }, enumerable: true });
  const proxy = new Proxy({}, { getPrototypeOf() { throw new Error('proxy'); } });
  for (const actor of [accessor, proxy, { ...admin, [Symbol('secret')]: 'x' }, { ...admin, admin_scopes: Array(2) }, { ...admin, tenant_ids: ['x'.repeat(257)] }]) assert.ok([401, 503].includes(make().healthRead({ actor }).status));
  const circular = {}; circular.self = circular; assert.throws(() => make({ health: circular }), /unsafe_value/);
  const hostileTenant = { id: 'tenant-a', name: 'A', organization_id: 'org-a', secret: 'no' }; assert.throws(() => make({ tenants: [hostileTenant] }), /invalid_tenant/);
  const requestAccessor = { actor: admin }; Object.defineProperty(requestAccessor, 'tenantId', { get() { throw new Error('must-not-run'); }, enumerable: true });
  assert.equal(make().tenantRead(requestAccessor).body.code, 'authentication_required');
  assert.equal(make().tenantRead({ actor: admin, tenantId: 'tenant-a', unexpected: true }).body.code, 'authentication_required');
});

test('source fixture mutation after construction cannot widen snapshots', () => {
  const tenants = [{ id: 'tenant-a', name: 'Synthetic Bank', organization_id: 'org-a', status: 'active' }];
  const service = make({ tenants }); tenants[0].name = 'Mutated'; tenants.push({ id: 'tenant-b', name: 'Injected', organization_id: 'org-b', status: 'active' });
  const response = service.tenantList({ actor: { ...admin, tenant_ids: ['tenant-a', 'tenant-b'] } }); assert.deepEqual(response.body.data.map((value) => value.name), ['Synthetic Bank']);
});

test('read-only reference does not invoke write policy or managed infrastructure', () => {
  let policyCalls = 0; const service = make({ policy: () => { policyCalls += 1; throw new Error('must not run'); }, managedCredentials: true });
  assert.equal(service.tenantRead({ actor: admin, tenantId: 'tenant-a' }).status, 200); assert.equal(policyCalls, 0);
});

test('OpenAPI closes read models and documents bounded scope, cancellation, and dependency failure', () => {
  const contract = fs.readFileSync(new URL('../contracts/openapi/admin-api.yaml', import.meta.url), 'utf8');
  for (const marker of ['environment_id', 'maxLength: 512', 'maxLength: 2048', 'Cancelled:', 'DependencyUnavailable:', 'EnvironmentMetadata:', 'ProjectionMetadata:']) assert.match(contract, new RegExp(marker));
  const readModel = contract.slice(contract.indexOf('    ErrorResponse:'), contract.indexOf('    OperationalMetadataResponse:'));
  assert.ok((readModel.match(/additionalProperties: false/g) ?? []).length >= 9);
});

test('legacy administrative operation reference remains idempotent and fail-closed', () => {
  const writer = { issuer: 'https://issuer.test', subject: 'writer', admin_scopes: ['admin:read', 'admin:write'], tenant_ids: ['tenant-a'] };
  const service = make(); const created = service.createAdministrativeOperation({ actor: writer, tenantId: 'tenant-a', environmentId: 'env-a', type: 'reindex', reason: 'synthetic maintenance review', dryRun: true, idempotencyKey: 'idempotency-key-0001' });
  assert.equal(created.status, 202); assert.equal(service.createAdministrativeOperation({ actor: writer, tenantId: 'tenant-a', type: 'reindex', reason: 'synthetic maintenance review', idempotencyKey: 'idempotency-key-0001' }).body.operation.id, created.body.operation.id);
  assert.equal(service.executeAdministrativeOperation({ actor: writer, operationId: created.body.operation.id, idempotencyKey: 'execute-key-0001' }).body.code, 'operation_not_approved');
});
