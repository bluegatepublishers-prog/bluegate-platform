import { notFound } from "next/navigation";

import PublisherAssessmentStudio from "@/components/admin/books/PublisherAssessmentStudio";
import { adaptBookQuestion, toSafeInteractiveQuestion } from "@/lib/normalized-question";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";
import { getPublisherAssessment } from "@/lib/publisher-assessment";
import { prisma } from "@/lib/prisma";

import {
  addPublisherAssessmentQuestionsAction,
  archivePublisherAssessmentAction,
  movePublisherAssessmentItemAction,
  publishPublisherAssessmentAction,
  removePublisherAssessmentItemAction,
  restorePublisherAssessmentAction,
  savePublisherAssessmentAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function PublisherAssessmentEditorPage({ params, searchParams }: {
  params: Promise<{ id: string; assessmentId: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { id: bookId, assessmentId } = await params;
  const query = await searchParams;
  const actor = await requirePublisherAdminBookOwnership(bookId);
  const assessment = assessmentId === "new" ? null : await getPublisherAssessment({ publisherId: actor.publisherId, bookId, assessmentId });
  if (assessmentId !== "new" && !assessment) notFound();
  const [chapters, units, modules] = await Promise.all([
    prisma.bookChapter.findMany({ where: { bookId, archived: false }, select: { id: true, title: true, chapterNumber: true, unitId: true }, orderBy: [{ chapterNumber: "asc" }, { id: "asc" }] }),
    prisma.bookUnit.findMany({ where: { bookId, archived: false }, select: { id: true, title: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }),
    prisma.bookModule.findMany({ where: { bookId, archived: false }, select: { id: true, title: true, chapterId: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }),
  ]);
  const safeAssessment = assessment && {
    id: assessment.id, kind: assessment.kind, deliveryMode: assessment.deliveryMode, status: assessment.status,
    chapterId: assessment.chapterId, unitId: assessment.unitId,
    chapterIds: assessment.chapterScopes.map((scope) => scope.chapterId),
    instructions: assessment.instructions, durationMinutes: assessment.durationMinutes,
    sectionInstructions: assessment.sectionInstructions,
    items: assessment.items.map((item) => ({
      itemId: item.id, position: item.position, id: item.question.id, chapterId: item.question.chapterId,
      questionType: item.question.questionType, questionText: item.question.questionText, marks: item.question.marks,
      difficulty: item.question.difficulty, tags: item.question.tags, chapter: item.question.chapter, module: item.question.module,
      preview: toSafeInteractiveQuestion(adaptBookQuestion(item.question)),
    })),
  };
  return <PublisherAssessmentStudio
    bookId={bookId} chapters={chapters} units={units} modules={modules} assessment={safeAssessment}
    initialPreview={query.preview === "1"}
    saveAction={savePublisherAssessmentAction.bind(null, bookId)}
    publishAction={publishPublisherAssessmentAction.bind(null, bookId)}
    addQuestionsAction={addPublisherAssessmentQuestionsAction.bind(null, bookId)}
    removeItemAction={removePublisherAssessmentItemAction.bind(null, bookId)}
    moveItemAction={movePublisherAssessmentItemAction.bind(null, bookId)}
    archiveAction={archivePublisherAssessmentAction.bind(null, bookId)}
    restoreAction={restorePublisherAssessmentAction.bind(null, bookId)}
  />;
}
