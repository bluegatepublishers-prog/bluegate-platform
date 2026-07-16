import "server-only";
import { GapSeverity, GapStatus, PlatformFeatureKey, TeacherAssignmentType } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePublisherFeature } from "@/lib/publisher-features";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { FRIENDLY_GAP_SEVERITY } from "./policy";

export async function getTeacherGapScope() {
  const teacher = await requireTeacher();
  if (!teacher.schoolId || !teacher.school?.publisherId) notFound();
  await requirePublisherFeature(teacher.school.publisherId, PlatformFeatureKey.GAP_ANALYSIS);
  const assignments = await prisma.teacherAssignment.findMany({ where: { teacherId: teacher.id, schoolId: teacher.schoolId, active: true, academicYear: { current: true, active: true } }, select: { academicYearId: true, sectionId: true, subjectId: true, type: true, section: { select: { name: true, schoolClass: { select: { name: true } } } }, subject: { select: { name: true } } } });
  return { teacher, assignments };
}

function assignmentWhere(assignments: Awaited<ReturnType<typeof getTeacherGapScope>>["assignments"]) {
  const classScopes = assignments.filter((row) => row.type === TeacherAssignmentType.CLASS_TEACHER).map((row) => ({ academicYearId: row.academicYearId, student: { enrollments: { some: { academicYearId: row.academicYearId, sectionId: row.sectionId, status: "ACTIVE" as const } } } }));
  const subjectScopes = assignments.filter((row) => row.type === TeacherAssignmentType.SUBJECT_TEACHER && row.subjectId).map((row) => ({ academicYearId: row.academicYearId, subjectId: row.subjectId!, student: { enrollments: { some: { academicYearId: row.academicYearId, sectionId: row.sectionId, status: "ACTIVE" as const } } } }));
  return [...classScopes, ...subjectScopes];
}

export async function getTeacherGaps(filters: { severity?: string; status?: string; subjectId?: string; sectionId?: string; query?: string }) {
  const scope = await getTeacherGapScope(); const OR = assignmentWhere(scope.assignments);
  if (!OR.length) return { gaps: [], assignments: scope.assignments, commonChapters: [], commonOutcomes: [], commonCompetencies: [] };
  const severity = Object.values(GapSeverity).includes(filters.severity as GapSeverity) ? filters.severity as GapSeverity : undefined;
  const status = Object.values(GapStatus).includes(filters.status as GapStatus) ? filters.status as GapStatus : undefined;
  const AND = [filters.query ? { student: { name: { contains: filters.query, mode: "insensitive" as const } } } : {}, filters.sectionId ? { student: { enrollments: { some: { sectionId: filters.sectionId, status: "ACTIVE" as const } } } } : {}];
  const gaps = await prisma.studentLearningGap.findMany({ where: { schoolId: scope.teacher.schoolId!, OR, AND, severity, status, subjectId: filters.subjectId || undefined }, include: { student: { select: { name: true, admissionNumber: true, enrollments: { where: { status: "ACTIVE", academicYear: { current: true, active: true } }, take: 1, select: { section: { select: { name: true, schoolClass: { select: { name: true } } } } } } } }, subject: { select: { name: true } }, chapter: { select: { title: true, chapterNumber: true } } }, orderBy: [{ severity: "desc" }, { lastDetectedAt: "desc" }], take: 200 });
  return {
    assignments: scope.assignments,
    gaps: gaps.map((gap) => ({ id: gap.id, studentName: gap.student.name, admissionNumber: gap.student.admissionNumber, className: gap.student.enrollments[0]?.section.schoolClass.name ?? "Current class", sectionName: gap.student.enrollments[0]?.section.name ?? "—", subject: gap.subject?.name ?? "General learning", learningArea: gap.skillLabel ?? gap.chapter?.title ?? gap.subject?.name ?? "Learning area", severity: gap.severity, severityLabel: FRIENDLY_GAP_SEVERITY[gap.severity], status: gap.status, lastDetectedAt: gap.lastDetectedAt })),
    commonChapters: countLabels(gaps.map((gap) => gap.chapter ? `Chapter ${gap.chapter.chapterNumber}: ${gap.chapter.title}` : null)),
    commonOutcomes: countLabels(gaps.map((gap) => gap.dimension === "LEARNING_OUTCOME" ? gap.skillLabel : null)),
    commonCompetencies: countLabels(gaps.map((gap) => gap.dimension === "COMPETENCY" ? gap.skillLabel : null)),
  };
}

export async function getTeacherOpenGapProjection() {
  const scope = await getTeacherGapScope(); const OR = assignmentWhere(scope.assignments);
  if (!OR.length) return { openGapCount: 0, studentsWithOpenGaps: 0 };
  const gaps = await prisma.studentLearningGap.findMany({ where: { schoolId: scope.teacher.schoolId!, OR, status: { in: [GapStatus.OPEN, GapStatus.ACKNOWLEDGED] } }, select: { studentId: true }, take: 500 });
  return { openGapCount: gaps.length, studentsWithOpenGaps: new Set(gaps.map((gap) => gap.studentId)).size };
}

export async function requireTeacherGap(gapId: string) {
  const scope = await getTeacherGapScope(); const OR = assignmentWhere(scope.assignments); if (!OR.length) notFound();
  const gap = await prisma.studentLearningGap.findFirst({ where: { id: gapId, schoolId: scope.teacher.schoolId!, OR }, include: { student: { select: { name: true, admissionNumber: true } }, subject: { select: { name: true } }, book: { select: { title: true } }, chapter: { select: { title: true, chapterNumber: true } }, reviews: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } } } });
  if (!gap) notFound();
  const evidence = await prisma.studentLearningGapEvidence.findMany({ where: { gapId: gap.id, runId: gap.latestRunId }, orderBy: { createdAt: "asc" } });
  return { teacher: scope.teacher, gap, evidence };
}

function countLabels(labels: Array<string | null>) { const values = new Map<string, number>(); for (const label of labels) if (label) values.set(label, (values.get(label) ?? 0) + 1); return [...values].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 10); }
