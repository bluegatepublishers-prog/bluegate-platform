"use server";
import { revalidatePath } from "next/cache";
import { BookAdoptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { validateAdoptionScope } from "@/lib/book-adoptions";

const value = (form: FormData, key: string, max = 1000) => String(form.get(key) ?? "").trim().slice(0, max);
export async function requestBookAdoption(form: FormData) {
  const school = await requireSchool();
  const academicYearId = value(form, "academicYearId"), bookId = value(form, "bookId"), requestNote = value(form, "requestNote", 2000) || null;
  const ids = [...new Set(form.getAll("sectionSubjectIds").filter((item): item is string => typeof item === "string" && Boolean(item)))];
  if (!academicYearId || !bookId || !ids.length) return;
  for (const sectionSubjectId of ids) {
    const scope = await validateAdoptionScope(school.id, academicYearId, sectionSubjectId, bookId);
    if (!scope) continue;
    const existing = await prisma.schoolBookAdoption.findFirst({ where: { schoolId: school.id, academicYearId, sectionSubjectId, bookId, status: { in: [BookAdoptionStatus.PENDING, BookAdoptionStatus.APPROVED] }, active: true } });
    if (existing) continue;
    if(!school.publisherId)continue;
    await prisma.schoolBookAdoption.create({ data: { publisherId:school.publisherId,schoolId: school.id, academicYearId, schoolClassId: scope.schoolClass.id, sectionId: scope.section.id, sectionSubjectId, bookId, requestNote, requestedById: school.userId } });
  }
  revalidatePath("/school-dashboard/book-adoptions");
  revalidatePath("/school-dashboard/books");
}
export async function cancelBookAdoption(id: string) { const school = await requireSchool(); await prisma.schoolBookAdoption.updateMany({ where: { id, schoolId: school.id, status: BookAdoptionStatus.PENDING }, data: { status: BookAdoptionStatus.REVOKED, active: false, revokedAt: new Date(), revokedReason: "Cancelled by school" } }); revalidatePath("/school-dashboard/book-adoptions"); revalidatePath("/school-dashboard/books"); }
