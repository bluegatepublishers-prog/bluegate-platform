import { SecurityAuditOutcome, type Prisma } from "@prisma/client";
import {
  publisherAdminAuditActor,
  recordTrustedDeniedAudit,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";
import {
  CurriculumValidationError,
  type CurriculumActor,
} from "@/lib/curriculum/validation.service";

export type CurriculumAuditAction =
  | "publisher.curriculum.edition.create"
  | "publisher.curriculum.edition.update"
  | "publisher.curriculum.edition.archive"
  | "publisher.curriculum.edition.restore"
  | "publisher.curriculum.unit.create"
  | "publisher.curriculum.unit.update"
  | "publisher.curriculum.unit.archive"
  | "publisher.curriculum.unit.restore"
  | "publisher.curriculum.module.create"
  | "publisher.curriculum.module.update"
  | "publisher.curriculum.module.archive"
  | "publisher.curriculum.module.restore"
  | "publisher.curriculum.topic.create"
  | "publisher.curriculum.topic.update"
  | "publisher.curriculum.topic.archive"
  | "publisher.curriculum.topic.restore"
  | "publisher.curriculum.exercise.create"
  | "publisher.curriculum.exercise.update"
  | "publisher.curriculum.exercise.archive"
  | "publisher.curriculum.exercise.restore"
  | "publisher.curriculum.video_lesson.create"
  | "publisher.curriculum.video_lesson.update"
  | "publisher.curriculum.video_lesson.archive"
  | "publisher.curriculum.video_lesson.restore";

export async function writeCurriculumAuditEvent(
  tx: Prisma.TransactionClient,
  input: {
    actor: CurriculumActor;
    action: CurriculumAuditAction;
    targetType: "BookEdition" | "BookUnit" | "BookModule" | "BookTopic" | "BookExercise" | "VideoLesson";
    targetId: string;
    changedFields: string[];
    fromStatus?: "ARCHIVED" | "ACTIVE";
    toStatus?: "ARCHIVED" | "ACTIVE";
  },
) {
  const metadata = {
    changedFields: input.changedFields,
    ...(input.fromStatus ? { fromStatus: input.fromStatus } : {}),
    ...(input.toStatus ? { toStatus: input.toStatus } : {}),
  } as const;

  await writeSecurityAuditEvent(tx, {
    actor: publisherAdminAuditActor(input.actor),
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    outcome: SecurityAuditOutcome.SUCCESS,
    metadata,
  });
}

function reasonCodeFromValidationError(error: CurriculumValidationError) {
  if (error.code === "CROSS_PUBLISHER_SCOPE" || error.code === "CROSS_BOOK_SCOPE") return "CROSS_TENANT_SCOPE" as const;
  if (error.code === "ENTITY_NOT_FOUND" || error.code === "BOOK_NOT_FOUND") return "TARGET_NOT_FOUND" as const;
  if (error.code === "INVALID_INPUT") return "VALIDATION_FAILED" as const;
  if (error.code === "PARENT_ARCHIVED" || error.code === "PARENT_UNPUBLISHED" || error.code === "INVALID_STATE") {
    return "INVALID_STATE" as const;
  }
  return "VALIDATION_FAILED" as const;
}

export async function runCurriculumMutationWithDeniedAudit<T>(
  input: {
    actor: CurriculumActor;
    action: CurriculumAuditAction;
    targetType: "BookEdition" | "BookUnit" | "BookModule" | "BookTopic" | "BookExercise" | "VideoLesson";
    operation: () => Promise<T>;
  },
) {
  try {
    return await input.operation();
  } catch (error) {
    if (error instanceof CurriculumValidationError) {
      await recordTrustedDeniedAudit({
        actor: publisherAdminAuditActor(input.actor),
        action: input.action,
        targetType: input.targetType,
        reasonCode: reasonCodeFromValidationError(error),
        metadata: { scope: "curriculum_service" },
      });
    }
    throw error;
  }
}
