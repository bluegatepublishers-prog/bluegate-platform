import "server-only";

import { prisma } from "@/lib/prisma";
import { getTeacherClasses, requireTeacherClass } from "@/lib/classroom";
import { requireTeacher } from "@/lib/teacher-dashboard";

export async function requireTeacherSubject(sectionId: string, sectionSubjectId?: string | null) {
  const scope = await requireTeacherClass(sectionId);
  const subject = sectionSubjectId ? scope.sectionSubjects.find((item) => item.id === sectionSubjectId) : scope.sectionSubjects[0];
  if (!subject) throw new Error("This subject is not assigned to you.");
  return { scope, subject };
}

export async function getTeacherHomeData() {
  const teacher = await requireTeacher(); const classes = await getTeacherClasses(); const sectionIds = classes.map((item) => item.sectionId); const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const end = new Date(start); end.setDate(end.getDate() + 7);
  const [plans, assignmentReview, assessmentGrade, notice, messages] = await Promise.all([
    prisma.academicPlannerItem.findMany({ where: { schoolId: teacher.schoolId!, academicYear: { current: true, active: true }, sectionId: { in: sectionIds }, type: "TEACHING", currentDate: { gte: start, lt: end }, status: { notIn: ["CANCELLED", "SKIPPED"] } }, include: { section: { include: { schoolClass: true } }, sectionSubject: { include: { subject: true } }, reschedules: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { currentDate: "asc" } }),
    prisma.assignmentSubmission.count({ where: { assignment: { teacherId: teacher.id, sectionId: { in: sectionIds } }, status: { in: ["SUBMITTED", "RESUBMITTED"] } } }),
    prisma.assessmentResponse.count({ where: { attempt: { assessment: { createdById: teacher.userId, sectionId: { in: sectionIds } } }, reviewStatus: "PENDING" } }),
    prisma.academicPlannerItem.findFirst({ where: { schoolId: teacher.schoolId!, academicYear: { current: true, active: true }, sectionId: null, type: "NOTICE", status: { not: "CANCELLED" } }, orderBy: [{ currentDate: "desc" }, { createdAt: "desc" }] }),
    prisma.sectionChatMessage.findMany({ where: { room: { schoolId: teacher.schoolId!, sectionId: { in: sectionIds } }, deletedAt: null }, include: { sender: { select: { name: true, role: true } }, room: { include: { section: { include: { schoolClass: true } } } } }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  return { teacher, classes, plans, assignmentReview, assessmentGrade, notice, messages };
}

export async function getTeacherWorkspaceData(sectionId: string, sectionSubjectId?: string | null) {
  const { scope, subject } = await requireTeacherSubject(sectionId, sectionSubjectId); const now = new Date();
  const [studentCount, plans, assignments, assessments, materials, attention] = await Promise.all([
    prisma.studentEnrollment.count({ where: { schoolId: scope.schoolId, academicYearId: scope.academicYear.id, sectionId, status: "ACTIVE", student: { active: true } } }),
    prisma.academicPlannerItem.findMany({ where: { schoolId: scope.schoolId, academicYearId: scope.academicYear.id, sectionId, sectionSubjectId: subject.id, type: "TEACHING", status: { notIn: ["CANCELLED", "SKIPPED"] } }, orderBy: { currentDate: "asc" }, take: 6 }),
    prisma.classroomAssignment.findMany({ where: { teacherId: scope.teacher.id, schoolId: scope.schoolId, academicYearId: scope.academicYear.id, sectionId, sectionSubjectId: subject.id }, include: { submissions: { where: { status: { in: ["SUBMITTED", "RESUBMITTED"] } }, select: { id: true } } }, orderBy: { updatedAt: "desc" }, take: 8 }),
    prisma.assessment.findMany({ where: { schoolId: scope.schoolId, academicYearId: scope.academicYear.id, sectionId, sectionSubjectId: subject.id }, include: { attempts: { select: { id: true, status: true } } }, orderBy: { updatedAt: "desc" }, take: 8 }),
    prisma.classMaterial.count({ where: { teacherId: scope.teacher.id, sectionId, sectionSubjectId: subject.id, archivedAt: null } }),
    prisma.studentLearningGap.count({ where: { schoolId: scope.schoolId, academicYearId: scope.academicYear.id, subjectId: subject.subjectId, status: { not: "RESOLVED" }, student: { enrollments: { some: { sectionId, academicYearId: scope.academicYear.id, status: "ACTIVE" } } } } }),
  ]);
  return { scope, subject, studentCount, plans, assignments, assessments, materials, attention, now };
}

export async function getTeacherPlannerData() {
  const teacher = await requireTeacher(); const classes = await getTeacherClasses(); const allowed = new Set(classes.flatMap((item) => item.subjects.map((subject) => subject.id)));
  const items = await prisma.academicPlannerItem.findMany({ where: { schoolId: teacher.schoolId!, academicYear: { current: true, active: true }, sectionSubjectId: { in: [...allowed] } }, include: { section: { include: { schoolClass: true } }, sectionSubject: { include: { subject: true } }, reschedules: { orderBy: { createdAt: "desc" } }, assignment: { select: { id: true, title: true } }, assessment: { select: { id: true, title: true } } }, orderBy: { currentDate: "asc" } });
  return { teacher, classes, items };
}
