import "server-only";

import { AssessmentStatus, BookAdoptionStatus, PlatformFeatureKey, RemedialRecommendationType, ResourceAudience, ResourceType } from "@prisma/client";
import { planIncludesPremiumFeature } from "@/lib/entitlements/features-policy";
import { getEffectiveStudentPlan } from "@/lib/entitlements/student-plan";
import { prisma } from "@/lib/prisma";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { buildRemedialDraft } from "./policy";
import type { ApprovedRemedialReference } from "./types";

export async function recommendForGap(gapId: string, now = new Date()) {
  const gap = await prisma.studentLearningGap.findUnique({
    where: { id: gapId },
    select: { id: true, publisherId: true, schoolId: true, studentId: true, academicYearId: true, subjectId: true, bookId: true, chapterId: true, severity: true, status: true, latestRunId: true },
  });
  if (!gap || !["OPEN", "ACKNOWLEDGED"].includes(gap.status)) return null;
  if (!await isPublisherFeatureEnabled(gap.publisherId, PlatformFeatureKey.REMEDIALS)) return null;
  const plan = await getEffectiveStudentPlan(gap.studentId, gap.academicYearId, now);
  if (!planIncludesPremiumFeature(plan.plan, "REMEDIALS")) return null;

  const enrollment = await prisma.studentEnrollment.findFirst({ where: { studentId: gap.studentId, academicYearId: gap.academicYearId, schoolId: gap.schoolId, status: "ACTIVE" }, select: { sectionId: true, schoolClassId: true } });
  if (!enrollment) return null;
  const adopted = await prisma.schoolBookAdoption.findMany({
    where: { schoolId: gap.schoolId, academicYearId: gap.academicYearId, sectionId: enrollment.sectionId, status: BookAdoptionStatus.APPROVED, active: true, ...(gap.bookId ? { bookId: gap.bookId } : gap.subjectId ? { sectionSubject: { subjectId: gap.subjectId, active: true } } : { id: "__none__" }) },
    select: { bookId: true, sectionSubjectId: true }, orderBy: [{ approvedAt: "asc" }, { id: "asc" }],
  });
  if (!adopted.length) return null;
  const bookId = gap.bookId ?? adopted[0].bookId;
  const chapter = gap.chapterId
    ? await prisma.bookChapter.findFirst({ where: { id: gap.chapterId, bookId, approved: true, book: { publisherId: gap.publisherId, published: true } }, select: { id: true, bookId: true, title: true, chapterNumber: true, startPage: true, endPage: true } })
    : await prisma.bookChapter.findFirst({ where: { bookId, approved: true, book: { publisherId: gap.publisherId, published: true } }, orderBy: [{ sortOrder: "asc" }, { chapterNumber: "asc" }], select: { id: true, bookId: true, title: true, chapterNumber: true, startPage: true, endPage: true } });
  if (!chapter) return null;
  const chapterLabel = `Chapter ${chapter.chapterNumber}: ${chapter.title}`;
  const refs: ApprovedRemedialReference[] = [];
  if (chapter.startPage != null && chapter.endPage != null) refs.push({ type: RemedialRecommendationType.SPECIFIC_PAGES, labelSnapshot: chapterLabel, required: true, bookId, chapterId: chapter.id, pageStart: chapter.startPage, pageEnd: chapter.endPage });
  else refs.push({ type: RemedialRecommendationType.BOOK_CHAPTER, labelSnapshot: chapterLabel, required: true, bookId, chapterId: chapter.id });
  refs.push({ type: RemedialRecommendationType.REVISION_HUB, labelSnapshot: chapterLabel, required: true, bookId, chapterId: chapter.id });

  const sectionSubjectIds = adopted.filter((row) => row.bookId === bookId).map((row) => row.sectionSubjectId);
  const resources = await prisma.resource.findMany({ where: { publisherId: gap.publisherId, published: true, audience: { in: [ResourceAudience.STUDENT, ResourceAudience.BOTH] }, type: { in: [ResourceType.VIDEO, ResourceType.PPT] }, sectionSubjects: { some: { id: { in: sectionSubjectIds } } } }, orderBy: [{ type: "asc" }, { title: "asc" }, { id: "asc" }], take: 4, select: { id: true, title: true, type: true } });
  for (const resource of resources) refs.push({ type: resource.type === ResourceType.VIDEO ? RemedialRecommendationType.VIDEO : RemedialRecommendationType.PPT, labelSnapshot: resource.title, required: true, resourceId: resource.id, bookId, chapterId: chapter.id });

  const hasPractice = Boolean(await prisma.bookQuestion.findFirst({ where: { bookId, chapterId: chapter.id, questionType: { in: ["MCQ", "TRUE_FALSE", "FILL_BLANK", "SHORT_ANSWER"] } }, select: { id: true } }));
  if (hasPractice) refs.push({ type: RemedialRecommendationType.INTERACTIVE_PRACTICE, labelSnapshot: chapterLabel, required: true, bookId, chapterId: chapter.id });
  const assessment = await prisma.assessment.findFirst({ where: { publisherId: gap.publisherId, schoolId: gap.schoolId, academicYearId: gap.academicYearId, sectionId: enrollment.sectionId, bookId, status: AssessmentStatus.PUBLISHED, OR: [{ chapterId: chapter.id }, { chapterId: null }] }, orderBy: [{ chapterId: "desc" }, { publishedAt: "desc" }, { id: "asc" }], select: { id: true, title: true } });
  if (assessment) refs.push({ type: RemedialRecommendationType.ASSESSMENT_RETRY, labelSnapshot: assessment.title, required: true, assessmentId: assessment.id, bookId, chapterId: chapter.id });
  if (planIncludesPremiumFeature(plan.plan, "STUDENT_AI") && await isPublisherFeatureEnabled(gap.publisherId, PlatformFeatureKey.STUDENT_AI)) refs.push({ type: RemedialRecommendationType.STUDENT_AI, labelSnapshot: chapterLabel, required: false, bookId, chapterId: chapter.id });
  return { gap, draft: buildRemedialDraft({ severity: gap.severity, references: refs, now }) };
}
