import crypto from 'node:crypto';

const environments = new Set(['development', 'test', 'staging', 'pilot', 'production']);
const managedEnvironments = new Set(['pilot', 'production']);

export class ManagedControlError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

/** Provider boundary. Implementations must resolve references without exposing values to logs. */
export class ManagedSecretProvider {
  async getSecret(_reference) { throw new ManagedControlError('provider_not_configured', 'managed secret provider is not configured'); }
}

export class ManagedSigningKeyProvider {
  async getSigningKey(_reference) { throw new ManagedControlError('provider_not_configured', 'managed signing-key provider is not configured'); }
}

/** In-memory provider intentionally restricted to synthetic test/development environments. */
export class SyntheticSecretProvider extends ManagedSecretProvider {
  constructor(entries = {}) { super(); this.entries = new Map(Object.entries(entries)); }
  async getSecret(reference) {
    const entry = this.entries.get(reference);
    if (!entry) throw new ManagedControlError('secret_not_found', 'managed secret reference was not found');
    return { reference, value: entry.value, version: entry.version ?? 'synthetic-1', expires_at: entry.expires_at ?? null, rotated_at: entry.rotated_at ?? null, synthetic_only: true };
  }
}

export class SyntheticSigningKeyProvider extends ManagedSigningKeyProvider {
  constructor(entries = {}) { super(); this.entries = new Map(Object.entries(entries)); }
  async getSigningKey(reference) {
    const entry = this.entries.get(reference);
    if (!entry) throw new ManagedControlError('signing_key_not_found', 'managed signing-key reference was not found');
    return { reference, value: entry.value, version: entry.version ?? 'synthetic-1', expires_at: entry.expires_at ?? null, synthetic_only: true };
  }
}

export class ManagedConfigProvider {
  async getConfig(_reference) { throw new ManagedControlError('provider_not_configured', 'managed configuration provider is not configured'); }
}

export class SyntheticConfigProvider extends ManagedConfigProvider {
  constructor(entries = {}) { super(); this.entries = new Map(Object.entries(entries)); }
  async getConfig(reference) {
    const config = this.entries.get(reference);
    if (!config) throw new ManagedControlError('config_not_found', 'managed configuration reference was not found');
    return { reference, config: structuredClone(config), version: config.version ?? 'synthetic-1', synthetic_only: true };
  }
}

function fail(code, message) { throw new ManagedControlError(code, message); }
function validRef(value, prefix) { return typeof value === 'string' && value.length <= 256 && value.startsWith(`${prefix}://`) && !/[\r\n]/.test(value); }
function validDate(value) { return value == null || (typeof value === 'string' && !Number.isNaN(Date.parse(value))); }
function validateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) fail('config_invalid', 'managed configuration must be an object');
  const keys = Object.keys(config);
  if (keys.some((key) => !/^[a-z][a-z0-9_]{0,63}$/.test(key))) fail('config_invalid', 'managed configuration contains an invalid key');
  if (config.schema_version !== undefined && (typeof config.schema_version !== 'string' || config.schema_version !== 'upfs.runtime-config.v1')) fail('config_version_invalid', 'managed configuration schema version is invalid');
  for (const [key, value] of Object.entries(config)) if (!['string', 'number', 'boolean'].includes(typeof value) && value !== null) fail('config_invalid', `managed configuration value is not scalar: ${key}`);
  return config;
}

export async function loadManagedEnvironment({ environment, secretRef, configRef, signingKeyRef, secretProvider, configProvider, signingKeyProvider, now = new Date() } = {}) {
  if (!environments.has(environment)) fail('invalid_environment', 'environment is not recognized');
  const required = managedEnvironments.has(environment);
  if (required && (!validRef(secretRef, 'secret') || !validRef(configRef, 'config') || !validRef(signingKeyRef, 'key'))) fail('managed_references_required', 'pilot/production requires managed secret, config, and signing-key references');
  if (!required) return { environment, managed: false, synthetic_only: true, config: {} };
  if (!secretProvider || !configProvider || !signingKeyProvider) fail('provider_not_configured', 'managed providers are required');
  const [secret, config, signingKey] = await Promise.all([secretProvider.getSecret(secretRef), configProvider.getConfig(configRef), signingKeyProvider.getSigningKey(signingKeyRef)]);
  if (secret.synthetic_only || config.synthetic_only || signingKey.synthetic_only) fail('synthetic_provider_forbidden', 'synthetic providers cannot be used by pilot/production');
  if (typeof secret.value !== 'string' || secret.value.length < 32) fail('secret_invalid', 'managed signing secret is missing or too short');
  if (!validDate(secret.expires_at) || (secret.expires_at && new Date(secret.expires_at) <= now)) fail('secret_expired', 'managed signing secret is expired');
  if (secret.rotated_at && !validDate(secret.rotated_at)) fail('secret_metadata_invalid', 'managed secret rotation metadata is invalid');
  if (secret.rotation_due && (!validDate(secret.rotation_due) || new Date(secret.rotation_due) <= now)) fail('secret_rotation_due', 'managed signing secret requires rotation');
  if (!secret.version || typeof secret.version !== 'string') fail('secret_version_required', 'managed secret version is required for rotation tracking');
  if (typeof signingKey.value !== 'string' || signingKey.value.length < 32) fail('signing_key_invalid', 'managed signing key is missing or too short');
  if (!validDate(signingKey.expires_at) || (signingKey.expires_at && new Date(signingKey.expires_at) <= now)) fail('signing_key_expired', 'managed signing key is expired');
  if (!signingKey.version || typeof signingKey.version !== 'string') fail('signing_key_version_required', 'managed signing key version is required for rotation tracking');
  validateConfig(config.config);
  return { environment, managed: true, synthetic_only: false, secret_reference: secretRef, config_reference: configRef, signing_key_reference: signingKeyRef, secret_version: secret.version, config_version: config.version, signing_key_version: signingKey.version, config: config.config, signing_material: Object.freeze({ value: signingKey.value, reference: signingKeyRef, version: signingKey.version, provider: 'managed' }) };
}

export function signReleaseManifest(canonicalManifest, material) {
  if (typeof canonicalManifest !== 'string' || material?.provider !== 'managed' || typeof material?.value !== 'string' || !material.reference || !material.version) fail('signing_input_invalid', 'manifest and provider-resolved managed signing material are required');
  return crypto.createHmac('sha256', material.value).update(canonicalManifest).digest('hex');
}

export function verifyReleaseManifest(canonicalManifest, signature, secret) {
  if (!/^[a-f0-9]{64}$/.test(signature ?? '')) return false;
  const expected = signReleaseManifest(canonicalManifest, secret);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function protectedPromotionGate({ environment, approval, artifact, health, reconciliation } = {}) {
  if (!environments.has(environment) || (environment !== 'pilot' && environment !== 'production')) return { allowed: false, reason: 'unknown or unprotected environment' };
  if (!approval || approval.approved !== true || typeof approval.approver !== 'string' || !approval.approver.trim() || typeof approval.evidence !== 'string' || !approval.evidence.trim() || !validDate(approval.expires_at) || new Date(approval.expires_at) <= new Date()) return { allowed: false, reason: 'nonempty, unexpired approval evidence and approver are required' };
  if (environment === 'production' && approval.dual_control !== true) return { allowed: false, reason: 'dual control is required for production' };
  if (artifact?.immutable !== true || artifact?.signature_verified !== true || typeof artifact?.signing_key_reference !== 'string' || !validRef(artifact.signing_key_reference, 'key')) return { allowed: false, reason: 'immutable managed-key signature verification is required' };
  if (health?.passed !== true || reconciliation?.zero_drift !== true) return { allowed: false, reason: 'health and reconciliation gates must pass' };
  return { allowed: true, reason: 'protected promotion gates passed' };
}
