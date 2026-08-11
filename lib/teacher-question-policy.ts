import { normalizeQuestionType, type NormalizedQuestionType } from "@/lib/normalized-question";
import { semanticHash } from "@/lib/student-work-policy";

export const TEACHER_QUESTION_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

export type TeacherQuestionStatusValue = (typeof TEACHER_QUESTION_STATUSES)[number];

export type TeacherQuestionSemanticSource = {
  sectionSubjectId?: string | null;
  bookId?: string | null;
  chapterId?: string | null;
  moduleId?: string | null;
  questionType: string;
  questionText: string;
  options?: unknown;
  correctAnswer?: string | null;
  explanation?: string | null;
  marks?: number;
  difficulty?: string | null;
  bloomLevel?: string | null;
  competency?: string | null;
  tags?: string[];
  imageResourceId?: string | null;
};

export type TeacherQuestionOwnership = {
  publisherId: string;
  schoolId: string;
  teacherId: string;
};

export type TeacherQuestionOwnershipRecord = TeacherQuestionOwnership & {
  status: TeacherQuestionStatusValue;
};

export type TeacherQuestionValidationResult =
  | { ok: true; questionType: NormalizedQuestionType }
  | { ok: false; errors: string[] };

export function teacherQuestionSourceHash(question: TeacherQuestionSemanticSource) {
  return semanticHash({
    sectionSubjectId: question.sectionSubjectId?.trim() || null,
    bookId: question.bookId?.trim() || null,
    chapterId: question.chapterId?.trim() || null,
    moduleId: question.moduleId?.trim() || null,
    questionType: question.questionType.trim().toUpperCase(),
    questionText: question.questionText.trim(),
    options: question.options ?? null,
    correctAnswer: question.correctAnswer?.trim() || null,
    explanation: question.explanation?.trim() || null,
    marks: question.marks ?? 1,
    difficulty: question.difficulty?.trim() || "MEDIUM",
    bloomLevel: question.bloomLevel?.trim() || null,
    competency: question.competency?.trim() || null,
    tags: [...new Set((question.tags ?? []).map((tag) => tag.trim()).filter(Boolean))].sort(),
    imageResourceId: question.imageResourceId?.trim() || null,
  });
}

export function validateTeacherQuestionMaster(question: TeacherQuestionSemanticSource): TeacherQuestionValidationResult {
  const errors: string[] = [];
  const questionType = normalizeQuestionType(question.questionType);
  if (questionType === "UNSUPPORTED") errors.push("Choose a supported TeacherQuestion type.");
  if (!question.questionText.trim()) errors.push("Question text is required.");
  if (!Number.isInteger(question.marks ?? 1) || (question.marks ?? 1) < 1 || (question.marks ?? 1) > 100) {
    errors.push("Marks must be a whole number between 1 and 100.");
  }
  if (question.imageResourceId !== undefined && question.imageResourceId !== null && !question.imageResourceId.trim()) {
    errors.push("Image resource identifiers must be non-empty when provided.");
  }
  return errors.length ? { ok: false, errors } : { ok: true, questionType };
}

export function isTeacherQuestionOwnedBy(question: TeacherQuestionOwnership, actor: TeacherQuestionOwnership) {
  return question.publisherId === actor.publisherId && question.schoolId === actor.schoolId && question.teacherId === actor.teacherId;
}

export function canReuseTeacherQuestion(question: Pick<TeacherQuestionOwnershipRecord, "status">, isOwner: boolean) {
  return question.status === "ACTIVE" || (question.status === "DRAFT" && isOwner);
}