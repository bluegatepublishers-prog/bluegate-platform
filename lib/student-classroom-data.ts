import "server-only";

import { TeacherAssignmentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentSubjects } from "@/lib/student-subjects";

export async function getStudentClassroomData() {
  const identity = await requireStudent();
  const subjects = await getStudentSubjects();
  const now = new Date();
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
  const scope = { schoolId: identity.school.id, academicYearId: identity.enrollment.academicYearId, sectionId: identity.enrollment.sectionId };
  const [classTeacher, assignments, assessments, today, announcement, progress] = await Promise.all([
    prisma.teacherAssignment.findFirst({ where: { ...scope, schoolClassId: identity.enrollment.schoolClassId, type: TeacherAssignmentType.CLASS_TEACHER, active: true, teacher: { active: true } }, orderBy: { createdAt: "desc" }, select: { teacher: { select: { user: { select: { name: true } } } } } }),
    prisma.classroomAssignment.findMany({ where: { ...scope, status: "PUBLISHED", OR: [{ dueAt: null }, { dueAt: { gte: now } }] }, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }], take: 5, select: { id: true, title: true, dueAt: true, sectionSubjectId: true } }),
    prisma.assessment.findMany({ where: { ...scope, status: "PUBLISHED", OR: [{ dueAt: { gte: now } }, { opensAt: { gte: now } }] }, orderBy: [{ dueAt: "asc" }, { opensAt: "asc" }], take: 5, select: { id: true, title: true, opensAt: true, dueAt: true, sectionSubjectId: true } }),
    prisma.academicPlannerItem.findMany({ where: { ...scope, type: "TEACHING", currentDate: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), lte: endToday }, status: { notIn: ["CANCELLED", "SKIPPED"] } }, orderBy: { currentDate: "asc" }, select: { id: true, title: true, currentDate: true, status: true, sectionSubject: { select: { subject: { select: { name: true } } } } } }),
    prisma.academicPlannerItem.findFirst({ where: { schoolId: scope.schoolId, academicYearId: scope.academicYearId, OR: [{ sectionId: null }, { sectionId: scope.sectionId }], type: { in: ["NOTICE", "EVENT"] }, currentDate: { lte: endToday }, status: { not: "CANCELLED" } }, orderBy: [{ currentDate: "desc" }, { createdAt: "desc" }], select: { id: true, title: true, description: true, currentDate: true, type: true } }),
    prisma.studentBookProgress.findMany({ where: { studentId: identity.student.id, academicYearId: identity.enrollment.academicYearId, bookId: { in: subjects.flatMap((item) => item.book ? [item.book.id] : []) } }, orderBy: { lastReadAt: "desc" }, select: { bookId: true, lastPage: true, totalPages: true, lastReadAt: true } }),
  ]);
  return { identity, subjects, classTeacher: classTeacher?.teacher.user.name ?? null, assignments, assessments, today, announcement, progress };
}

export async function getStudentPlannerItems() {
  const identity = await requireStudent();
  const scope = { schoolId: identity.school.id, academicYearId: identity.enrollment.academicYearId };
  const sectionId = identity.enrollment.sectionId;
  const [items, assignments, assessments] = await Promise.all([
    prisma.academicPlannerItem.findMany({ where: { ...scope, OR: [{ sectionId: null }, { sectionId }], status: { not: "CANCELLED" } }, orderBy: { currentDate: "asc" }, include: { reschedules: { orderBy: { createdAt: "desc" }, take: 1 }, sectionSubject: { select: { subject: { select: { name: true } } } } } }),
    prisma.classroomAssignment.findMany({ where: { ...scope, sectionId, status: "PUBLISHED", dueAt: { not: null } }, select: { id: true, title: true, dueAt: true }, orderBy: { dueAt: "asc" } }),
    prisma.assessment.findMany({ where: { ...scope, sectionId, status: "PUBLISHED", OR: [{ opensAt: { not: null } }, { dueAt: { not: null } }] }, select: { id: true, title: true, opensAt: true, dueAt: true }, orderBy: { opensAt: "asc" } }),
  ]);
  return [
    ...items.map((item) => ({ id: item.id, type: item.type, title: item.title, description: item.description, date: item.currentDate, originalDate: item.originalDate, status: item.status, href: null as string | null, subject: item.sectionSubject?.subject.name ?? null, rescheduled: item.reschedules.length > 0 })),
    ...assignments.map((item) => ({ id: `assignment-${item.id}`, type: "ASSIGNMENT" as const, title: item.title, description: null, date: item.dueAt!, originalDate: item.dueAt!, status: "SCHEDULED" as const, href: `/student-dashboard/assignments/${item.id}`, subject: null, rescheduled: false })),
    ...assessments.map((item) => ({ id: `assessment-${item.id}`, type: "ASSESSMENT" as const, title: item.title, description: null, date: item.opensAt ?? item.dueAt!, originalDate: item.opensAt ?? item.dueAt!, status: "SCHEDULED" as const, href: `/student-dashboard/assessments/${item.id}`, subject: null, rescheduled: false })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function getStudentNotices(input: { type?: string; query?: string }) {
  const identity = await requireStudent();
  const allowed = ["NOTICE", "HOLIDAY", "EVENT"] as const;
  const type = allowed.includes(input.type as typeof allowed[number]) ? input.type as typeof allowed[number] : undefined;
  return prisma.academicPlannerItem.findMany({ where: { schoolId: identity.school.id, academicYearId: identity.enrollment.academicYearId, AND: [{ OR: [{ sectionId: null }, { sectionId: identity.enrollment.sectionId }] }, ...(input.query ? [{ OR: [{ title: { contains: input.query, mode: "insensitive" as const } }, { description: { contains: input.query, mode: "insensitive" as const } }] }] : [])], type: type ?? { in: [...allowed] }, status: { not: "CANCELLED" } }, orderBy: [{ currentDate: "desc" }, { createdAt: "desc" }] });
}
