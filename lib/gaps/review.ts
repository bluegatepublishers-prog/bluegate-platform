import "server-only";

import { GapDetectionSource, GapReviewAction, GapStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTeacherGap } from "./teacher";
import { validateGapReviewInput } from "./review-policy";

export class GapReviewError extends Error {}

export async function reviewStudentGap(input: { gapId: string; action: string; reason?: unknown }) {
  const validated = validateGapReviewInput(input.action, input.reason);
  if (!validated) throw new GapReviewError(Object.values(GapReviewAction).includes(input.action as GapReviewAction) ? "Please provide a reason between 5 and 500 characters." : "This review action is not available.");
  const { action, reason } = validated;
  const { teacher, gap } = await requireTeacherGap(input.gapId);
  if (gap.status === GapStatus.RESOLVED || gap.status === GapStatus.DISMISSED) throw new GapReviewError("This learning gap has already been closed.");
  const now = new Date();
  const status = action === GapReviewAction.ACKNOWLEDGE ? GapStatus.ACKNOWLEDGED : action === GapReviewAction.DISMISS ? GapStatus.DISMISSED : GapStatus.RESOLVED;
  await prisma.$transaction(async (tx) => {
    const updated = await tx.studentLearningGap.updateMany({ where: { id: gap.id, status: { in: [GapStatus.OPEN, GapStatus.ACKNOWLEDGED] } }, data: { status, source: GapDetectionSource.TEACHER_CONFIRMED, activeKey: action === GapReviewAction.ACKNOWLEDGE ? gap.activeKey : null, acknowledgedAt: action === GapReviewAction.ACKNOWLEDGE ? now : gap.acknowledgedAt, dismissedAt: action === GapReviewAction.DISMISS ? now : gap.dismissedAt, resolvedAt: action === GapReviewAction.RESOLVE ? now : gap.resolvedAt, lastReviewedById: teacher.userId } });
    if (updated.count !== 1) throw new GapReviewError("This learning gap changed before the review was saved.");
    await tx.studentLearningGapReview.create({ data: { gapId: gap.id, actorUserId: teacher.userId, teacherId: teacher.id, action, reason } });
  });
  return { status };
}
