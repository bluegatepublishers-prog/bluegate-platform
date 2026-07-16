import "server-only";
import { PlatformFeatureKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePublisherFeature } from "@/lib/publisher-features";
import { requireSchool } from "@/lib/school-dashboard";

export async function getSchoolGapReport() {
  const school = await requireSchool();
  if (!school.publisherId) return { gaps: [], patterns: [], chapters: [], outcomes: [], competencies: [], subjects: [], severity: [], status: [], studentsNeedingSupport: 0 };
  await requirePublisherFeature(school.publisherId, PlatformFeatureKey.GAP_ANALYSIS);
  const gaps = await prisma.studentLearningGap.findMany({ where: { schoolId: school.id, academicYear: { current: true, active: true } }, select: { dimension: true, severity: true, status: true, skillLabel: true, chapter: { select: { title: true, chapterNumber: true } }, subject: { select: { name: true } }, student: { select: { id: true, name: true, enrollments: { where: { status: "ACTIVE" }, take: 1, select: { section: { select: { name: true, schoolClass: { select: { name: true } } } } } } } } }, take: 500 });
  return { gaps, patterns: count(gaps.map((gap) => gap.skillLabel ?? gap.chapter?.title ?? gap.subject?.name ?? null)), chapters: count(gaps.map((gap) => gap.chapter ? `Chapter ${gap.chapter.chapterNumber}: ${gap.chapter.title}` : null)), outcomes: count(gaps.map((gap) => gap.dimension === "LEARNING_OUTCOME" ? gap.skillLabel : null)), competencies: count(gaps.map((gap) => gap.dimension === "COMPETENCY" ? gap.skillLabel : null)), subjects: count(gaps.map((gap) => gap.subject?.name ?? null)), severity: count(gaps.map((gap) => gap.severity)), status: count(gaps.map((gap) => gap.status)), studentsNeedingSupport: new Set(gaps.filter((gap) => ["OPEN", "ACKNOWLEDGED"].includes(gap.status)).map((gap) => gap.student.id)).size };
}

function count(values: Array<string | null>) { const map = new Map<string, number>(); for (const value of values) if (value) map.set(value, (map.get(value) ?? 0) + 1); return [...map].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count); }
