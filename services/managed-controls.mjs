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

/** In-memory provider intentionally restricted to synthetic test/development environments. */
export class SyntheticSecretProvider extends ManagedSecretProvider {
  constructor(entries = {}) { super(); this.entries = new Map(Object.entries(entries)); }
  async getSecret(reference) {
    const entry = this.entries.get(reference);
    if (!entry) throw new ManagedControlError('secret_not_found', 'managed secret reference was not found');
    return { reference, value: entry.value, version: entry.version ?? 'synthetic-1', expires_at: entry.expires_at ?? null, rotated_at: entry.rotated_at ?? null, synthetic_only: true };
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

export async function loadManagedEnvironment({ environment, secretRef, configRef, signingKeyRef, secretProvider, configProvider, now = new Date() } = {}) {
  if (!environments.has(environment)) fail('invalid_environment', 'environment is not recognized');
  const required = managedEnvironments.has(environment);
  if (required && (!validRef(secretRef, 'secret') || !validRef(configRef, 'config') || !validRef(signingKeyRef, 'key'))) fail('managed_references_required', 'pilot/production requires managed secret, config, and signing-key references');
  if (!required) return { environment, managed: false, synthetic_only: true, config: {} };
  if (!secretProvider || !configProvider) fail('provider_not_configured', 'managed providers are required');
  const [secret, config] = await Promise.all([secretProvider.getSecret(secretRef), configProvider.getConfig(configRef)]);
  if (secret.synthetic_only || config.synthetic_only) fail('synthetic_provider_forbidden', 'synthetic providers cannot be used by pilot/production');
  if (typeof secret.value !== 'string' || secret.value.length < 32) fail('secret_invalid', 'managed signing secret is missing or too short');
  if (!validDate(secret.expires_at) || (secret.expires_at && new Date(secret.expires_at) <= now)) fail('secret_expired', 'managed signing secret is expired');
  if (secret.rotated_at && !validDate(secret.rotated_at)) fail('secret_metadata_invalid', 'managed secret rotation metadata is invalid');
  if (secret.rotation_due && (!validDate(secret.rotation_due) || new Date(secret.rotation_due) <= now)) fail('secret_rotation_due', 'managed signing secret requires rotation');
  if (!secret.version || typeof secret.version !== 'string') fail('secret_version_required', 'managed secret version is required for rotation tracking');
  return { environment, managed: true, synthetic_only: false, secret_reference: secretRef, config_reference: configRef, signing_key_reference: signingKeyRef, secret_version: secret.version, config_version: config.version, config: config.config };
}

export function signReleaseManifest(canonicalManifest, secret) {
  if (typeof canonicalManifest !== 'string' || typeof secret?.value !== 'string') fail('signing_input_invalid', 'manifest and managed signing key are required');
  return crypto.createHmac('sha256', secret.value).update(canonicalManifest).digest('hex');
}

export function verifyReleaseManifest(canonicalManifest, signature, secret) {
  if (!/^[a-f0-9]{64}$/.test(signature ?? '')) return false;
  const expected = signReleaseManifest(canonicalManifest, secret);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function protectedPromotionGate({ environment, approval, artifact, health, reconciliation } = {}) {
  if (!managedEnvironments.has(environment)) return { allowed: true, reason: 'non-managed environment' };
  if (approval !== true) return { allowed: false, reason: 'explicit external approval is required' };
  if (artifact?.immutable !== true || artifact?.signature_verified !== true) return { allowed: false, reason: 'immutable signed artifact verification is required' };
  if (health?.passed !== true || reconciliation?.zero_drift !== true) return { allowed: false, reason: 'health and reconciliation gates must pass' };
  return { allowed: true, reason: 'protected promotion gates passed' };
}
