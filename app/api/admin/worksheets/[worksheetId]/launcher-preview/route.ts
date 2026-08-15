import { NextResponse } from "next/server";

import { adaptBookQuestion, toSafeInteractiveQuestion } from "@/lib/normalized-question";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { prisma } from "@/lib/prisma";
import { isAvailableStudentWorksheetQuestion } from "@/lib/student-worksheet-policy";

const questionSelect = {
  id: true,
  bookId: true,
  chapterId: true,
  moduleId: true,
  imageResourceId: true,
  questionType: true,
  questionText: true,
  options: true,
  correctAnswer: true,
  explanation: true,
  marks: true,
  difficulty: true,
  approved: true,
  archived: true,
  createdAt: true,
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ worksheetId: string }> },
) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;

  const { worksheetId } = await params;
  const worksheet = await prisma.publisherWorksheet.findFirst({
    where: {
      id: worksheetId,
      publisherId: access.actor.publisherId,
      active: true,
      published: true,
      archivedAt: null,
      allowOnlineAttempt: true,
      audience: { in: ["STUDENT", "BOTH"] },
    },
    select: {
      id: true,
      title: true,
      instructions: true,
      showAnswersAfterSubmit: true,
      items: {
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: {
          position: true,
          question: { select: questionSelect },
        },
      },
    },
  });

  if (!worksheet) {
    return NextResponse.json(
      { ok: false, message: "This worksheet is unavailable." },
      { status: 404 },
    );
  }

  const questions = worksheet.items.flatMap((item, index) =>
    isAvailableStudentWorksheetQuestion(item.question)
      ? [{
          questionId: item.question.id,
          position: item.position,
          questionNumber: index + 1,
          marks: item.question.marks,
          previewQuestion: adaptBookQuestion(item.question),
          interactiveQuestion: toSafeInteractiveQuestion(adaptBookQuestion(item.question)),
        }]
      : [],
  );

  return NextResponse.json({
    ok: true,
    worksheet: {
      id: worksheet.id,
      title: worksheet.title,
      instructions: worksheet.instructions,
      showAnswersAfterSubmit: worksheet.showAnswersAfterSubmit,
    },
    questions,
  });
}
