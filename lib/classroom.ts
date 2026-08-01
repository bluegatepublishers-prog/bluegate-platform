import "server-only";

import { notFound } from "next/navigation";
import { TeacherAssignmentType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-dashboard";

export async function getTeacherClasses() {
  const teacher = await requireTeacher();
  if (!teacher.schoolId || !teacher.school?.publisherId) return [];

  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      teacherId: teacher.id,
      schoolId: teacher.schoolId,
      active: true,
      academicYear: { active: true, current: true, schoolId: teacher.schoolId },
      schoolClass: { active: true, schoolId: teacher.schoolId },
      section: { active: true },
    },
    include: {
      academicYear: true,
      schoolClass: true,
      section: {
        include: {
          _count: {
            select: { enrollments: { where: { status: "ACTIVE" } } },
          },
        },
      },
      subject: true,
    },
    orderBy: [
      { academicYear: { current: "desc" } },
      { academicYear: { startDate: "desc" } },
      { schoolClass: { sortOrder: "asc" } },
      { section: { name: "asc" } },
    ],
  });

  const sectionSubjects = await prisma.sectionSubject.findMany({
    where: { active: true, sectionId: { in: [...new Set(assignments.map((item) => item.sectionId))] }, subjectId: { in: assignments.flatMap((item) => item.subjectId ? [item.subjectId] : []) } },
    select: { id: true, sectionId: true, subjectId: true },
  });

  const grouped = new Map<string, {
    sectionId: string;
    academicYearId: string;
    academicYearName: string;
    current: boolean;
    className: string;
    sectionName: string;
    studentCount: number;
    classTeacher: boolean;
    subjects: Array<{ id: string; subjectId: string; name: string }>;
  }>();
  for (const assignment of assignments) {
    if (
      assignment.academicYearId !== assignment.schoolClass.academicYearId ||
      assignment.schoolClassId !== assignment.section.schoolClassId
    ) continue;
    const row = grouped.get(assignment.sectionId) ?? {
      sectionId: assignment.sectionId,
      academicYearId: assignment.academicYearId,
      academicYearName: assignment.academicYear.name,
      current: assignment.academicYear.current,
      className: assignment.schoolClass.name,
      sectionName: assignment.section.name,
      studentCount: assignment.section._count.enrollments,
      classTeacher: false,
      subjects: [],
    };
    if (assignment.type === TeacherAssignmentType.CLASS_TEACHER) row.classTeacher = true;
    const sectionSubject = assignment.subjectId ? sectionSubjects.find((item) => item.sectionId === assignment.sectionId && item.subjectId === assignment.subjectId) : null;
    if (assignment.subject && sectionSubject && !row.subjects.some((subject) => subject.id === sectionSubject.id)) {
      row.subjects.push({ id: sectionSubject.id, subjectId: assignment.subject.id, name: assignment.subject.name });
    }
    grouped.set(assignment.sectionId, row);
  }
  return [...grouped.values()];
}

export async function requireTeacherClass(sectionId: string) {
  const teacher = await requireTeacher();
  if (!teacher.schoolId || !teacher.school?.publisherId) notFound();
  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      teacherId: teacher.id,
      schoolId: teacher.schoolId,
      sectionId,
      active: true,
      academicYear: { active: true, current: true, schoolId: teacher.schoolId },
      schoolClass: { active: true, schoolId: teacher.schoolId },
      section: { active: true },
    },
    include: {
      academicYear: true,
      schoolClass: true,
      section: true,
      subject: true,
    },
  });
  const first = assignments[0];
  if (!first) notFound();
  const canonical = assignments.filter((assignment) =>
    assignment.academicYearId === first.academicYearId &&
    assignment.schoolClassId === first.schoolClassId &&
    assignment.section.schoolClassId === first.schoolClassId,
  );
  if (!canonical.length) notFound();

  const isClassTeacher = canonical.some((assignment) => assignment.type === TeacherAssignmentType.CLASS_TEACHER);
  const assignedSubjectIds = canonical
    .filter((assignment) => assignment.type === TeacherAssignmentType.SUBJECT_TEACHER && assignment.subjectId)
    .map((assignment) => assignment.subjectId!);
  const sectionSubjects = await prisma.sectionSubject.findMany({
    where: {
      sectionId,
      active: true,
      subject: { active: true },
      subjectId: { in: assignedSubjectIds },
    },
    include: {
      subject: true,
      bookAdoptions: {
        where: {
          publisherId: teacher.school.publisherId,
          schoolId: teacher.schoolId,
          academicYearId: first.academicYearId,
          schoolClassId: first.schoolClassId,
          sectionId,
          status: "APPROVED",
          active: true,
        },
        include: {
          book: {
            include: {
              chapters: {
                where: { approved: true },
                orderBy: [{ sortOrder: "asc" }, { chapterNumber: "asc" }],
              },
            },
          },
        },
      },
      resources: {
        where: { publisherId: teacher.school.publisherId, published: true },
        orderBy: { title: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { subject: { sortOrder: "asc" } }],
  });

  return {
    teacher,
    publisherId: teacher.school.publisherId,
    schoolId: teacher.schoolId,
    academicYear: first.academicYear,
    schoolClass: first.schoolClass,
    section: first.section,
    assignments: canonical,
    isClassTeacher,
    sectionSubjects,
  };
}

export async function getTeacherClassOverview(sectionId: string) {
  const scope = await requireTeacherClass(sectionId);
  const [studentCount, materialCount, sharedMaterialCount] = await Promise.all([
    prisma.studentEnrollment.count({
      where: {
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
        schoolClassId: scope.schoolClass.id,
        sectionId: scope.section.id,
        status: "ACTIVE",
        student: { active: true },
      },
    }),
    prisma.classMaterial.count({
      where: { teacherId: scope.teacher.id, sectionId, archivedAt: null },
    }),
    prisma.classMaterial.count({
      where: {
        teacherId: scope.teacher.id,
        sectionId,
        archivedAt: null,
        OR: [
          { status: "SHARED" },
          { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
        ],
      },
    }),
  ]);
  return { scope, studentCount, materialCount, sharedMaterialCount };
}

export async function getTeacherClassStudents(sectionId: string) {
  const scope = await requireTeacherClass(sectionId);
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
      schoolClassId: scope.schoolClass.id,
      sectionId: scope.section.id,
      status: "ACTIVE",
      student: { active: true },
    },
    include: { student: true },
    orderBy: [{ rollNumber: "asc" }, { student: { name: "asc" } }],
  });
  const studentIds = enrollments.map((item) => item.studentId);
  const [submissions, attempts, analytics, gaps] = await Promise.all([
    prisma.assignmentSubmission.findMany({ where: { studentId: { in: studentIds }, schoolId: scope.schoolId, academicYearId: scope.academicYear.id, sectionId }, select: { studentId: true, status: true } }),
    prisma.assessmentAttempt.findMany({ where: { studentId: { in: studentIds }, schoolId: scope.schoolId, academicYearId: scope.academicYear.id, assessment: { sectionId } }, select: { studentId: true, status: true, result: { select: { percentage: true } } } }),
    prisma.studentAnalytics.findMany({ where: { studentId: { in: studentIds }, academicYearId: scope.academicYear.id }, select: { studentId: true, readingPercent: true, averagePractice: true, averageAssessment: true } }),
    prisma.studentLearningGap.findMany({ where: { studentId: { in: studentIds }, schoolId: scope.schoolId, academicYearId: scope.academicYear.id, status: { not: "RESOLVED" } }, select: { studentId: true } }),
  ]);
  return { scope, enrollments, summaries: new Map(enrollments.map((enrollment) => { const studentSubmissions = submissions.filter((item) => item.studentId === enrollment.studentId); const studentAttempts = attempts.filter((item) => item.studentId === enrollment.studentId); const facts = analytics.find((item) => item.studentId === enrollment.studentId); return [enrollment.studentId, { assignmentsCompleted: studentSubmissions.filter((item) => ["SUBMITTED", "RESUBMITTED", "GRADED"].includes(item.status)).length, assignmentsTotal: studentSubmissions.length, assessmentsCompleted: studentAttempts.filter((item) => item.status === "GRADED" || item.status === "SUBMITTED").length, assessmentAverage: facts?.averageAssessment ?? null, learningProgress: facts?.readingPercent ?? facts?.averagePractice ?? null, gaps: gaps.filter((item) => item.studentId === enrollment.studentId).length }]; })) };
}

export async function getTeacherClassMaterials(sectionId: string) {
  const scope = await requireTeacherClass(sectionId);
  const subjectIds = scope.sectionSubjects.map((item) => item.subjectId);
  const [materials, reusableMaterials, aiGenerations] = await Promise.all([
    prisma.classMaterial.findMany({
      where: {
        teacherId: scope.teacher.id,
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
        sectionId,
        subjectId: { in: subjectIds },
        archivedAt: null,
      },
      include: { subject: true, chapter: true, resource: true, aiGeneration: true },
      orderBy: [{ subject: { sortOrder: "asc" } }, { chapter: { chapterNumber: "asc" } }, { updatedAt: "desc" }],
    }),
    prisma.classMaterial.findMany({
      where: {
        teacherId: scope.teacher.id,
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        archivedAt: null,
      },
      select: { id: true, title: true, kind: true, source: true, fileUrl: true, externalUrl: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.aiGeneration.findMany({
      where: { teacherId: scope.teacher.id, status: "COMPLETED", quotaConsumed: true, output: { not: null } },
      select: { id: true, title: true, tool: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);
  return {
    scope,
    materials: materials.map((item) => ({
      ...item,
      fileSizeBytes: item.fileSizeBytes === null ? null : Number(item.fileSizeBytes),
    })),
    reusableMaterials,
    aiGenerations,
  };
}

export async function getTeacherClassAnalytics(sectionId: string) {
  const scope = await requireTeacherClass(sectionId);
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
      schoolClassId: scope.schoolClass.id,
      sectionId,
      status: "ACTIVE",
    },
    select: { studentId: true },
  });
  const studentIds = enrollments.map((item) => item.studentId);
  const subjectIds = scope.sectionSubjects.map((item) => item.subjectId);
  const [studentFacts, subjectFacts] = await Promise.all([
    prisma.studentAnalytics.findMany({
      where: { studentId: { in: studentIds }, academicYearId: scope.academicYear.id },
    }),
    prisma.studentSubjectAnalytics.findMany({
      where: {
        studentId: { in: studentIds },
        academicYearId: scope.academicYear.id,
        subjectId: { in: subjectIds },
      },
      include: { subject: { select: { name: true } } },
    }),
  ]);
  const average = (values: Array<number | null>) => {
    const present = values.filter((value): value is number => typeof value === "number");
    return present.length ? Math.round((present.reduce((sum, value) => sum + value, 0) / present.length) * 10) / 10 : null;
  };
  return {
    scope,
    summary: {
      enrolled: studentIds.length,
      participating: studentFacts.filter((item) => item.lastActivityAt).length,
      reading: average(studentFacts.map((item) => item.readingPercent)),
      practice: average(studentFacts.map((item) => item.averagePractice)),
      assessment: average(studentFacts.map((item) => item.averageAssessment)),
    },
    subjects: scope.sectionSubjects.map((sectionSubject) => {
      const rows = subjectFacts.filter((item) => item.subjectId === sectionSubject.subjectId);
      return {
        id: sectionSubject.subjectId,
        name: sectionSubject.subject.name,
        participating: rows.filter((item) => item.lastActivityAt).length,
        completion: average(rows.map((item) => item.completionPercent)),
        practice: average(rows.map((item) => item.averagePractice)),
        assessment: average(rows.map((item) => item.averageAssessment)),
      };
    }),
  };
}
