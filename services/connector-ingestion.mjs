import crypto from "node:crypto";
import { RawEvidenceIntakeService } from "./evidence-intake.mjs";
import {
  CanonicalTransactionService,
  containsControlCharacter,
  isCanonicalMetadataString,
} from "./transaction-registry.mjs";

const clone = (value) =>
  value === null || typeof value !== "object"
    ? value
    : Array.isArray(value)
      ? value.map(clone)
      : Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, clone(v)]),
        );
const digest = (value) =>
  crypto
    .createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value), "utf8")
    .digest("hex");
const bodyBytes = (payload) => JSON.stringify(payload);
const deterministicUuid = (value) => {
  const hex = digest(value).slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
};
const error = (status, code, retryable = false, details = undefined) => ({
  status,
  body: { code, retryable, ...(details ? { details } : {}) },
});
/**
 * API-backed reference boundary for provider transaction delivery. Provider
 * secrets, stores, and scanners are injected; no real credentials are used.
 */
export class ConnectorIngestionService {
  #connectors = new Map();
  #nonces = new Map();
  #idempotency = new Map();
  #audit = [];
  #tail = Promise.resolve();
  constructor({
    connectors = [],
    evidence = new RawEvidenceIntakeService(),
    canonical = new CanonicalTransactionService(),
    now = () => new Date(),
    replayWindowSeconds = 300,
  } = {}) {
    this.evidence = evidence;
    this.canonical = canonical;
    this.now = now;
    this.replayWindowSeconds = replayWindowSeconds;
    for (const connector of connectors)
      this.#connectors.set(
        connector.id,
        Object.create(
          Object.getPrototypeOf(connector),
          Object.getOwnPropertyDescriptors(connector),
        ),
      );
  }
  async ingest({
    actor,
    connectorId,
    timestamp,
    nonce,
    payload,
    signature,
    idempotencyKey,
  }) {
    return this.#serialize(() =>
      this.#ingest({
        actor,
        connectorId,
        timestamp,
        nonce,
        payload,
        signature,
        idempotencyKey,
      }),
    );
  }
  async ingestPage({
    actor,
    connectorId,
    timestamp,
    nonce,
    payload,
    signature,
    idempotencyKey,
  }) {
    return this.#serialize(async () => {
      const canonicalActor = normalizeVerifiedActor(actor);
      if (!canonicalActor) return error(401, "authentication_required");
      const connector = this.#connectors.get(connectorId);
      if (!connector) return error(404, "connector_not_found");
      if (!isCanonicalMetadataString(connector.provider, 100))
        return error(400, "invalid_provider_category");
      if (
        !Number.isInteger(timestamp) ||
        Math.abs(this.now().getTime() / 1000 - timestamp) >
          this.replayWindowSeconds
      )
        return error(401, "signature_timestamp_out_of_window");
      if (typeof nonce !== "string" || nonce.length < 16 || nonce.length > 160)
        return error(401, "invalid_nonce");
      if (
        !this.#verifySignature(connector, timestamp, nonce, payload, signature)
      )
        return error(401, "invalid_signature");
      if (
        !connector.authorize?.(
          canonicalActor,
          connector.tenantId,
          connector.environmentId,
        )
      )
        return error(403, "forbidden");
      if (typeof idempotencyKey !== "string" || idempotencyKey.length < 16)
        return error(400, "idempotency_key_required");
      const replayKey = `${connector.id}|page|${nonce}`;
      if (this.#nonces.has(replayKey)) return error(409, "replay_detected");
      const key = `${canonicalActor.issuer}|${canonicalActor.subject}|${connector.id}|page|${idempotencyKey}`;
      const payloadHash = digest(payload);
      const prior = this.#idempotency.get(key);
      if (prior)
        return prior.payload_hash === payloadHash
          ? clone(prior.result)
          : error(409, "idempotency_conflict");

      const pageId =
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        isCanonicalMetadataString(payload.page_id, 300)
          ? payload.page_id
          : `invalid-${digest(payload).slice(0, 32)}`;
      const evidenceId = deterministicUuid(`page|${connector.id}|${pageId}`);
      const rawContent = bodyBytes(payload);
      const observedAt = new Date(timestamp * 1000).toISOString();
      const pageEvidence = await this.evidence.intake({
        actor: canonicalActor,
        evidence: {
          id: evidenceId,
          organization_id: connector.organizationId,
          tenant_id: connector.tenantId,
          environment_id: connector.environmentId,
          correlation_id: deterministicUuid(
            `page-correlation|${connector.id}|${timestamp}|${nonce}`,
          ),
          source: `connector:${connector.provider}:${connector.id}:page`,
          media_type: "application/json",
          content: rawContent,
          content_size: Buffer.byteLength(rawContent, "utf8"),
          content_hash: digest(rawContent),
          observed_at: observedAt,
          provenance: {
            source_system: `connector:${connector.provider}`,
            source_record_id: pageId,
            captured_at: observedAt,
          },
        },
        idempotencyKey: `page-evidence-${idempotencyKey}`,
        ifNoneMatch: "*",
      });
      this.#nonces.set(replayKey, true);
      if (pageEvidence.status !== 201)
        return this.#remember(key, payloadHash, pageEvidence);
      if (!isProviderPage(payload)) {
        const invalid = error(422, "provider_page_quarantined", false, {
          evidence_id: evidenceId,
        });
        this.#audit.push({
          action: "connector.page.quarantined",
          connector_id: connector.id,
          tenant_id: connector.tenantId,
          environment_id: connector.environmentId,
          resource_id: evidenceId,
          actor: `${canonicalActor.issuer}|${canonicalActor.subject}`,
          content_hash: digest(rawContent),
        });
        return this.#remember(key, payloadHash, invalid);
      }

      const results = [];
      for (const [index, transaction] of payload.transactions.entries()) {
        const itemNonce = `${nonce}:${index}`;
        let item;
        try {
          item = await this.#ingest({
            actor: canonicalActor,
            connectorId,
            timestamp,
            nonce: itemNonce,
            payload: transaction,
            signature: signProviderPayload({
              secret: connector.secret,
              timestamp,
              nonce: itemNonce,
              payload: transaction,
            }),
            idempotencyKey: `${idempotencyKey}:${index}`,
          });
        } catch {
          item = error(503, "provider_item_failed", true);
        }
        results.push({ index, status: item.status, code: item.body?.code });
      }
      const complete =
        payload.complete === true && results.every((item) => item.status < 400);
      const result = {
        status: complete ? 201 : 207,
        body: {
          page_id: payload.page_id,
          evidence_id: evidenceId,
          complete,
          next_cursor: payload.next_cursor ?? null,
          results,
        },
      };
      this.#audit.push({
        action: complete
          ? "connector.page.canonicalized"
          : "connector.page.partial_quarantine",
        connector_id: connector.id,
        tenant_id: connector.tenantId,
        environment_id: connector.environmentId,
        resource_id: evidenceId,
        actor: `${canonicalActor.issuer}|${canonicalActor.subject}`,
        item_count: results.length,
        failed_count: results.filter((item) => item.status >= 400).length,
      });
      return this.#remember(key, payloadHash, result);
    });
  }
  async #ingest({
    actor,
    connectorId,
    timestamp,
    nonce,
    payload,
    signature,
    idempotencyKey,
  }) {
    const canonicalActor = normalizeVerifiedActor(actor);
    if (!canonicalActor) return error(401, "authentication_required");
    const connector = this.#connectors.get(connectorId);
    if (!connector) return error(404, "connector_not_found");
    if (!isCanonicalMetadataString(connector.provider, 100))
      return error(400, "invalid_provider_category");
    if (
      !Number.isInteger(timestamp) ||
      Math.abs(this.now().getTime() / 1000 - timestamp) >
        this.replayWindowSeconds
    )
      return error(401, "signature_timestamp_out_of_window");
    if (typeof nonce !== "string" || nonce.length < 16 || nonce.length > 200)
      return error(401, "invalid_nonce");
    if (!this.#verifySignature(connector, timestamp, nonce, payload, signature))
      return error(401, "invalid_signature");
    const replayKey = `${connector.id}|${nonce}`;
    if (this.#nonces.has(replayKey)) return error(409, "replay_detected");
    if (!idempotencyKey || idempotencyKey.length < 16)
      return error(400, "idempotency_key_required");
    if (
      !connector.authorize?.(
        canonicalActor,
        connector.tenantId,
        connector.environmentId,
      )
    )
      return error(403, "forbidden");
    const key = `${canonicalActor.issuer}|${canonicalActor.subject}|${connector.id}|${idempotencyKey}`;
    const payloadHash = digest(payload);
    const prior = this.#idempotency.get(key);
    if (prior)
      return prior.payload_hash === payloadHash
        ? clone(prior.result)
        : error(409, "idempotency_conflict");
    const normalized = normalizeProviderTransaction(payload);
    if (normalized.error) return error(400, normalized.error);
    const evidenceId = deterministicUuid(
      `evidence|${connector.id}|${normalized.value.provider_transaction_id}`,
    );
    const correlationId = deterministicUuid(
      `correlation|${connector.id}|${timestamp}|${nonce}`,
    );
    const rawContent = bodyBytes(payload);
    const raw = {
      id: evidenceId,
      organization_id: connector.organizationId,
      tenant_id: connector.tenantId,
      environment_id: connector.environmentId,
      correlation_id: correlationId,
      source: `connector:${connector.provider}:${connector.id}`,
      media_type: "application/json",
      content: rawContent,
      content_size: Buffer.byteLength(rawContent, "utf8"),
      content_hash: digest(rawContent),
      observed_at: new Date(timestamp * 1000).toISOString(),
      provenance: {
        source_system: `connector:${connector.provider}`,
        source_record_id: normalized.value.provider_transaction_id,
        captured_at: new Date(timestamp * 1000).toISOString(),
      },
    };
    let evidenceResult = await this.evidence.intake({
      actor: canonicalActor,
      evidence: raw,
      idempotencyKey: `evidence-${idempotencyKey}`,
      ifNoneMatch: "*",
    });
    this.#nonces.set(replayKey, true);
    if (evidenceResult.status === 409) {
      const existing = await this.evidence.get({
        actor: canonicalActor,
        id: evidenceId,
      });
      if (
        existing.status === 200 &&
        existing.body.content_hash === raw.content_hash &&
        existing.body.tenant_id === connector.tenantId &&
        existing.body.environment_id === connector.environmentId
      )
        evidenceResult = { status: 201, body: existing.body };
    }
    if (evidenceResult.status !== 201)
      return this.#remember(key, payloadHash, evidenceResult);
    const classification = evidenceResult.body.scan;
    if (
      classification.malware !== "clear" ||
      classification.prompt_injection !== "clear" ||
      classification.content !== "clear"
    ) {
      const quarantined = error(422, "evidence_quarantined", false, {
        evidence_id: evidenceId,
        classification,
      });
      this.#audit.push({
        action: "connector.ingest.quarantined",
        connector_id: connector.id,
        tenant_id: connector.tenantId,
        environment_id: connector.environmentId,
        resource_id: evidenceId,
        actor: `${canonicalActor.issuer}|${canonicalActor.subject}`,
        content_hash: raw.content_hash,
      });
      return this.#remember(key, payloadHash, quarantined);
    }
    const transaction = {
      id: deterministicUuid(
        `${connector.id}|${normalized.value.provider_transaction_id}`,
      ),
      tenant_id: connector.tenantId,
      environment_id: connector.environmentId,
      account_id: normalized.value.account_id,
      amount: normalized.value.amount,
      currency: normalized.value.currency,
      posted_at: normalized.value.posted_at,
      schema_version: "1.1.0",
      lifecycle_state: "active",
      valid_time: { from: normalized.value.posted_at, to: null },
      source_observations: [evidenceId],
      evidence_refs: [evidenceId],
      confidence: 1,
      data_classification: "restricted",
      provider_categories: [
        {
          provider: connector.provider,
          category: normalized.value.category ?? "uncategorized",
        },
      ],
      taxonomy: {
        domain: "unclassified",
        family: "unclassified",
        class: "unclassified",
        subclass: "unclassified",
        intent: "unknown",
        cash_flow_role:
          Number.parseFloat(normalized.value.amount) < 0 ? "outflow" : "inflow",
        tax_relevance: "unknown",
        recurrence: "unknown",
      },
      ...(normalized.value.description
        ? { description: normalized.value.description }
        : {}),
      provenance: [
        {
          kind: "provider_observation",
          actor: `connector:${connector.provider}:${connector.id}`,
          at: raw.observed_at,
          source_ref: evidenceId,
        },
      ],
    };
    const result = this.canonical.upsert({
      actor: canonicalActor,
      transaction,
      idempotencyKey: `canonical-${idempotencyKey}`,
    });
    if (result.status >= 400) return this.#remember(key, payloadHash, result);
    this.#audit.push({
      action: "connector.ingest.canonicalized",
      connector_id: connector.id,
      tenant_id: connector.tenantId,
      environment_id: connector.environmentId,
      resource_id: transaction.id,
      evidence_id: evidenceId,
      actor: `${canonicalActor.issuer}|${canonicalActor.subject}`,
      provider_transaction_id: normalized.value.provider_transaction_id,
    });
    return this.#remember(key, payloadHash, {
      ...result,
      body: { ...result.body, evidence_id: evidenceId },
    });
  }
  audit() {
    return clone(this.#audit);
  }
  #serialize(operation) {
    const current = this.#tail.then(operation, operation);
    this.#tail = current.then(
      () => undefined,
      () => undefined,
    );
    return current;
  }
  #remember(key, payloadHash, result) {
    const safe = clone(result);
    this.#idempotency.set(key, { payload_hash: payloadHash, result: safe });
    return safe;
  }
  #verifySignature(connector, timestamp, nonce, payload, signature) {
    if (typeof connector.secret !== "string" || typeof signature !== "string")
      return false;
    const expected = crypto
      .createHmac("sha256", connector.secret)
      .update(`${timestamp}.${nonce}.${bodyBytes(payload)}`, "utf8")
      .digest("hex");
    return (
      /^[a-f0-9]{64}$/.test(signature) &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    );
  }
}

function isProviderPage(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return false;
  const allowed = new Set([
    "page_id",
    "cursor",
    "next_cursor",
    "complete",
    "transactions",
  ]);
  if (
    Reflect.ownKeys(payload).some(
      (key) => typeof key !== "string" || !allowed.has(key),
    )
  )
    return false;
  if (!isCanonicalMetadataString(payload.page_id, 300)) return false;
  if (typeof payload.complete !== "boolean") return false;
  if (!Array.isArray(payload.transactions) || payload.transactions.length > 500)
    return false;
  for (const key of ["cursor", "next_cursor"])
    if (
      payload[key] !== undefined &&
      payload[key] !== null &&
      !isCanonicalMetadataString(payload[key], 2048)
    )
      return false;
  return true;
}

function normalizeVerifiedActor(actor) {
  if (
    !actor ||
    actor.verified !== true ||
    typeof actor.issuer !== "string" ||
    typeof actor.subject !== "string" ||
    !isCanonicalMetadataString(actor.issuer.trim(), 2048) ||
    !isCanonicalMetadataString(actor.subject.trim(), 300) ||
    containsControlCharacter(actor.issuer) ||
    containsControlCharacter(actor.subject)
  )
    return null;
  const issuer = actor.issuer.trim();
  const subject = actor.subject.trim();
  if (!issuer || !subject || issuer.length > 2048 || subject.length > 300)
    return null;
  return Object.freeze({ ...actor, issuer, subject });
}

export function normalizeProviderTransaction(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return { error: "invalid_provider_payload" };
  const allowed = new Set([
    "provider_transaction_id",
    "account_id",
    "amount",
    "currency",
    "posted_at",
    "description",
    "category",
  ]);
  if (Object.keys(payload).some((key) => !allowed.has(key)))
    return { error: "invalid_provider_payload" };
  for (const key of [
    "provider_transaction_id",
    "account_id",
    "amount",
    "currency",
    "posted_at",
  ])
    if (typeof payload[key] !== "string" || !payload[key])
      return { error: "required_provider_field" };
  if (
    payload.provider_transaction_id.length > 300 ||
    payload.account_id.length > 300 ||
    !/^-?[0-9]+(?:\.[0-9]{1,4})?$/.test(payload.amount) ||
    !/^[A-Z]{3}$/.test(payload.currency) ||
    !isValidProviderDateTime(payload.posted_at)
  )
    return { error: "invalid_provider_field" };
  if (
    payload.description !== undefined &&
    (typeof payload.description !== "string" ||
      payload.description.length > 2048)
  )
    return { error: "invalid_provider_field" };
  if (
    payload.category !== undefined &&
    !isCanonicalMetadataString(payload.category, 300)
  )
    return { error: "invalid_provider_field" };
  return {
    value: {
      provider_transaction_id: payload.provider_transaction_id,
      account_id: payload.account_id,
      amount: payload.amount,
      currency: payload.currency,
      posted_at: payload.posted_at,
      ...(payload.description !== undefined
        ? { description: payload.description }
        : {}),
      ...(payload.category !== undefined ? { category: payload.category } : {}),
    },
  };
}

function isValidProviderDateTime(value) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!match) return false;
  const [, year, month, day, hour, minute, second, zone] = match;
  const y = Number(year),
    mo = Number(month),
    d = Number(day),
    h = Number(hour),
    mi = Number(minute),
    s = Number(second);
  if (
    mo < 1 ||
    mo > 12 ||
    d < 1 ||
    d > new Date(Date.UTC(y, mo, 0)).getUTCDate() ||
    h > 23 ||
    mi > 59 ||
    s > 59
  )
    return false;
  if (zone !== "Z") {
    const [zh, zm] = zone.slice(1).split(":").map(Number);
    if (zh > 23 || zm > 59) return false;
  }
  return !Number.isNaN(Date.parse(value));
}

export function signProviderPayload({ secret, timestamp, nonce, payload }) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${bodyBytes(payload)}`, "utf8")
    .digest("hex");
}
