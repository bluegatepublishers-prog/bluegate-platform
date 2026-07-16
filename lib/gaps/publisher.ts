import "server-only";
import { PlatformFeatureKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdmin } from "@/lib/publisher-context";
import { requirePublisherFeature } from "@/lib/publisher-features";

export async function getPublisherGapReport() {
  const { publisher } = await requirePublisherAdmin();
  await requirePublisherFeature(publisher.id, PlatformFeatureKey.GAP_ANALYSIS);
  const gaps = await prisma.studentLearningGap.findMany({ where: { publisherId: publisher.id, academicYear: { current: true, active: true } }, select: { dimension: true, severity: true, status: true, firstDetectedAt: true, skillLabel: true, schoolId: true, book: { select: { title: true } }, chapter: { select: { title: true, chapterNumber: true } } }, take: 1000 });
  return { publisher, total: gaps.length, participatingSchools: new Set(gaps.map((gap) => gap.schoolId)).size, books: count(gaps.map((gap) => gap.book?.title ?? null)), chapters: count(gaps.map((gap) => gap.chapter ? `Chapter ${gap.chapter.chapterNumber}: ${gap.chapter.title}` : null)), outcomes: count(gaps.map((gap) => gap.dimension === "LEARNING_OUTCOME" ? gap.skillLabel : null)), competencies: count(gaps.map((gap) => gap.dimension === "COMPETENCY" ? gap.skillLabel : null)), severity: count(gaps.map((gap) => gap.severity)), status: count(gaps.map((gap) => gap.status)), trend: count(gaps.map((gap) => gap.firstDetectedAt.toISOString().slice(0, 7))) };
}

function count(values: Array<string | null>) { const map = new Map<string, number>(); for (const value of values) if (value) map.set(value, (map.get(value) ?? 0) + 1); return [...map].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 20); }
