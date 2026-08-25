import "server-only";

import { Prisma, TeacherAssignmentType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { normalizeAcademicName } from "@/lib/section-subject-content-policy";

export type AssignmentErrorCode =
  | "VALIDATION_ERROR"
  | "TEACHER_NOT_AVAILABLE"
  | "CLASS_NOT_AVAILABLE"
  | "SECTION_NOT_AVAILABLE"
  | "SUBJECT_NOT_AVAILABLE"
  | "ASSIGNMENT_NOT_AVAILABLE"
  | "BOOK_SELECTION_REQUIRED"
  | "BOOK_NOT_ELIGIBLE"
  | "BOOK_NOT_AVAILABLE";

export type SchoolTeacherAssignmentMutationError = {
  ok: false;
  code: AssignmentErrorCode;
  message: string;
  field?: string;
};

export class SchoolTeacherAssignmentError extends Error {
  constructor(
    public readonly code: AssignmentErrorCode,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "SchoolTeacherAssignmentError";
  }
}

export async function getSchoolTeacherAssignmentWorkspace() {
  const school = await requireSchool();
  if (!school.publisherId) return { teachers: [], sections: [], assignments: [], books: [] };
  const [teachers, academicYears, assignments, sectionSubjects, books] = await Promise.all([
    prisma.teacher.findMany({ where: { schoolId: school.id, active: true, status: "APPROVED" }, select: { id: true, user: { select: { name: true, email: true } } }, orderBy: { user: { name: "asc" } } }),
    prisma.academicYear.findMany({ where: { schoolId: school.id, active: true, current: true }, include: { classes: { where: { active: true }, include: { sections: { where: { active: true }, include: { subjects: { where: { active: true, subject: { active: true } }, include: { subject: { select: { id: true, name: true } } }, orderBy: { sortOrder: "asc" } } }, orderBy: { name: "asc" } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } }, orderBy: { startDate: "desc" } }),
    prisma.teacherAssignment.findMany({ where: { schoolId: school.id, active: true, academicYear: { active: true, current: true }, schoolClass: { active: true, schoolId: school.id }, section: { active: true } }, include: { teacher: { select: { id: true, user: { select: { name: true } } } }, schoolClass: { select: { id: true, name: true } }, section: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.sectionSubject.findMany({ where: { active: true, section: { active: true, schoolClass: { schoolId: school.id, active: true, academicYear: { active: true, current: true } } } }, select: { id: true, sectionId: true, subjectId: true, bookId: true, book: { select: { title: true } } } }),
    prisma.book.findMany({ where: { publisherId: school.publisherId, published: true, archived: false, schoolEntitlements: { some: { schoolId: school.id, publisherId: school.publisherId, status: "ACTIVE" } } }, include: { class: { select: { name: true } }, subject: { select: { id: true, name: true } } }, orderBy: [{ class: { sortOrder: "asc" } }, { subject: { sortOrder: "asc" } }, { title: "asc" }] }),
  ]);
  const state = new Map(sectionSubjects.map((item) => [item.sectionId + ":" + item.subjectId, { bookId: item.bookId, bookTitle: item.book?.title ?? null }]));
  const grouped = new Map<string, { id: string; teacherId: string; teacherName: string; sectionId: string; className: string; sectionName: string; subjectIds: string[]; subjects: string[]; classTeacher: boolean; bookStatus: "Assigned" | "Needs book" }>();
  for (const assignment of assignments) {
    const key = assignment.teacherId + ":" + assignment.sectionId;
    const row = grouped.get(key) ?? { id: key, teacherId: assignment.teacherId, teacherName: assignment.teacher.user.name, sectionId: assignment.sectionId, className: assignment.schoolClass.name, sectionName: assignment.section.name, subjectIds: [], subjects: [], classTeacher: false, bookStatus: "Assigned" };
    if (assignment.type === TeacherAssignmentType.CLASS_TEACHER) row.classTeacher = true;
    if (assignment.type === TeacherAssignmentType.SUBJECT_TEACHER && assignment.subject) { row.subjectIds.push(assignment.subject.id); row.subjects.push(assignment.subject.name); if (!state.get(assignment.sectionId + ":" + assignment.subject.id)?.bookId) row.bookStatus = "Needs book"; }
    grouped.set(key, row);
  }
  return {
    teachers: teachers.map((teacher) => ({ id: teacher.id, name: teacher.user.name, email: teacher.user.email })),
    sections: academicYears.flatMap((year) => year.classes.flatMap((schoolClass) => schoolClass.sections.map((section) => ({ id: section.id, academicYearId: year.id, classId: schoolClass.id, className: schoolClass.name, name: section.name, subjects: section.subjects.map((item) => ({ id: item.id, subjectId: item.subjectId, name: item.subject.name, bookId: state.get(section.id + ":" + item.subjectId)?.bookId ?? null, bookTitle: state.get(section.id + ":" + item.subjectId)?.bookTitle ?? null })) })))),
    assignments: [...grouped.values()],
    books: books.map((book) => ({ id: book.id, title: book.title, className: book.class.name, subjectId: book.subject.id, subjectName: book.subject.name })),
  };
}

function formValue(form: FormData, key: string, max = 160) { return String(form.get(key) ?? "").trim().slice(0, max); }
function formValues(form: FormData, key: string) { return [...new Set(form.getAll(key).filter((value): value is string => typeof value === "string" && Boolean(value.trim())).map((value) => value.trim()))]; }

export async function lockSchoolTeacherAssignmentScope(
  tx: Prisma.TransactionClient,
  schoolId: string,
  academicYearId: string,
  sectionId: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`school-teacher-assignment:${schoolId}:${academicYearId}:${sectionId}`}))`;
}

export async function saveSchoolTeacherAssignments(form: FormData) {
  const school = await requireSchool();
  if (!school.publisherId) throw new SchoolTeacherAssignmentError("BOOK_NOT_AVAILABLE", "Books are not available for this school.");
  const teacherId = formValue(form, "teacherId"); const sectionId = formValue(form, "sectionId"); const academicYearId = formValue(form, "academicYearId"); const schoolClassId = formValue(form, "schoolClassId"); const subjectIds = formValues(form, "subjectIds"); const makeClassTeacher = form.get("classTeacher") === "on" || form.get("classTeacher") === "true";
  if (!teacherId) throw new SchoolTeacherAssignmentError("VALIDATION_ERROR", "Choose a teacher.", "teacherId");
  if (!academicYearId || !schoolClassId) throw new SchoolTeacherAssignmentError("CLASS_NOT_AVAILABLE", "Choose an available class.", "schoolClassId");
  if (!sectionId) throw new SchoolTeacherAssignmentError("SECTION_NOT_AVAILABLE", "Choose an available section.", "sectionId");
  const [teacher, section, sectionSubjects] = await Promise.all([
    prisma.teacher.findFirst({ where: { id: teacherId, schoolId: school.id, active: true, status: "APPROVED", schoolMemberships: { some: { schoolId: school.id, active: true, status: "ACTIVE" } } }, select: { id: true } }),
    prisma.classSection.findFirst({ where: { id: sectionId, active: true, schoolClass: { id: schoolClassId, schoolId: school.id, active: true, academicYearId } }, include: { schoolClass: { select: { id: true, name: true, academicYearId: true } } } }),
    prisma.sectionSubject.findMany({ where: { sectionId, active: true, subjectId: { in: subjectIds }, subject: { active: true } }, include: { subject: { select: { id: true, name: true } }, book: { select: { id: true } } } }),
  ]);
  if (!teacher) throw new SchoolTeacherAssignmentError("TEACHER_NOT_AVAILABLE", "This teacher is no longer active.", "teacherId");
  if (!section) throw new SchoolTeacherAssignmentError("SECTION_NOT_AVAILABLE", "The selected section is no longer available.", "sectionId");
  if (section.schoolClass.academicYearId !== academicYearId || section.schoolClass.id !== schoolClassId) throw new SchoolTeacherAssignmentError("CLASS_NOT_AVAILABLE", "The selected class is no longer available.", "schoolClassId");
  if (sectionSubjects.length !== subjectIds.length) throw new SchoolTeacherAssignmentError("SUBJECT_NOT_AVAILABLE", "One or more selected subjects are no longer available.", "subjectIds");
  if (!subjectIds.length && !makeClassTeacher) throw new SchoolTeacherAssignmentError("VALIDATION_ERROR", "Select at least one subject or make this teacher the class teacher.", "subjectIds");
  const entitledBooks = await prisma.book.findMany({ where: { publisherId: school.publisherId, published: true, archived: false, schoolEntitlements: { some: { schoolId: school.id, publisherId: school.publisherId, status: "ACTIVE" } } }, include: { class: { select: { name: true } }, subject: { select: { id: true } } } });
  const resolvedBooks = sectionSubjects.map((subject) => { const candidates = entitledBooks.filter((book) => book.subject.id === subject.subjectId && normalizeAcademicName(book.class.name) === normalizeAcademicName(section.schoolClass.name)); const selectedId = formValue(form, "book_" + subject.subjectId); if (selectedId && !candidates.some((book) => book.id === selectedId)) throw new SchoolTeacherAssignmentError("BOOK_NOT_ELIGIBLE", "This book is no longer available for the selected class and subject.", "book_" + subject.subjectId); const existing = candidates.find((book) => book.id === subject.book?.id); const resolved = selectedId || existing?.id || (candidates.length === 1 ? candidates[0].id : null); if (candidates.length > 1 && !resolved) throw new SchoolTeacherAssignmentError("BOOK_SELECTION_REQUIRED", "Choose a book because multiple eligible books are available.", "book_" + subject.subjectId); return { sectionSubjectId: subject.id, bookId: resolved }; });
  await prisma.$transaction(async (tx) => {
    await lockSchoolTeacherAssignmentScope(tx, school.id, academicYearId, sectionId);
    if (subjectIds.length) { await tx.teacherAssignment.updateMany({ where: { schoolId: school.id, academicYearId, sectionId, type: TeacherAssignmentType.SUBJECT_TEACHER, subjectId: { in: subjectIds }, active: true }, data: { active: false, endedAt: new Date() } }); await tx.teacherAssignment.createMany({ data: subjectIds.map((subjectId) => ({ teacherId: teacher.id, schoolId: school.id, academicYearId, schoolClassId: section.schoolClass.id, sectionId, subjectId, type: TeacherAssignmentType.SUBJECT_TEACHER })) }); }
    if (makeClassTeacher) { await tx.teacherAssignment.updateMany({ where: { schoolId: school.id, academicYearId, sectionId, type: TeacherAssignmentType.CLASS_TEACHER, active: true }, data: { active: false, endedAt: new Date() } }); await tx.teacherAssignment.create({ data: { teacherId: teacher.id, schoolId: school.id, academicYearId, schoolClassId: section.schoolClass.id, sectionId, type: TeacherAssignmentType.CLASS_TEACHER } }); }
    for (const resolved of resolvedBooks) await tx.sectionSubject.update({ where: { id: resolved.sectionSubjectId }, data: { bookId: resolved.bookId } });
  });
  revalidatePath("/school-dashboard/teacher-assignments"); revalidatePath("/school-dashboard/books"); revalidatePath("/school-dashboard/classes"); revalidatePath("/teacher-dashboard"); revalidatePath("/student-dashboard");
}
export async function removeSchoolTeacherAssignments(form: FormData) {
  const school = await requireSchool();
  const teacherId = formValue(form, 'teacherId');
  const sectionId = formValue(form, 'sectionId');
  if (!teacherId || !sectionId) throw new SchoolTeacherAssignmentError("VALIDATION_ERROR", "Choose an assignment to remove.");
  const section = await prisma.classSection.findFirst({
    where: { id: sectionId, active: true, schoolClass: { schoolId: school.id, active: true, academicYear: { active: true, current: true } } },
    select: { schoolClass: { select: { academicYearId: true } } },
  });
  if (!section) throw new SchoolTeacherAssignmentError("SECTION_NOT_AVAILABLE", "This section is no longer available.", "sectionId");
  const result = await prisma.teacherAssignment.updateMany({
    where: { schoolId: school.id, teacherId, sectionId, academicYearId: section.schoolClass.academicYearId, active: true },
    data: { active: false, endedAt: new Date() },
  });
  if (!result.count) throw new SchoolTeacherAssignmentError("ASSIGNMENT_NOT_AVAILABLE", "This assignment was already removed or changed.");
  revalidatePath('/school-dashboard/teacher-assignments');
  revalidatePath('/teacher-dashboard');
}
