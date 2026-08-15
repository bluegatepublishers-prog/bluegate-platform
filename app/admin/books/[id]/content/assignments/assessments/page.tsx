import PublisherAssessmentList from "@/components/admin/books/PublisherAssessmentList";
import { listPublisherAssessments } from "@/lib/publisher-assessment";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";

import { archivePublisherAssessmentAction, publishPublisherAssessmentAction, restorePublisherAssessmentAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PublisherAssessmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = await params;
  const actor = await requirePublisherAdminBookOwnership(bookId);
  const assessments = await listPublisherAssessments({ publisherId: actor.publisherId, bookId });
  return <PublisherAssessmentList
    bookId={bookId}
    assessments={assessments.map((assessment) => ({
      id: assessment.id,
      heading: assessment.heading,
      kind: assessment.kind,
      scope: scopeSummary(assessment),
      questionCount: assessment._count.items,
      totalMarks: assessment.items.reduce((total, item) => total + item.question.marks, 0),
      deliveryMode: assessment.deliveryMode,
      status: assessment.status,
      updatedAt: assessment.updatedAt.toISOString(),
    }))}
    publishAction={publishPublisherAssessmentAction.bind(null, bookId)}
    archiveAction={archivePublisherAssessmentAction.bind(null, bookId)}
    restoreAction={restorePublisherAssessmentAction.bind(null, bookId)}
  />;
}

function chapterLabel(chapter: { title: string; chapterNumber: number }) {
  return `Chapter ${chapter.chapterNumber}: ${chapter.title}`;
}

function scopeSummary(assessment: Awaited<ReturnType<typeof listPublisherAssessments>>[number]) {
  const chapters = assessment.chapterScopes.map((scope) => scope.chapter);
  if (chapters.length) {
    const labels = chapters.map(chapterLabel);
    if (assessment.kind === "TERM_TEST" || assessment.kind === "MULTI_TERM_TEST") return `Term coverage: ${labels.join(", ")}`;
    return labels.length === 1 ? labels[0] : `Chapters ${chapters.map((chapter) => chapter.chapterNumber).join(", ")}`;
  }
  if (assessment.chapter) return chapterLabel(assessment.chapter);
  if (assessment.unit) return assessment.unit.title;
  return "Whole Book";
}
