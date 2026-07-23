export const SECURITY_AUDIT_ACTIONS = [
  "platform.publisher.update",
  "platform.publisher.feature.set",
  "platform.super_admin.provision",
  "publisher.settings.update",
  "publisher.book.create",
  "publisher.book.update",
  "publisher.book.delete",
  "publisher.curriculum.edition.create",
  "publisher.curriculum.edition.update",
  "publisher.curriculum.edition.archive",
  "publisher.curriculum.edition.restore",
  "publisher.curriculum.unit.create",
  "publisher.curriculum.unit.update",
  "publisher.curriculum.unit.archive",
  "publisher.curriculum.unit.restore",
  "publisher.curriculum.module.create",
  "publisher.curriculum.module.update",
  "publisher.curriculum.module.archive",
  "publisher.curriculum.module.restore",
  "publisher.curriculum.topic.create",
  "publisher.curriculum.topic.update",
  "publisher.curriculum.topic.archive",
  "publisher.curriculum.topic.restore",
  "publisher.curriculum.exercise.create",
  "publisher.curriculum.exercise.update",
  "publisher.curriculum.exercise.archive",
  "publisher.curriculum.exercise.restore",
  "publisher.curriculum.video_lesson.create",
  "publisher.curriculum.video_lesson.update",
  "publisher.curriculum.video_lesson.archive",
  "publisher.curriculum.video_lesson.restore",
  "publisher.resource.create",
  "publisher.resource.update",
  "publisher.resource.delete",
  "publisher.school.status.set",
  "publisher.teacher.status.set",
  "publisher.teacher.ai_plan.set",
  "publisher.book_adoption.approve",
  "publisher.book_adoption.reject",
  "publisher.book_adoption.revoke",
  "account.email.verify",
  "account.password_reset.complete",
  "storage.upload.init",
  "storage.upload.complete",
  "storage.download",
  "storage.migration.retry",
  "storage.health.verify",
  "storage.statistics.recalculate",
  "storage.report.export",
  "storage.verify",
  "storage.repair",
  "storage.download.retry",
  "storage.reconciliation.scan",
  "storage.reconciliation.retry",
] as const;

export type SecurityAuditAction = (typeof SECURITY_AUDIT_ACTIONS)[number];
export type SecurityAuditTargetType =
  | "Publisher"
  | "PublisherFeature"
  | "Book"
  | "BookEdition"
  | "BookUnit"
  | "BookModule"
  | "BookTopic"
  | "BookExercise"
  | "VideoLesson"
  | "Resource"
  | "School"
  | "Teacher"
  | "SchoolBookAdoption"
  | "User"
  | "Storage";

export const SECURITY_AUDIT_REASON_CODES = [
  "AUTHORIZATION_DENIED",
  "CROSS_TENANT_SCOPE",
  "FEATURE_DISABLED",
  "INVALID_STATE",
  "TARGET_NOT_FOUND",
  "UNEXPECTED_FAILURE",
  "VALIDATION_FAILED",
] as const;

export type SecurityAuditReasonCode = (typeof SECURITY_AUDIT_REASON_CODES)[number];
export type SecurityAuditMetadataValue = string | number | boolean | readonly string[];
export type SecurityAuditMetadata = Readonly<Record<string, SecurityAuditMetadataValue>>;

const ALLOWED_METADATA_KEYS = new Set([
  "changedFields",
  "decision",
  "enabled",
  "featureKey",
  "fileCount",
  "fileOperation",
  "fromStatus",
  "plan",
  "purpose",
  "scope",
  "toStatus",
  "verified",
  "attempt",
  "mismatchCount",
  "repairCount",
]);
const SAFE_VALUE = /^[A-Za-z0-9_.:-]{1,120}$/;
const SENSITIVE_KEY = /(password|token|secret|cookie|authorization|connection|prompt|response|email|url|body|hash|answer)/i;
const MAX_METADATA_BYTES = 2048;
const MAX_ARRAY_ITEMS = 20;

export class UnsafeSecurityAuditMetadataError extends Error {
  constructor(message = "Security audit metadata is not allow-listed.") {
    super(message);
    this.name = "UnsafeSecurityAuditMetadataError";
  }
}

function safeString(value: string) {
  const normalized = value.trim();
  if (!SAFE_VALUE.test(normalized)) throw new UnsafeSecurityAuditMetadataError();
  return normalized;
}

export function normalizeSecurityAuditMetadata(
  metadata: SecurityAuditMetadata | undefined,
): Record<string, string | number | boolean | string[]> | undefined {
  if (!metadata) return undefined;
  const normalized: Record<string, string | number | boolean | string[]> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY.test(key) || !ALLOWED_METADATA_KEYS.has(key)) {
      throw new UnsafeSecurityAuditMetadataError();
    }
    if (typeof value === "string") normalized[key] = safeString(value);
    else if (typeof value === "boolean") normalized[key] = value;
    else if (typeof value === "number" && Number.isSafeInteger(value) && Math.abs(value) <= 1_000_000) normalized[key] = value;
    else if (Array.isArray(value) && value.length <= MAX_ARRAY_ITEMS && value.every((item) => typeof item === "string")) normalized[key] = value.map(safeString);
    else throw new UnsafeSecurityAuditMetadataError();
  }
  if (Buffer.byteLength(JSON.stringify(normalized), "utf8") > MAX_METADATA_BYTES) {
    throw new UnsafeSecurityAuditMetadataError("Security audit metadata is too large.");
  }
  return normalized;
}

export function isSecurityAuditReasonCode(value: string): value is SecurityAuditReasonCode {
  return (SECURITY_AUDIT_REASON_CODES as readonly string[]).includes(value);
}

export type SecurityAuditEventSnapshotInput = {
  actor: { userId: string; role: string; publisherId: string | null };
  action: SecurityAuditAction;
  targetType: SecurityAuditTargetType;
  targetId?: string | null;
  outcome: "SUCCESS" | "DENIED" | "FAILURE";
  reasonCode?: SecurityAuditReasonCode;
  correlationId?: string;
  metadata?: SecurityAuditMetadata;
};

export function buildSecurityAuditEventSnapshot(input: SecurityAuditEventSnapshotInput) {
  if (!input.actor?.userId?.trim()) throw new Error("A trusted security audit actor is required.");
  if (input.actor.role === "SUPER_ADMIN" && input.actor.publisherId !== null) throw new Error("Invalid platform audit actor context.");
  if (input.actor.role === "ADMIN" && !input.actor.publisherId) throw new Error("Invalid publisher audit actor context.");
  if (input.reasonCode && !isSecurityAuditReasonCode(input.reasonCode)) throw new Error("Unsupported security audit reason code.");
  const targetId = input.targetId?.trim() || null;
  if (targetId && targetId.length > 191) throw new Error("Security audit target ID is too long.");
  const metadata = normalizeSecurityAuditMetadata(input.metadata);
  return {
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    publisherId: input.actor.publisherId,
    action: input.action,
    targetType: input.targetType,
    targetId,
    outcome: input.outcome,
    reasonCode: input.reasonCode,
    correlationId: input.correlationId ?? randomUUID(),
    ...(metadata ? { metadata } : {}),
    schemaVersion: 1,
  };
}

export type AtomicAuditDependencies<Tx, Event> = {
  transaction<T>(operation: (tx: Tx) => Promise<T>): Promise<T>;
  insert(tx: Tx, event: Event): Promise<void>;
};

export async function executeAtomicAuditedMutation<Tx, Event, Result>(
  dependencies: AtomicAuditDependencies<Tx, Event>,
  event: Event,
  mutate: (tx: Tx) => Promise<Result>,
) {
  return dependencies.transaction(async (tx) => {
    const result = await mutate(tx);
    await dependencies.insert(tx, event);
    return result;
  });
}

export type SecurityAuditReader = {
  role: string;
  publisherId: string | null;
};

export function securityAuditReadScope(reader: SecurityAuditReader) {
  if (reader.role === "SUPER_ADMIN" && reader.publisherId === null) return { kind: "PLATFORM" as const };
  if (reader.role === "ADMIN" && reader.publisherId) return { kind: "PUBLISHER" as const, publisherId: reader.publisherId };
  return null;
}

export function canReadSecurityAuditEvent(
  reader: SecurityAuditReader,
  event: { publisherId: string | null },
) {
  const scope = securityAuditReadScope(reader);
  if (!scope) return false;
  return scope.kind === "PLATFORM" || event.publisherId === scope.publisherId;
}
import { randomUUID } from "node:crypto";
