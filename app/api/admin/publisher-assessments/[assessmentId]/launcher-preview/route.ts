import { NextResponse } from "next/server";

import { adaptBookQuestion, toSafeInteractiveQuestion } from "@/lib/normalized-question";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import {
  getPublisherAssessmentLauncherLabel,
  getPublisherAssessmentQuestionTypeLabel,
  getPublisherAssessmentScopeSummary,
  groupPublisherAssessmentItemsByType,
} from "@/lib/publisher-assessment-presentation";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;

  const { assessmentId } = await params;
  const assessment = await prisma.publisherAssessment.findFirst({
    where: {
      id: assessmentId,
      publisherId: access.actor.publisherId,
      archivedAt: null,
    },
    select: {
      id: true,
      kind: true,
      deliveryMode: true,
      instructions: true,
      durationMinutes: true,
      totalMarks: true,
      chapter: { select: { title: true, chapterNumber: true } },
      unit: { select: { title: true } },
      chapterScopes: {
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { chapter: { select: { title: true, chapterNumber: true } } },
      },
      sectionInstructions: { select: { questionType: true, instruction: true } },
      items: {
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: {
          question: {
            select: {
              id: true, bookId: true, chapterId: true, moduleId: true, imageResourceId: true,
              questionType: true, questionText: true, options: true, correctAnswer: true,
              explanation: true, marks: true, difficulty: true, approved: true, archived: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });
  if (!assessment) {
    return NextResponse.json({ ok: false, message: "Assessment is unavailable." }, { status: 404 });
  }

  const instructions = new Map(assessment.sectionInstructions.map((entry) => [entry.questionType, entry.instruction]));
  let questionNumber = 0;
  const sections = groupPublisherAssessmentItemsByType(
    assessment.items.map((item) => item.question),
  ).map((group) => ({
    questionType: group.questionType,
    label: getPublisherAssessmentQuestionTypeLabel(group.questionType),
    instruction: instructions.get(group.questionType) ?? null,
    questions: group.items.map((question) => ({
      questionNumber: ++questionNumber,
      marks: question.marks,
      interactiveQuestion: toSafeInteractiveQuestion(adaptBookQuestion(question)),
    })),
  }));

  return NextResponse.json({
    ok: true,
    assessment: {
      id: assessment.id,
      heading: getPublisherAssessmentLauncherLabel(assessment.kind),
      scope: getPublisherAssessmentScopeSummary({
        chapter: assessment.chapter,
        unit: assessment.unit,
        chapters: assessment.chapterScopes.map((scope) => scope.chapter),
      }),
      deliveryMode: assessment.deliveryMode,
      durationMinutes: assessment.durationMinutes,
      totalMarks: assessment.totalMarks ?? sections.flatMap((section) => section.questions).reduce((total, question) => total + question.marks, 0),
      instructions: assessment.instructions,
      sections,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
