import { SecurityAuditOutcome, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireOwnedTeacherAssignment, requireStudentAssignmentIdentity } from "@/lib/assignments/access";
import { prisma } from "@/lib/prisma";
import { accountAuditActor, recordTrustedAuditBestEffort } from "@/lib/security-audit";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { getStorageProvider } from "@/lib/storage/provider";
import { keyBelongsToTenant } from "@/lib/storage/upload-service";

export async function GET(_request: Request, context: { params: Promise<{ attachmentId: string }> }) {
  const session = await auth();
  const user = session?.user;
  const { attachmentId } = await context.params;
  if (!user?.id || !Object.values(UserRole).includes(user.role as UserRole)) return unavailable();
  const liveUser = { id: user.id, role: user.role, publisherId: user.publisherId };
  const attachment = await prisma.submissionAttachment.findFirst({
    where: { id: attachmentId },
    include: { submission: { include: { assignment: true } } },
  });
  if (!attachment || !await canOpen(liveUser, attachment.submission)) {
    await audit(liveUser, SecurityAuditOutcome.DENIED);
    return unavailable();
  }
  let key: string;
  try { key = normalizeAndValidateObjectKey(attachment.objectKey); } catch { return unavailable(); }
  if (!keyBelongsToTenant(key, attachment.submission.publisherId, "submission-attachment")) return unavailable();
  const provider = getStorageProvider();
  if (!await provider.headObject({ key })) return unavailable();
  const signed = await provider.createSignedDownloadUrl({ key, expiresInSeconds: 60, downloadFilename: attachment.originalFileName, disposition: "inline" });
  await audit(liveUser, SecurityAuditOutcome.SUCCESS, attachment.id);
  return NextResponse.redirect(signed.url);
}

async function canOpen(user: { role?: string; id: string }, submission: { studentId: string; assignmentId: string; assignment: { sectionId: string } }) {
  try {
    if (user.role === "TEACHER") {
      await requireOwnedTeacherAssignment(submission.assignment.sectionId, submission.assignmentId);
      return true;
    }
    if (user.role === "STUDENT") {
      const identity = await requireStudentAssignmentIdentity();
      return identity.student.id === submission.studentId;
    }
  } catch {}
  return false;
}

function unavailable() { return NextResponse.json({ message: "File unavailable." }, { status: 404 }); }
async function audit(user: { id: string; role?: string; publisherId?: string }, outcome: SecurityAuditOutcome, targetId?: string) {
  if (!Object.values(UserRole).includes(user.role as UserRole)) return;
  await recordTrustedAuditBestEffort({
    actor: accountAuditActor({ id: user.id, role: user.role as UserRole, publisherId: user.publisherId ?? null }),
    action: "classroom.submission.attachment.open",
    targetType: "SubmissionAttachment",
    targetId,
    outcome,
    reasonCode: outcome === SecurityAuditOutcome.DENIED ? "TARGET_NOT_FOUND" : undefined,
    metadata: { scope: "assignment", fileOperation: "open" },
  });
}
