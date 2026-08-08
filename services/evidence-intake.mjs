import crypto from "node:crypto";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_TEXT = /^[^\u0000-\u001f\u007f]{1,200}$/u;
const MEDIA_TYPES = new Set([
  "application/json",
  "application/pdf",
  "text/csv",
  "text/plain",
]);
const CLASSIFICATIONS = new Set(["clear", "suspicious", "blocked"]);

const contentHash = (content) =>
  crypto.createHash("sha256").update(content, "utf8").digest("hex");
const requestHash = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function safeIdentity(actor) {
  return Boolean(
    actor &&
    actor.verified === true &&
    typeof actor.issuer === "string" &&
    SAFE_TEXT.test(actor.issuer) &&
    typeof actor.subject === "string" &&
    SAFE_TEXT.test(actor.subject),
  );
}

const UTC_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/;

function parseDateTime(value) {
  if (typeof value !== "string") return null;
  const match = UTC_DATE_TIME.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59)
    return null;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  if (day < 1 || day > daysInMonth[month - 1]) return null;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  const epochSecond = BigInt(Math.trunc(date.getTime() / 1_000));
  const nanoseconds = BigInt((match[7] ?? "").padEnd(9, "0") || "0");
  return epochSecond * 1_000_000_000n + nanoseconds;
}

function validDateTime(value) {
  return parseDateTime(value) !== null;
}

function validScope(scope) {
  return (
    scope &&
    UUID.test(scope.organization_id) &&
    UUID.test(scope.tenant_id) &&
    UUID.test(scope.environment_id)
  );
}

function normalizeScope(value) {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const prototype = Reflect.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    const expected = ["environment_id", "organization_id", "tenant_id"];
    if (
      keys.length !== expected.length ||
      keys.some((key) => typeof key !== "string") ||
      [...keys].sort().some((key, index) => key !== expected[index])
    )
      return null;
    const normalized = {};
    for (const key of expected) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !("value" in descriptor) ||
        typeof descriptor.value !== "string" ||
        !UUID.test(descriptor.value)
      )
        return null;
      normalized[key] = descriptor.value;
    }
    return Object.freeze(normalized);
  } catch {
    return null;
  }
}

function result(status, code, retryable = false) {
  return { status, body: { code, retryable } };
}

async function boundedScan(scan, input, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => scan(input)),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("scanner_timeout")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * In-memory reference boundary. Production requires durable immutable blob storage,
 * PostgreSQL/RLS, an outbox, managed scanners, OIDC verification, and API routing.
 */
export class RawEvidenceIntakeService {
  #records = new Map();
  #idempotency = new Map();
  #audit = [];
  #sequence = 0;
  #writeTail = Promise.resolve();

  constructor({
    deriveScope = () => null,
    scan = async () => ({
      content: "clear",
      malware: "clear",
      prompt_injection: "clear",
    }),
    scannerTimeoutMs = 250,
    beforeCommit = async () => {},
    now = () => new Date(),
  } = {}) {
    this.deriveScope = deriveScope;
    this.scan = scan;
    this.scannerTimeoutMs = Math.max(10, Math.min(scannerTimeoutMs, 5_000));
    this.beforeCommit = beforeCommit;
    this.now = now;
  }

  async intake({ actor, evidence, idempotencyKey, ifNoneMatch }) {
    return this.#serialize(() =>
      this.#intake({ actor, evidence, idempotencyKey, ifNoneMatch }),
    );
  }

  async #intake({ actor, evidence, idempotencyKey, ifNoneMatch }) {
    if (!safeIdentity(actor)) return result(401, "authentication_required");
    const scope = await this.#scope(actor);
    if (!validScope(scope)) return result(403, "forbidden");
    if (!validIdempotencyKey(idempotencyKey))
      return result(400, "idempotency_key_required");
    if (ifNoneMatch !== "*") return result(428, "precondition_required");

    const validation = validateEvidence(evidence);
    if (validation) return result(400, validation);
    if (
      evidence.organization_id !== scope.organization_id ||
      evidence.tenant_id !== scope.tenant_id ||
      evidence.environment_id !== scope.environment_id
    ) {
      return result(404, "resource_not_found");
    }

    const scopeKey = `${scope.organization_id}|${scope.tenant_id}|${scope.environment_id}`;
    const idempotencyId = `${scopeKey}|${actor.issuer}|${actor.subject}|${idempotencyKey}`;
    const payloadHash = requestHash(evidence);
    const prior = this.#idempotency.get(idempotencyId);
    if (prior) {
      if (prior.payload_hash !== payloadHash)
        return result(409, "idempotency_conflict");
      return clone(prior.result);
    }
    const recordId = `${scopeKey}|${evidence.id}`;
    if (this.#records.has(recordId))
      return result(409, "evidence_already_exists");

    let scanResult;
    try {
      scanResult = await boundedScan(
        this.scan,
        {
          content: evidence.content,
          media_type: evidence.media_type,
          content_hash: evidence.content_hash,
        },
        this.scannerTimeoutMs,
      );
    } catch {
      return result(503, "scanner_unavailable", true);
    }
    const scanValidation = validateScan(scanResult);
    if (scanValidation)
      return result(
        scanValidation.status,
        scanValidation.code,
        scanValidation.retryable,
      );

    let ingestedAt;
    try {
      ingestedAt = this.now().toISOString();
    } catch {
      return result(503, "clock_unavailable", true);
    }
    if (!validDateTime(ingestedAt))
      return result(503, "clock_unavailable", true);
    const record = {
      ...clone(evidence),
      status: "quarantined",
      scan: clone(scanResult),
      ingested_at: ingestedAt,
      version: 1,
    };
    const response = {
      status: 201,
      body: clone(record),
      headers: { etag: `"${evidence.id}:1"` },
    };
    const audit = this.#auditEntry({
      actor,
      scope,
      resourceId: evidence.id,
      outcome: "quarantined",
      at: ingestedAt,
    });

    try {
      await this.beforeCommit({
        operation: "evidence.intake",
        resource_id: evidence.id,
      });
    } catch {
      return result(503, "commit_failed", true);
    }

    // Publish all state only after every fallible dependency has succeeded.
    const records = new Map(this.#records);
    const idempotency = new Map(this.#idempotency);
    records.set(recordId, clone(record));
    idempotency.set(idempotencyId, {
      payload_hash: payloadHash,
      result: clone(response),
    });
    this.#records = records;
    this.#idempotency = idempotency;
    this.#audit = [...this.#audit, audit];
    this.#sequence = audit.sequence;
    return clone(response);
  }

  async get({ actor, id }) {
    if (!safeIdentity(actor)) return result(401, "authentication_required");
    const scope = await this.#scope(actor);
    if (!validScope(scope) || !UUID.test(id ?? ""))
      return result(404, "resource_not_found");
    const key = `${scope.organization_id}|${scope.tenant_id}|${scope.environment_id}|${id}`;
    const record = this.#records.get(key);
    return record
      ? { status: 200, body: clone(record) }
      : result(404, "resource_not_found");
  }

  audit() {
    return clone(this.#audit);
  }

  async #scope(actor) {
    try {
      return normalizeScope(
        await this.deriveScope({
          issuer: actor.issuer,
          subject: actor.subject,
        }),
      );
    } catch {
      return null;
    }
  }

  #serialize(operation) {
    const pending = this.#writeTail.then(operation, operation);
    this.#writeTail = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  }

  #auditEntry({ actor, scope, resourceId, outcome, at }) {
    return {
      sequence: this.#sequence + 1,
      action: "evidence.intake",
      actor: `${actor.issuer}|${actor.subject}`,
      organization_id: scope.organization_id,
      tenant_id: scope.tenant_id,
      environment_id: scope.environment_id,
      resource_id: resourceId,
      outcome,
      occurred_at: at,
    };
  }
}

function validIdempotencyKey(value) {
  return (
    typeof value === "string" &&
    value.length >= 16 &&
    value.length <= 200 &&
    SAFE_TEXT.test(value)
  );
}

function validateScan(value) {
  const keys = ["content", "malware", "prompt_injection"];
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !CLASSIFICATIONS.has(value[key]))
  ) {
    return { status: 503, code: "scanner_invalid_result", retryable: true };
  }
  if (value.malware !== "clear")
    return { status: 422, code: "malware_detected", retryable: false };
  if (value.prompt_injection !== "clear")
    return { status: 422, code: "prompt_injection_detected", retryable: false };
  if (value.content !== "clear")
    return { status: 422, code: "content_rejected", retryable: false };
  return null;
}

export function validateEvidence(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence))
    return "invalid_evidence";
  const required = [
    "id",
    "organization_id",
    "tenant_id",
    "environment_id",
    "correlation_id",
    "source",
    "media_type",
    "content",
    "content_size",
    "content_hash",
    "observed_at",
    "provenance",
  ];
  if (
    Object.keys(evidence).length !== required.length ||
    required.some((key) => !(key in evidence))
  )
    return "invalid_evidence";
  if (
    ![
      "id",
      "organization_id",
      "tenant_id",
      "environment_id",
      "correlation_id",
    ].every((key) => UUID.test(evidence[key] ?? ""))
  )
    return "invalid_identifier";
  if (
    !SAFE_TEXT.test(evidence.source ?? "") ||
    !MEDIA_TYPES.has(evidence.media_type)
  )
    return "invalid_metadata";
  if (
    typeof evidence.content !== "string" ||
    evidence.content.length === 0 ||
    /\u0000/.test(evidence.content)
  )
    return "invalid_content";
  const bytes = Buffer.byteLength(evidence.content, "utf8");
  if (
    !Number.isSafeInteger(evidence.content_size) ||
    evidence.content_size !== bytes ||
    bytes > 10_000_000
  )
    return "invalid_content_size";
  if (
    !SHA256.test(evidence.content_hash ?? "") ||
    evidence.content_hash !== contentHash(evidence.content)
  )
    return "invalid_content_hash";
  if (!validDateTime(evidence.observed_at)) return "invalid_observed_at";
  const provenance = evidence.provenance;
  if (
    !provenance ||
    typeof provenance !== "object" ||
    Array.isArray(provenance)
  )
    return "invalid_provenance";
  const provenanceKeys = ["source_system", "source_record_id", "captured_at"];
  if (
    Object.keys(provenance).length !== provenanceKeys.length ||
    provenanceKeys.some((key) => !(key in provenance))
  )
    return "invalid_provenance";
  if (
    !SAFE_TEXT.test(provenance.source_system ?? "") ||
    !SAFE_TEXT.test(provenance.source_record_id ?? "") ||
    !validDateTime(provenance.captured_at)
  )
    return "invalid_provenance";
  if (
    parseDateTime(provenance.captured_at) < parseDateTime(evidence.observed_at)
  )
    return "invalid_provenance";
  return null;
}
