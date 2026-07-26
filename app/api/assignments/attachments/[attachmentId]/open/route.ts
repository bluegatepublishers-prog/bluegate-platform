import { SecurityAuditOutcome, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireOwnedTeacherAssignment, requireStudentAssignment } from "@/lib/assignments/access";
import { isAssignmentVisible } from "@/lib/assignments/timing";
import { prisma } from "@/lib/prisma";
import { accountAuditActor, recordTrustedAuditBestEffort } from "@/lib/security-audit";
import { normalizeAndValidateObjectKey, sanitizeFilenameForHeader } from "@/lib/storage/object-key";
import { prepareProtectedResourceDownload } from "@/lib/storage/protected-download";
import { getStorageProvider } from "@/lib/storage/provider";
import { keyBelongsToTenant } from "@/lib/storage/upload-service";

export async function GET(request: Request, context: { params: Promise<{ attachmentId: string }> }) {
  const session = await auth();
  const user = session?.user;
  const { attachmentId } = await context.params;
  if (!user?.id || !Object.values(UserRole).includes(user.role as UserRole)) return unavailable();
  const liveUser = { id: user.id, role: user.role, publisherId: user.publisherId };
  const attachment = await prisma.assignmentAttachment.findFirst({
    where: { id: attachmentId, assignment: { archivedAt: null } },
    include: {
      assignment: true,
      resource: true,
      bookChapter: true,
      classMaterial: {
        include: {
          resource: { select: { id: true } },
          aiGeneration: { select: { status: true, quotaConsumed: true, output: true } },
        },
      },
    },
  });
  if (!attachment || !await canOpen(liveUser, attachment.assignment)) {
    await audit(liveUser, SecurityAuditOutcome.DENIED);
    return unavailable();
  }
  if (attachment.resourceId) {
    const result = await prepareProtectedResourceDownload({
      resourceId: attachment.resourceId,
      allowedRoles: [UserRole.TEACHER, UserRole.STUDENT],
      disposition: "inline",
    });
    if (!result.ok) return unavailable();
    await audit(liveUser, SecurityAuditOutcome.SUCCESS, attachment.id);
    return NextResponse.redirect(result.url);
  }
  if (attachment.classMaterial) {
    const material = attachment.classMaterial;
    if (material.resourceId) {
      const result = await prepareProtectedResourceDownload({
        resourceId: material.resourceId,
        allowedRoles: [UserRole.TEACHER, UserRole.STUDENT],
        disposition: "inline",
      });
      if (!result.ok) return unavailable();
      await audit(liveUser, SecurityAuditOutcome.SUCCESS, attachment.id);
      return NextResponse.redirect(result.url);
    }
    if (material.aiGeneration?.status === "COMPLETED" && material.aiGeneration.quotaConsumed && material.aiGeneration.output) {
      await audit(liveUser, SecurityAuditOutcome.SUCCESS, attachment.id);
      return new NextResponse(material.aiGeneration.output, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "private, no-store",
          "Content-Disposition": `inline; filename="${sanitizeFilenameForHeader(material.title)}.json"`,
        },
      });
    }
    if (material.externalUrl) {
      try {
        const url = new URL(material.externalUrl);
        if (url.protocol !== "https:") return unavailable();
        await audit(liveUser, SecurityAuditOutcome.SUCCESS, attachment.id);
        return NextResponse.redirect(url);
      } catch {
        return unavailable();
      }
    }
    if (material.fileUrl) {
      return signedObject(liveUser, attachment.id, material.fileUrl, material.publisherId, "class-material", material.originalFileName ?? material.title);
    }
  }
  if (attachment.bookChapterId && attachment.assignment.bookId) {
    await audit(liveUser, SecurityAuditOutcome.SUCCESS, attachment.id);
    const destination = liveUser.role === "STUDENT"
      ? `/student-dashboard/books/${attachment.assignment.bookId}/read`
      : `/teacher-dashboard/classes/${attachment.assignment.sectionId}/assignments/${attachment.assignment.id}`;
    return NextResponse.redirect(new URL(destination, request.url));
  }
  if (attachment.objectKey) {
    return signedObject(liveUser, attachment.id, attachment.objectKey, attachment.assignment.publisherId, "assignment-attachment", attachment.originalFileName ?? attachment.label ?? "attachment");
  }
  return unavailable();
}

async function canOpen(user: { role?: string; id: string; publisherId?: string }, assignment: { id: string; sectionId: string }) {
  try {
    if (user.role === "TEACHER") {
      await requireOwnedTeacherAssignment(assignment.sectionId, assignment.id);
      return true;
    }
    if (user.role === "STUDENT") {
      const scope = await requireStudentAssignment(assignment.id);
      return isAssignmentVisible(scope.assignment);
    }
  } catch {}
  return false;
}

async function signedObject(
  user: { id: string; role?: string; publisherId?: string },
  attachmentId: string,
  value: string,
  publisherId: string,
  scope: "class-material" | "assignment-attachment",
  filename: string,
) {
  let key: string;
  try { key = normalizeAndValidateObjectKey(value); } catch { return unavailable(); }
  if (!keyBelongsToTenant(key, publisherId, scope)) return unavailable();
  const provider = getStorageProvider();
  if (!await provider.headObject({ key })) return unavailable();
  const signed = await provider.createSignedDownloadUrl({ key, expiresInSeconds: 60, downloadFilename: filename, disposition: "inline" });
  await audit(user, SecurityAuditOutcome.SUCCESS, attachmentId);
  return NextResponse.redirect(signed.url);
}

function unavailable() { return NextResponse.json({ message: "Attachment unavailable." }, { status: 404 }); }
async function audit(user: { id: string; role?: string; publisherId?: string }, outcome: SecurityAuditOutcome, targetId?: string) {
  if (!Object.values(UserRole).includes(user.role as UserRole)) return;
  await recordTrustedAuditBestEffort({
    actor: accountAuditActor({ id: user.id, role: user.role as UserRole, publisherId: user.publisherId ?? null }),
    action: "classroom.assignment.attachment.open",
    targetType: "AssignmentAttachment",
    targetId,
    outcome,
    reasonCode: outcome === SecurityAuditOutcome.DENIED ? "TARGET_NOT_FOUND" : undefined,
    metadata: { scope: "assignment", fileOperation: "open" },
  });
}
