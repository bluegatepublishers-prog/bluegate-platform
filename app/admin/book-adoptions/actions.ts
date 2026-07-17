"use server";

import { BookAdoptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { validateAdoptionScope } from "@/lib/book-adoptions";

const note = (form: FormData) => String(form.get("reviewNote") ?? "").trim().slice(0, 2000) || null;

export async function reviewAdoption(id: string, decision: "APPROVED" | "REJECTED", form: FormData) {
  const actor = await requireLivePublisherAdmin();
  const request = await prisma.schoolBookAdoption.findFirst({ where: { id, publisherId: actor.publisherId, status: BookAdoptionStatus.PENDING } });
  if (!request) return;
  const scope = await validateAdoptionScope(request.schoolId, request.academicYearId, request.sectionSubjectId, request.bookId);
  if (!scope || scope.book.publisherId !== actor.publisherId) return;
  await prisma.$transaction(async (tx) => {
    if (decision === "APPROVED") {
      const conflict = await tx.schoolBookAdoption.findFirst({ where: { publisherId: actor.publisherId, id: { not: id }, schoolId: request.schoolId, academicYearId: request.academicYearId, sectionSubjectId: request.sectionSubjectId, status: BookAdoptionStatus.APPROVED, active: true } });
      if (conflict) return;
    }
    const now = new Date();
    await tx.schoolBookAdoption.updateMany({ where: { id, publisherId: actor.publisherId, status: BookAdoptionStatus.PENDING }, data: { status: decision, active: true, reviewedById: actor.userId, reviewedAt: now, reviewNote: note(form), approvedAt: decision === "APPROVED" ? now : null } });
  });
  revalidatePath(`/admin/book-adoptions/${id}`);
  revalidatePath("/admin/book-adoptions");
}

export async function revokeAdoption(id: string, form: FormData) {
  const actor = await requireLivePublisherAdmin();
  const now = new Date();
  await prisma.schoolBookAdoption.updateMany({ where: { id, publisherId: actor.publisherId, status: BookAdoptionStatus.APPROVED }, data: { status: BookAdoptionStatus.REVOKED, active: false, reviewedById: actor.userId, reviewedAt: now, revokedAt: now, revokedReason: note(form) } });
  revalidatePath(`/admin/book-adoptions/${id}`);
  revalidatePath("/admin/book-adoptions");
}
