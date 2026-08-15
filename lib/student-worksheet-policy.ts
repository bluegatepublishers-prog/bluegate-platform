import {
  adaptBookQuestion,
  getBookQuestionPracticeMode,
  toSafeInteractiveQuestion,
} from "@/lib/normalized-question";
import { evaluateObjectiveQuestionResponse } from "@/lib/question-response-evaluator";
import {
  calculatePracticeResult,
  getPracticeFeedbackAnswer,
  gradePracticeAnswer,
  isSupportedPracticeQuestion,
  type PracticeGrade,
  type PracticeQuestionCandidate,
} from "@/lib/student-practice-policy";

export type StudentWorksheetQuestionCandidate = PracticeQuestionCandidate & {
  archived: boolean;
};

export type StudentWorksheetResponseValue = {
  questionId: string;
  response: unknown;
  correct: boolean | null;
  marksAwarded: number | null;
};

export function isStudentWorksheetAudience(audience: string) {
  return audience === "STUDENT" || audience === "BOTH";
}

export function isAvailableStudentWorksheetQuestion(
  question: StudentWorksheetQuestionCandidate,
) {
  return !question.archived && isSupportedPracticeQuestion(question);
}

export function toSafeStudentWorksheetQuestion(
  question: StudentWorksheetQuestionCandidate,
  position: number,
  questionNumber: number,
) {
  return {
    questionId: question.id,
    position,
    questionNumber,
    marks: question.marks,
    interactiveQuestion: toSafeInteractiveQuestion(adaptBookQuestion(question)),
  };
}

export function gradeStudentWorksheetResponse(
  question: StudentWorksheetQuestionCandidate,
  response: unknown,
): PracticeGrade {
  const graded = gradePracticeAnswer(question, response);
  if (!graded.ok || graded.mode === "MANUAL_RESPONSE") return graded;

  const evaluated = evaluateObjectiveQuestionResponse(
    adaptBookQuestion(question),
    graded.answer,
  );
  if (evaluated.correct === null) return graded;

  return {
    ...graded,
    correct: evaluated.correct,
    marksAwarded: evaluated.correct ? question.marks : 0,
  };
}

export function calculateStudentWorksheetAttempt(
  questions: readonly StudentWorksheetQuestionCandidate[],
  responses: readonly StudentWorksheetResponseValue[],
) {
  const responseByQuestionId = new Map(
    responses.map((response) => [response.questionId, response]),
  );
  const summary = calculatePracticeResult(
    questions.map((question) => {
      const response = responseByQuestionId.get(question.id);
      return {
        question: { marks: question.marks },
        answer: response?.response,
        correct: response?.correct ?? null,
        marksAwarded: response?.marksAwarded ?? null,
      };
    }),
  );
  const hasManualResponse = questions.some(
    (question) => getBookQuestionPracticeMode(question.questionType) === "MANUAL_RESPONSE",
  );

  return {
    questionCount: questions.length,
    totalMarks: summary.totalMarks,
    marksAwarded: summary.marksAwarded,
    percentage: hasManualResponse ? null : summary.scorePercent,
  };
}

export function getStudentWorksheetFeedback(
  question: StudentWorksheetQuestionCandidate,
  response: Pick<StudentWorksheetResponseValue, "response" | "correct" | "marksAwarded"> | undefined,
  allowed: boolean,
) {
  if (!allowed || response?.response === null || response?.response === undefined) {
    return null;
  }

  return {
    correct: response.correct,
    marksAwarded: response.marksAwarded,
    correctAnswer:
      getBookQuestionPracticeMode(question.questionType) === "AUTO_GRADED"
        ? getPracticeFeedbackAnswer(question)
        : null,
    explanation: question.explanation,
  };
}