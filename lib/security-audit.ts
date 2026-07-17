import "server-only";

import {
  Prisma,
  SecurityAuditOutcome,
  UserRole,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  executeAtomicAuditedMutation,
  buildSecurityAuditEventSnapshot,
  type SecurityAuditAction,
  type SecurityAuditMetadata,
  type SecurityAuditReasonCode,
  type SecurityAuditTargetType,
} from "@/lib/security-audit-policy";

export type TrustedSecurityAuditActor = {
  userId: string;
  role: UserRole;
  publisherId: string | null;
};

export type SecurityAuditInput = {
  actor: TrustedSecurityAuditActor;
  action: SecurityAuditAction;
  targetType: SecurityAuditTargetType;
  targetId?: string | null;
  outcome: SecurityAuditOutcome;
  reasonCode?: SecurityAuditReasonCode;
  correlationId?: string;
  metadata?: SecurityAuditMetadata;
};

export function platformOwnerAuditActor(actor: { id: string }): TrustedSecurityAuditActor {
  return { userId: actor.id, role: UserRole.SUPER_ADMIN, publisherId: null };
}

export function publisherAdminAuditActor(actor: { userId: string; publisherId: string }): TrustedSecurityAuditActor {
  return { userId: actor.userId, role: UserRole.ADMIN, publisherId: actor.publisherId };
}

export function accountAuditActor(actor: { id: string; role: UserRole; publisherId: string | null }): TrustedSecurityAuditActor {
  return { userId: actor.id, role: actor.role, publisherId: actor.publisherId };
}

export function buildSecurityAuditEvent(input: SecurityAuditInput): Prisma.SecurityAuditEventCreateInput {
  const event = buildSecurityAuditEventSnapshot(input);
  return { ...event, actorRole: input.actor.role, outcome: input.outcome };
}

export async function writeSecurityAuditEvent(
  tx: Prisma.TransactionClient,
  input: SecurityAuditInput,
) {
  await tx.securityAuditEvent.create({ data: buildSecurityAuditEvent(input) });
}

export async function runAuditedMutation<T>(
  input: SecurityAuditInput,
  mutate: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return executeAtomicAuditedMutation(
    {
      transaction: (operation) => prisma.$transaction(operation),
      insert: (tx, event) => writeSecurityAuditEvent(tx, event),
    },
    input,
    mutate,
  );
}

export async function recordTrustedAuditBestEffort(input: SecurityAuditInput) {
  try {
    await prisma.$transaction((tx) => writeSecurityAuditEvent(tx, input));
  } catch {
    console.warn("Security audit best-effort recording failed.", { code: "AUDIT_BEST_EFFORT_WRITE_FAILED" });
  }
}

export function recordTrustedDeniedAudit(input: Omit<SecurityAuditInput, "outcome">) {
  return recordTrustedAuditBestEffort({ ...input, targetId: null, outcome: SecurityAuditOutcome.DENIED });
}

export function recordTrustedFailureAudit(input: Omit<SecurityAuditInput, "outcome" | "reasonCode">) {
  return recordTrustedAuditBestEffort({ ...input, targetId: null, outcome: SecurityAuditOutcome.FAILURE, reasonCode: "UNEXPECTED_FAILURE" });
}
