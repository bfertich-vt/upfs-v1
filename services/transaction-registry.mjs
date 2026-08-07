import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION = /^\d+\.\d+\.\d+$/;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const TAXONOMY_FIELDS = [
  "domain",
  "family",
  "class",
  "subclass",
  "intent",
  "cash_flow_role",
  "tax_relevance",
  "recurrence",
];
const RECORD_FIELDS = new Set([
  "id",
  "tenant_id",
  "environment_id",
  "account_id",
  "amount",
  "currency",
  "posted_at",
  "schema_version",
  "lifecycle_state",
  "valid_time",
  "system_time",
  "source_observations",
  "evidence_refs",
  "confidence",
  "provenance",
  "data_classification",
  "created_by",
  "updated_by",
  "version",
  "provider_categories",
  "taxonomy",
  "merchant_confidence",
  "description",
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

export function generateRegistry({
  schemaDir,
  output,
  repositoryRoot = path.resolve(schemaDir, "..", ".."),
  beforePublish = null,
}) {
  const files = fs
    .readdirSync(schemaDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();
  const schemas = files.map((file) => {
    const absolute = path.join(schemaDir, file);
    const raw = fs.readFileSync(absolute);
    const schema = JSON.parse(raw.toString("utf8"));
    const id = schema.$id;
    const version =
      schema.properties?.schema_version?.const ??
      id?.match(/\/(\d+\.\d+\.\d+)$/)?.[1] ??
      "1.0.0";
    if (
      typeof id !== "string" ||
      !id.startsWith("https://") ||
      !VERSION.test(version ?? "")
    ) {
      throw new Error(`invalid_schema_identity:${file}`);
    }
    const sourcePath = path
      .relative(repositoryRoot, absolute)
      .split(path.sep)
      .join("/");
    if (sourcePath.startsWith("../") || path.isAbsolute(sourcePath))
      throw new Error(`unsafe_schema_path:${file}`);
    return {
      schema_id: id,
      schema_version: version,
      source_path: sourcePath,
      sha256: sha256(raw),
    };
  });
  const registry = { registry_version: "1.0.0", schemas };
  const serialized = `${JSON.stringify(registry, null, 2)}\n`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temporary = `${output}.tmp-${process.pid}-${crypto.randomUUID()}`;
  try {
    fs.writeFileSync(temporary, serialized, { flag: "wx" });
    beforePublish?.({ temporary, output, registry });
    fs.renameSync(temporary, output);
  } catch (error) {
    fs.rmSync(temporary, { force: true });
    throw error;
  }
  return registry;
}

export class CanonicalTransactionService {
  #records = new Map();
  #history = new Map();
  #idempotency = new Map();
  #audit = [];

  constructor({
    deriveScope = () => null,
    now = () => new Date(),
    beforeCommit = null,
  } = {}) {
    this.deriveScope = deriveScope;
    this.now = now;
    this.beforeCommit = beforeCommit;
  }

  upsert({ actor, transaction, idempotencyKey, ifMatch }) {
    const canonicalActor = normalizeVerifiedActor(actor);
    if (!canonicalActor)
      return this.#error(
        actor ? 404 : 401,
        actor ? "resource_not_found" : "authentication_required",
      );
    const scope = this.#scope(canonicalActor, "transaction:write");
    if (!scope)
      return this.#denial(404, "resource_not_found", null, canonicalActor);
    if (
      transaction?.tenant_id !== scope.tenantId ||
      transaction?.environment_id !== scope.environmentId
    ) {
      return this.#denial(
        404,
        "resource_not_found",
        scope,
        canonicalActor,
        transaction?.id,
      );
    }
    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.length < 16 ||
      idempotencyKey.length > 200
    ) {
      return this.#error(400, "idempotency_key_required");
    }
    if (
      ["system_time", "created_by", "updated_by", "version"].some((key) =>
        Object.hasOwn(transaction, key),
      )
    )
      return this.#error(400, "server_managed_field");
    const validation = validateTransaction(transaction);
    if (validation) return this.#error(400, validation);
    const payloadHash = sha256(JSON.stringify(stable(transaction)));
    const idem = `${scope.tenantId}|${scope.environmentId}|${canonicalActor.issuer}|${canonicalActor.subject}|${idempotencyKey}`;
    const replay = this.#idempotency.get(idem);
    if (replay) {
      if (replay.payloadHash !== payloadHash)
        return this.#error(409, "idempotency_conflict");
      this.#appendAudit(
        "transaction.upsert",
        "replayed",
        scope,
        canonicalActor,
        transaction.id,
        replay.result.body.version,
      );
      return structuredClone(replay.result);
    }
    const key = `${scope.tenantId}|${scope.environmentId}|${transaction.id}`;
    const prior = this.#records.get(key);
    if (prior && ifMatch !== `"${prior.version}"`)
      return this.#error(412, "precondition_failed");
    if (!prior && ifMatch !== undefined)
      return this.#error(412, "precondition_failed");
    const version = prior ? prior.version + 1 : 1;
    const now = this.now().toISOString();
    const record = Object.freeze({
      ...structuredClone(transaction),
      version,
      system_time: { from: now, to: null },
      created_by:
        prior?.created_by ??
        `${canonicalActor.issuer}|${canonicalActor.subject}`,
      updated_by: `${canonicalActor.issuer}|${canonicalActor.subject}`,
      provenance: [
        ...transaction.provenance,
        {
          kind: "canonicalized",
          actor: `${canonicalActor.issuer}|${canonicalActor.subject}`,
          at: now,
          source_ref: `transaction:${transaction.id}:v${version}`,
        },
      ],
    });
    const result = {
      status: prior ? 200 : 201,
      body: structuredClone(record),
      headers: { etag: `"${version}"` },
    };
    try {
      this.beforeCommit?.({
        action: "transaction.upsert",
        record: structuredClone(record),
      });
    } catch {
      this.#appendAudit(
        "transaction.upsert",
        "failed",
        scope,
        canonicalActor,
        transaction.id,
        prior?.version ?? null,
      );
      return this.#error(503, "write_failed", true);
    }
    this.#records.set(key, record);
    this.#history.set(
      key,
      Object.freeze([...(this.#history.get(key) ?? []), record]),
    );
    this.#idempotency.set(
      idem,
      Object.freeze({ payloadHash, result: structuredClone(result) }),
    );
    this.#appendAudit(
      "transaction.upsert",
      prior ? "updated" : "created",
      scope,
      canonicalActor,
      transaction.id,
      version,
    );
    return result;
  }

  get({ actor, id }) {
    const canonicalActor = normalizeVerifiedActor(actor);
    if (!canonicalActor)
      return this.#error(
        actor ? 404 : 401,
        actor ? "resource_not_found" : "authentication_required",
      );
    const scope = this.#scope(canonicalActor, "transaction:read");
    if (!scope)
      return this.#denial(404, "resource_not_found", null, canonicalActor, id);
    const record = this.#records.get(
      `${scope.tenantId}|${scope.environmentId}|${id}`,
    );
    if (!record)
      return this.#denial(404, "resource_not_found", scope, canonicalActor, id);
    this.#appendAudit(
      "transaction.read",
      "read",
      scope,
      canonicalActor,
      id,
      record.version,
    );
    return {
      status: 200,
      body: structuredClone(record),
      headers: { etag: `"${record.version}"` },
    };
  }

  history({ actor, id }) {
    const canonicalActor = normalizeVerifiedActor(actor);
    if (!canonicalActor)
      return this.#error(
        actor ? 404 : 401,
        actor ? "resource_not_found" : "authentication_required",
      );
    const scope = this.#scope(canonicalActor, "transaction:read");
    if (!scope)
      return this.#denial(404, "resource_not_found", null, canonicalActor, id);
    const records = this.#history.get(
      `${scope.tenantId}|${scope.environmentId}|${id}`,
    );
    if (!records)
      return this.#denial(404, "resource_not_found", scope, canonicalActor, id);
    this.#appendAudit(
      "transaction.history",
      "read",
      scope,
      canonicalActor,
      id,
      records.at(-1).version,
    );
    return { status: 200, body: structuredClone(records) };
  }

  audit() {
    return structuredClone(this.#audit);
  }

  #scope(actor, permission) {
    if (
      !actor ||
      actor.verified !== true ||
      !isCanonicalString(actor.issuer, 2048) ||
      !isCanonicalString(actor.subject, 300)
    )
      return null;
    let scope;
    try {
      scope = this.deriveScope(actor, permission);
    } catch {
      return null;
    }
    if (
      !scope ||
      !UUID.test(scope.tenantId ?? "") ||
      !UUID.test(scope.environmentId ?? "") ||
      scope.authorized !== true
    )
      return null;
    return Object.freeze({
      tenantId: scope.tenantId,
      environmentId: scope.environmentId,
    });
  }

  #appendAudit(
    action,
    outcome,
    scope,
    actor = null,
    resourceId = null,
    version = null,
  ) {
    this.#audit.push(
      Object.freeze({
        sequence: this.#audit.length + 1,
        action,
        outcome,
        tenant_id: scope?.tenantId ?? null,
        environment_id: scope?.environmentId ?? null,
        resource_id: resourceId,
        actor: actor ? `${actor.issuer}|${actor.subject}` : null,
        version,
      }),
    );
  }

  #denial(status, code, scope = null, actor = null, id = null) {
    this.#appendAudit("transaction.access", "denied", scope, actor, id, null);
    return this.#error(status, code);
  }

  #error(status, code, retryable = false) {
    return { status, body: { code, retryable } };
  }
}

export function validateTransaction(t) {
  if (
    !t ||
    typeof t !== "object" ||
    Array.isArray(t) ||
    Object.keys(t).some((key) => !RECORD_FIELDS.has(key))
  )
    return "invalid_transaction";
  const required = [
    "id",
    "tenant_id",
    "environment_id",
    "account_id",
    "amount",
    "currency",
    "posted_at",
    "schema_version",
    "lifecycle_state",
    "valid_time",
    "source_observations",
    "evidence_refs",
    "confidence",
    "provenance",
    "data_classification",
    "provider_categories",
    "taxonomy",
  ];
  if (
    required.some(
      (key) => t[key] === undefined || t[key] === null || t[key] === "",
    )
  )
    return "invalid_transaction";
  if (
    ![t.id, t.tenant_id, t.environment_id, t.account_id].every(
      (value) => typeof value === "string" && UUID.test(value),
    )
  )
    return "invalid_transaction";
  if (
    typeof t.amount !== "string" ||
    !/^-?(?:0|[1-9]\d{0,17})(?:\.\d{1,4})?$/.test(t.amount) ||
    /^-0(?:\.0+)?$/.test(t.amount)
  )
    return "invalid_money";
  if (typeof t.currency !== "string" || !/^[A-Z]{3}$/.test(t.currency))
    return "invalid_money";
  if (
    !isValidDateTime(t.posted_at) ||
    !VERSION.test(t.schema_version) ||
    !["active", "corrected", "voided"].includes(t.lifecycle_state)
  )
    return "invalid_transaction";
  if (
    !validInterval(t.valid_time) ||
    (t.system_time !== undefined && !validInterval(t.system_time))
  )
    return "invalid_time";
  if (
    !validUniqueStrings(t.evidence_refs) ||
    !validUniqueStrings(t.source_observations)
  )
    return "invalid_evidence";
  if (
    typeof t.confidence !== "number" ||
    !Number.isFinite(t.confidence) ||
    t.confidence < 0 ||
    t.confidence > 1
  )
    return "invalid_evidence";
  if (
    !["restricted", "confidential", "internal"].includes(t.data_classification)
  )
    return "invalid_classification";
  if (
    !Array.isArray(t.provider_categories) ||
    t.provider_categories.length === 0 ||
    t.provider_categories.some(
      (entry) =>
        !entry ||
        !isCanonicalString(entry.provider, 100) ||
        !isCanonicalString(entry.category, 300) ||
        Object.keys(entry).some(
          (key) => !["provider", "category"].includes(key),
        ),
    )
  )
    return "invalid_provider_category";
  if (
    !t.taxonomy ||
    typeof t.taxonomy !== "object" ||
    Array.isArray(t.taxonomy) ||
    Object.keys(t.taxonomy).sort().join("|") !==
      TAXONOMY_FIELDS.slice().sort().join("|") ||
    TAXONOMY_FIELDS.some((key) => !isCanonicalString(t.taxonomy[key], 100))
  )
    return "invalid_taxonomy";
  if (
    !Array.isArray(t.provenance) ||
    t.provenance.length === 0 ||
    t.provenance.some(
      (entry) =>
        !entry ||
        Object.keys(entry).some(
          (key) => !["kind", "actor", "at", "source_ref"].includes(key),
        ) ||
        !isCanonicalString(entry.kind, 100) ||
        !isCanonicalString(entry.actor, 300) ||
        !isValidDateTime(entry.at) ||
        !isCanonicalString(entry.source_ref, 300),
    )
  )
    return "invalid_provenance";
  if (
    t.description !== undefined &&
    (typeof t.description !== "string" || t.description.length > 2048)
  )
    return "invalid_transaction";
  if (
    t.merchant_confidence !== undefined &&
    (typeof t.merchant_confidence !== "number" ||
      !Number.isFinite(t.merchant_confidence) ||
      t.merchant_confidence < 0 ||
      t.merchant_confidence > 1)
  )
    return "invalid_transaction";
  return null;
}

function validUniqueStrings(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => isCanonicalString(entry, 300)) &&
    new Set(value).size === value.length
  );
}

function isCanonicalString(value, maximumLength) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximumLength &&
    value === value.trim() &&
    !CONTROL_CHARACTER.test(value)
  );
}

function normalizeVerifiedActor(actor) {
  if (
    !actor ||
    actor.verified !== true ||
    typeof actor.issuer !== "string" ||
    typeof actor.subject !== "string"
  )
    return null;
  const issuer = actor.issuer.trim();
  const subject = actor.subject.trim();
  if (
    !isCanonicalString(issuer, 2048) ||
    !isCanonicalString(subject, 300) ||
    CONTROL_CHARACTER.test(actor.issuer) ||
    CONTROL_CHARACTER.test(actor.subject)
  )
    return null;
  return Object.freeze({ ...actor, issuer, subject });
}

function validInterval(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => ["from", "to"].includes(key)) &&
    isValidDateTime(value.from) &&
    (value.to === null ||
      (isValidDateTime(value.to) &&
        Date.parse(value.to) > Date.parse(value.from)))
  );
}

function isValidDateTime(value) {
  if (typeof value !== "string") return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!match || Number.isNaN(Date.parse(value))) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= new Date(Date.UTC(year, month, 0)).getUTCDate() &&
    Number(hourText) <= 23 &&
    Number(minuteText) <= 59 &&
    Number(secondText) <= 59
  );
}
