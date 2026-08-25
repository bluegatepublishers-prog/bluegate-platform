import "server-only";

import { prisma } from "@/lib/prisma";
import { getTeacherClasses, requireTeacherClass } from "@/lib/classroom";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { getSchoolFeatureAccessForSchool, getSchoolFeatureAccessMap } from "@/lib/school-feature-access";
import { getTeacherReviewCounts } from "@/lib/teacher-review";

export async function requireTeacherSubject(sectionId: string, sectionSubjectId?: string | null) {
  const scope = await requireTeacherClass(sectionId);
  const subject = sectionSubjectId ? scope.sectionSubjects.find((item) => item.id === sectionSubjectId) : scope.sectionSubjects[0];
  if (!subject) throw new Error("This subject is not assigned to you.");
  return { scope, subject };
}

export async function getTeacherPlannerFeatureAccess(school: { id: string; publisherId: string | null }) {
  return getSchoolFeatureAccessForSchool(school, "PLANNER");
}

export async function getTeacherHomeData() {
  const teacher = await requireTeacher();
  const classes = await getTeacherClasses();
  const plannerAccess = teacher.school ? await getTeacherPlannerFeatureAccess(teacher.school) : { allowed: false };
  const sectionIds = classes.map((item) => item.sectionId);
  const subjectIds = classes.flatMap((item) => item.subjects.map((subject) => subject.id));
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const reviewScope = {
    teacherId: teacher.id,
    teacherUserId: teacher.userId,
    publisherId: teacher.school?.publisherId ?? "",
    schoolId: teacher.schoolId ?? "",
    academicYearId: classes[0]?.academicYearId ?? "",
    sectionIds,
    sectionSubjectIds: subjectIds,
  };
  const [teachingPlanCount, reviewCounts, notice, messages, sectionSubjectBooks, featureAccess] = await Promise.all([
    plannerAccess.allowed ? prisma.teachingPlan.count({ where: { teacherId: teacher.id, schoolId: teacher.schoolId!, academicYear: { current: true, active: true, schoolId: teacher.schoolId! } } }) : Promise.resolve(0),
    getTeacherReviewCounts(reviewScope),
    plannerAccess.allowed ? prisma.academicPlannerItem.findFirst({ where: { schoolId: teacher.schoolId!, academicYear: { current: true, active: true }, sectionId: null, type: "NOTICE", status: { not: "CANCELLED" } }, orderBy: [{ currentDate: "desc" }, { createdAt: "desc" }] }) : Promise.resolve(null),
    prisma.sectionChatMessage.findMany({ where: { room: { schoolId: teacher.schoolId!, sectionId: { in: sectionIds } }, deletedAt: null }, include: { sender: { select: { name: true, role: true } }, room: { include: { section: { include: { schoolClass: true } } } } }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.sectionSubject.findMany({ where: { id: { in: subjectIds }, active: true, book: { publisherId: teacher.school?.publisherId ?? "", published: true, archived: false, schoolEntitlements: { some: { schoolId: teacher.schoolId!, publisherId: teacher.school?.publisherId ?? "", status: "ACTIVE" } } }, section: { active: true, schoolClass: { schoolId: teacher.schoolId!, active: true, academicYear: { active: true, current: true } } } }, select: { id: true, section: { select: { schoolClass: { select: { academicYearId: true } } } }, book: { select: { id: true, title: true } } } }),
    teacher.school ? getSchoolFeatureAccessMap(teacher.school) : Promise.resolve({} as Record<string, boolean>),
  ]);
  const directBookBySubject = new Map(sectionSubjectBooks.map((item) => [`${item.id}:${item.section.schoolClass.academicYearId}`, item.book]));
  const assignments = classes.flatMap((item) => item.subjects.map((subject) => ({ sectionId: item.sectionId, academicYearId: item.academicYearId, className: item.className, sectionName: item.sectionName, subjectId: subject.id, subjectName: subject.name, book: directBookBySubject.get(`${subject.id}:${item.academicYearId}`) ?? null })));
  return {
    teacher,
    classes,
    assignments,
    plans: [],
    teachingPlanCount,
    assignmentReview: reviewCounts.assignmentSubmissions,
    assessmentGrade: reviewCounts.assessmentResponses,
    reviewCounts,
    notice,
    messages,
    featureAccess,
  };
}

export async function getTeacherWorkspaceData(sectionId: string, sectionSubjectId?: string | null) {
  const { scope, subject } = await requireTeacherSubject(sectionId, sectionSubjectId);
  const reviewScope = {
    teacherId: scope.teacher.id,
    teacherUserId: scope.teacher.userId,
    publisherId: scope.publisherId,
    schoolId: scope.schoolId,
    academicYearId: scope.academicYear.id,
    sectionIds: [sectionId],
    sectionSubjectIds: [subject.id],
  };
  const [studentCount, assignments, assessments, materials, attention, reviewCounts] = await Promise.all([
    prisma.studentEnrollment.count({ where: { schoolId: scope.schoolId, academicYearId: scope.academicYear.id, sectionId, status: "ACTIVE", student: { active: true } } }),
    prisma.classroomAssignment.findMany({ where: { teacherId: scope.teacher.id, schoolId: scope.schoolId, academicYearId: scope.academicYear.id, sectionId, sectionSubjectId: subject.id }, include: { submissions: { where: { status: { in: ["SUBMITTED", "RESUBMITTED"] } }, select: { id: true } } }, orderBy: { updatedAt: "desc" }, take: 8 }),
    prisma.assessment.findMany({ where: { schoolId: scope.schoolId, academicYearId: scope.academicYear.id, sectionId, sectionSubjectId: subject.id }, include: { attempts: { select: { id: true, status: true } } }, orderBy: { updatedAt: "desc" }, take: 8 }),
    prisma.classMaterial.count({ where: { teacherId: scope.teacher.id, sectionId, sectionSubjectId: subject.id, archivedAt: null } }),
    prisma.studentLearningGap.count({ where: { schoolId: scope.schoolId, academicYearId: scope.academicYear.id, subjectId: subject.subjectId, status: { not: "RESOLVED" }, student: { enrollments: { some: { sectionId, academicYearId: scope.academicYear.id, status: "ACTIVE" } } } } }),
    getTeacherReviewCounts(reviewScope),
  ]);
  return { scope, subject, studentCount, plans: [], assignments, assessments, materials, attention, reviewCounts };
}
