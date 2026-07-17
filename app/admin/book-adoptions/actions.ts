"use server";

import { BookAdoptionStatus, SecurityAuditOutcome } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { validateAdoptionScope } from "@/lib/book-adoptions";
import { publisherAdminAuditActor, recordTrustedDeniedAudit, writeSecurityAuditEvent } from "@/lib/security-audit";

const note = (form: FormData) => String(form.get("reviewNote") ?? "").trim().slice(0, 2000) || null;

export async function reviewAdoption(id: string, decision: "APPROVED" | "REJECTED", form: FormData) {
  const actor = await requireLivePublisherAdmin();
  const auditAction = decision === "APPROVED" ? "publisher.book_adoption.approve" as const : "publisher.book_adoption.reject" as const;
  const request = await prisma.schoolBookAdoption.findFirst({ where: { id, publisherId: actor.publisherId, status: BookAdoptionStatus.PENDING } });
  if (!request) {
    await recordTrustedDeniedAudit({ actor: publisherAdminAuditActor(actor), action: auditAction, targetType: "SchoolBookAdoption", reasonCode: "CROSS_TENANT_SCOPE", metadata: { scope: "publisher" } });
    return;
  }
  const scope = await validateAdoptionScope(request.schoolId, request.academicYearId, request.sectionSubjectId, request.bookId);
  if (!scope || scope.book.publisherId !== actor.publisherId) {
    await recordTrustedDeniedAudit({ actor: publisherAdminAuditActor(actor), action: auditAction, targetType: "SchoolBookAdoption", reasonCode: "INVALID_STATE", metadata: { scope: "publisher" } });
    return;
  }
  await prisma.$transaction(async (tx) => {
    if (decision === "APPROVED") {
      const conflict = await tx.schoolBookAdoption.findFirst({ where: { publisherId: actor.publisherId, id: { not: id }, schoolId: request.schoolId, academicYearId: request.academicYearId, sectionSubjectId: request.sectionSubjectId, status: BookAdoptionStatus.APPROVED, active: true } });
      if (conflict) return;
    }
    const now = new Date();
    const updated = await tx.schoolBookAdoption.updateMany({ where: { id, publisherId: actor.publisherId, status: BookAdoptionStatus.PENDING }, data: { status: decision, active: true, reviewedById: actor.userId, reviewedAt: now, reviewNote: note(form), approvedAt: decision === "APPROVED" ? now : null } });
    if (updated.count !== 1) return;
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor), action: auditAction,
      targetType: "SchoolBookAdoption", targetId: id, outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { decision, fromStatus: BookAdoptionStatus.PENDING, toStatus: decision },
    });
  });
  revalidatePath(`/admin/book-adoptions/${id}`);
  revalidatePath("/admin/book-adoptions");
}

export async function revokeAdoption(id: string, form: FormData) {
  const actor = await requireLivePublisherAdmin();
  const now = new Date();
  const revoked = await prisma.$transaction(async (tx) => {
    const updated = await tx.schoolBookAdoption.updateMany({ where: { id, publisherId: actor.publisherId, status: BookAdoptionStatus.APPROVED }, data: { status: BookAdoptionStatus.REVOKED, active: false, reviewedById: actor.userId, reviewedAt: now, revokedAt: now, revokedReason: note(form) } });
    if (updated.count !== 1) return false;
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor), action: "publisher.book_adoption.revoke",
      targetType: "SchoolBookAdoption", targetId: id, outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { decision: "REVOKED", fromStatus: BookAdoptionStatus.APPROVED, toStatus: BookAdoptionStatus.REVOKED },
    });
    return true;
  });
  if (!revoked) await recordTrustedDeniedAudit({ actor: publisherAdminAuditActor(actor), action: "publisher.book_adoption.revoke", targetType: "SchoolBookAdoption", reasonCode: "CROSS_TENANT_SCOPE", metadata: { scope: "publisher" } });
  revalidatePath(`/admin/book-adoptions/${id}`);
  revalidatePath("/admin/book-adoptions");
}
