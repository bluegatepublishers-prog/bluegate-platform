/**
 * Provider-neutral question contract.
 *
 * This module deliberately has no database or React dependency. It adapts the
 * current question sources without changing their storage or delivery rules.
 */

import type { TeacherQuestionPayload } from "@/lib/assignments/assignment-item-policy";
import { fillBlankAcceptedAnswers } from "@/lib/question-response-evaluator";
import { createQuestionDeliveryContext, type QuestionDeliveryAudience, type QuestionDeliveryMode } from "@/lib/question-delivery-mode";
import type { WorksheetQuestion } from "@/lib/worksheet-object";

export const NORMALIZED_QUESTION_TYPES = [
  "MCQ",
  "TRUE_FALSE",
  "FILL_BLANK",
  "MATCH",
  "MULTIPLE_SELECT",
  "ORDERING",
  "SHORT_ANSWER",
  "LONG_ANSWER",
  "PICTURE_BASED",
  "CASE_BASED",
  "COMPETENCY",
  "HOTS",
  "ASSERTION_REASON",
  "PRACTICAL",
  "PROJECT",
  "CUSTOM",
  "UNSUPPORTED",
] as const;

export type NormalizedQuestionType = (typeof NORMALIZED_QUESTION_TYPES)[number];
export type NormalizedQuestionSourceType = "PUBLISHER" | "TEACHER" | "SNAPSHOT" | "INLINE";
export type NormalizedQuestionSnapshotKind = "MASTER" | "REFERENCE" | "ISSUED_SNAPSHOT" | "INLINE";
export type QuestionGradingCapability = "AUTO" | "MANUAL" | "HYBRID";
export type QuestionRuntimeSupport = "SUPPORTED" | "NOT_IMPLEMENTED" | "SOURCE_ONLY";
export type QuestionRenderMode = QuestionDeliveryMode;
export type QuestionRenderAudience = QuestionDeliveryAudience;

export type NormalizedQuestionOption = {
  id: string;
  text: string;
};

export type NormalizedMatchPair = {
  left: string;
  right: string;
};

export type NormalizedQuestionAnswer = {
  kind: "SINGLE_OPTION" | "MULTIPLE_OPTIONS" | "BOOLEAN" | "TEXT" | "MATCH" | "ORDERING" | "MANUAL" | "UNAVAILABLE";
  correctOptionIds?: string[];
  acceptedAnswers?: string[];
  correctBoolean?: boolean;
  matches?: NormalizedMatchPair[];
  orderedOptionIds?: string[];
};

export type NormalizedQuestionGrading = {
  capability: QuestionGradingCapability;
  assessmentRuntime: QuestionRuntimeSupport;
  requiresAnswerDefinition: boolean;
};

export type NormalizedQuestion = {
  id: string;
  source: {
    type: NormalizedQuestionSourceType;
    sourceId: string;
    masterId?: string;
    attribution: {
      publisherQuestionId?: string;
      publisherId?: string;
      schoolId?: string;
      teacherId?: string;
      assessmentId?: string;
      assignmentId?: string;
      assignmentItemId?: string;
      bookId?: string;
      chapterId?: string;
      moduleId?: string;
      pageId?: string;
      frameId?: string;
      childFrameId?: string;
    };
  };
  snapshot: {
    kind: NormalizedQuestionSnapshotKind;
    immutable: boolean;
    sourceHash?: string;
    revision?: number;
    label?: string;
  };
  questionType: NormalizedQuestionType;
  originalQuestionType: string;
  content: {
    plainText: string;
    richText?: string;
  };
  resourceIds: string[];
  options: NormalizedQuestionOption[];
  answer: NormalizedQuestionAnswer;
  explanation?: string;
  marks?: number;
  difficulty?: string;
  bloomLevel?: string;
  competency?: string;
  grading: NormalizedQuestionGrading;
};

export type NormalizedQuestionRenderInput = {
  question: NormalizedQuestion;
  mode: QuestionRenderMode;
  audience: QuestionRenderAudience;
  answerVisibility: "HIDDEN" | "VISIBLE";
  response?: {
    value: unknown;
    readOnly?: boolean;
  };
};

export type BookQuestionSource = {
  id: string;
  bookId: string;
  chapterId: string;
  moduleId?: string | null;
  imageResourceId?: string | null;
  questionType: string;
  questionText: string;
  options?: unknown;
  correctAnswer?: string | null;
  explanation?: string | null;
  marks?: number;
  difficulty?: string | null;
  bloomLevel?: string | null;
  competency?: string | null;
};

export type AssessmentQuestionSource = {
  id: string;
  assessmentId: string;
  questionId: string;
  bookId: string;
  chapterId: string;
  questionType: string;
  questionText: string;
  options?: unknown;
  correctAnswer?: string | null;
  explanation?: string | null;
  marks: number;
  competency?: string | null;
  learningOutcome?: string | null;
};

export type TeacherQuestionSource = {
  id: string;
  publisherId: string;
  schoolId: string;
  teacherId: string;
  sectionSubjectId?: string | null;
  bookId?: string | null;
  chapterId?: string | null;
  moduleId?: string | null;
  imageResourceId?: string | null;
  questionType: string;
  questionText: string;
  options?: unknown;
  correctAnswer?: string | null;
  explanation?: string | null;
  marks?: number;
  difficulty?: string | null;
  bloomLevel?: string | null;
  competency?: string | null;
  sourceHash: string;
  revision: number;
};

export type AssignmentQuestionItemSource = {
  id: string;
  assignmentId?: string;
  type: "TEACHER_QUESTION" | "PUBLISHER_QUESTION";
  moduleId?: string | null;
  pageId?: string | null;
  frameId?: string | null;
  childFrameId?: string | null;
  questionId?: string | null;
  targetSourceHash?: string | null;
  targetLabelSnapshot?: string | null;
  payload?: unknown;
};

export type ResolvedPublisherQuestion = {
  id?: string;
  type?: string;
  questionType?: string;
  responseType?: string;
  prompt?: string;
  text?: string;
  label?: string;
  title?: string;
  instructions?: string;
  options?: unknown;
  assertionOptions?: unknown;
  correctAnswer?: string | null;
  explanation?: string | null;
  resourceId?: string | null;
  imageResourceId?: string | null;
  marks?: number;
  difficulty?: string | null;
  bloomLevel?: string | null;
  competency?: string | null;
};

const AUTO_GRADED_TYPES = new Set<NormalizedQuestionType>([
  "MCQ",
  "TRUE_FALSE",
  "FILL_BLANK",
  "MATCH",
  "MULTIPLE_SELECT",
]);

const MANUAL_TYPES = new Set<NormalizedQuestionType>([
  "SHORT_ANSWER",
  "LONG_ANSWER",
  "CASE_BASED",
  "COMPETENCY",
  "HOTS",
  "ASSERTION_REASON",
  "PRACTICAL",
  "PROJECT",
  "CUSTOM",
  "UNSUPPORTED",
]);

function normalizedTypeKey(value: string) {
  return value.trim().toUpperCase().replace(/[\s/-]+/gu, "_");
}

export function normalizeQuestionType(value: string | null | undefined): NormalizedQuestionType {
  const type = normalizedTypeKey(value ?? "");
  if (type === "MCQ" || type === "MULTIPLE_CHOICE") return "MCQ";
  if (type === "TRUE_FALSE" || type === "TRUEFALSE") return "TRUE_FALSE";
  if (type === "FILL_BLANK" || type === "FILL_IN_THE_BLANKS") return "FILL_BLANK";
  if (type === "MATCH" || type === "MATCH_THE_FOLLOWING") return "MATCH";
  if (type === "MULTIPLE_SELECT" || type === "MULTI_SELECT") return "MULTIPLE_SELECT";
  if (type === "ORDERING" || type === "SEQUENCE") return "ORDERING";
  if (["ONE_WORD", "VERY_SHORT", "SHORT", "SHORT_TEXT", "SHORT_ANSWER"].includes(type)) return "SHORT_ANSWER";
  if (["LONG", "LONG_TEXT", "LONG_ANSWER"].includes(type)) return "LONG_ANSWER";
  if (["PICTURE_BASED", "PICTURE", "DIAGRAM"].includes(type)) return "PICTURE_BASED";
  if (["CASE_STUDY", "CASE_BASED"].includes(type)) return "CASE_BASED";
  if (type === "COMPETENCY") return "COMPETENCY";
  if (type === "HOTS") return "HOTS";
  if (type === "ASSERTION_REASON") return "ASSERTION_REASON";
  if (type === "PRACTICAL" || type === "PRACTICAL_ACTIVITY") return "PRACTICAL";
  if (type === "PROJECT") return "PROJECT";
  if (type === "CUSTOM") return "CUSTOM";
  return "UNSUPPORTED";
}

export function gradingForQuestionType(questionType: NormalizedQuestionType): NormalizedQuestionGrading {
  if (AUTO_GRADED_TYPES.has(questionType)) {
    return { capability: "AUTO", assessmentRuntime: "SUPPORTED", requiresAnswerDefinition: true };
  }
  if (questionType === "ORDERING") {
    return { capability: "AUTO", assessmentRuntime: "NOT_IMPLEMENTED", requiresAnswerDefinition: true };
  }
  if (questionType === "PICTURE_BASED") {
    return { capability: "HYBRID", assessmentRuntime: "NOT_IMPLEMENTED", requiresAnswerDefinition: false };
  }
  if (MANUAL_TYPES.has(questionType)) {
    const assessmentRuntime: QuestionRuntimeSupport = ["SHORT_ANSWER", "LONG_ANSWER", "CASE_BASED", "COMPETENCY", "HOTS"].includes(questionType)
      ? "SUPPORTED"
      : "SOURCE_ONLY";
    return { capability: "MANUAL", assessmentRuntime, requiresAnswerDefinition: false };
  }
  return { capability: "MANUAL", assessmentRuntime: "SOURCE_ONLY", requiresAnswerDefinition: false };
}

export function createNormalizedQuestionRenderInput(input: Omit<NormalizedQuestionRenderInput, "answerVisibility">): NormalizedQuestionRenderInput {
  const context = createQuestionDeliveryContext(input);
  return {
    ...input,
    answerVisibility: context.answerVisibility,
  };
}

export function adaptBookQuestion(question: BookQuestionSource): NormalizedQuestion {
  return buildQuestion({
    id: question.id,
    source: {
      type: "PUBLISHER",
      sourceId: question.id,
      masterId: question.id,
      attribution: compact({ publisherQuestionId: question.id, bookId: question.bookId, chapterId: question.chapterId, moduleId: question.moduleId }),
    },
    snapshot: { kind: "MASTER", immutable: false },
    originalQuestionType: question.questionType,
    plainText: question.questionText,
    resourceIds: ids(question.imageResourceId),
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    marks: question.marks,
    difficulty: question.difficulty,
    bloomLevel: question.bloomLevel,
    competency: question.competency,
  });
}

export function adaptAssessmentQuestion(question: AssessmentQuestionSource): NormalizedQuestion {
  return buildQuestion({
    id: question.id,
    source: {
      type: "SNAPSHOT",
      sourceId: question.id,
      masterId: question.questionId,
      attribution: compact({ publisherQuestionId: question.questionId, assessmentId: question.assessmentId, bookId: question.bookId, chapterId: question.chapterId }),
    },
    snapshot: { kind: "ISSUED_SNAPSHOT", immutable: true },
    originalQuestionType: question.questionType,
    plainText: question.questionText,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    marks: question.marks,
    competency: question.competency,
  });
}

export function adaptTeacherQuestion(question: TeacherQuestionSource): NormalizedQuestion {
  return buildQuestion({
    id: question.id,
    source: {
      type: "TEACHER",
      sourceId: question.id,
      masterId: question.id,
      attribution: compact({
        publisherId: question.publisherId,
        schoolId: question.schoolId,
        teacherId: question.teacherId,
        sectionSubjectId: question.sectionSubjectId,
        bookId: question.bookId,
        chapterId: question.chapterId,
        moduleId: question.moduleId,
      }),
    },
    snapshot: { kind: "MASTER", immutable: false, sourceHash: question.sourceHash, revision: question.revision },
    originalQuestionType: question.questionType,
    plainText: question.questionText,
    resourceIds: ids(question.imageResourceId),
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    marks: question.marks,
    difficulty: question.difficulty,
    bloomLevel: question.bloomLevel,
    competency: question.competency,
  });
}

export function adaptTeacherAssignmentQuestion(item: AssignmentQuestionItemSource, payload: TeacherQuestionPayload): NormalizedQuestion {
  if (item.type !== "TEACHER_QUESTION") throw new Error("Teacher assignment adapter requires a TEACHER_QUESTION item.");
  return buildQuestion({
    id: item.id,
    source: {
      type: "INLINE",
      sourceId: item.id,
      attribution: compact({ assignmentId: item.assignmentId, assignmentItemId: item.id }),
    },
    snapshot: compactSnapshot({ kind: "INLINE", immutable: false, sourceHash: item.targetSourceHash ?? undefined, label: item.targetLabelSnapshot ?? undefined }),
    originalQuestionType: payload.responseType,
    plainText: payload.prompt,
    options: payload.options?.map((option) => ({ id: option.id, text: option.label })),
  });
}

export function adaptPublisherAssignmentQuestion(item: AssignmentQuestionItemSource, resolved: ResolvedPublisherQuestion): NormalizedQuestion {
  if (item.type !== "PUBLISHER_QUESTION") throw new Error("Publisher assignment adapter requires a PUBLISHER_QUESTION item.");
  const originalQuestionType = firstText(resolved.responseType, resolved.questionType, resolved.type) ?? "";
  const plainText = firstText(resolved.prompt, resolved.text, resolved.label, resolved.title) ?? "Question";
  return buildQuestion({
    id: item.id,
    source: {
      type: "PUBLISHER",
      sourceId: item.id,
      masterId: resolved.id ?? item.questionId ?? undefined,
      attribution: compact({
        assignmentId: item.assignmentId,
        assignmentItemId: item.id,
        publisherQuestionId: resolved.id ?? item.questionId,
        moduleId: item.moduleId,
        pageId: item.pageId,
        frameId: item.frameId,
        childFrameId: item.childFrameId,
      }),
    },
    snapshot: compactSnapshot({ kind: "REFERENCE", immutable: false, sourceHash: item.targetSourceHash ?? undefined, label: item.targetLabelSnapshot ?? undefined }),
    originalQuestionType,
    plainText,
    resourceIds: ids(resolved.resourceId, resolved.imageResourceId),
    options: resolved.options ?? resolved.assertionOptions,
    correctAnswer: resolved.correctAnswer,
    explanation: resolved.explanation,
    marks: resolved.marks,
    difficulty: resolved.difficulty,
    bloomLevel: resolved.bloomLevel,
    competency: resolved.competency,
  });
}

export function adaptWorksheetQuestion(question: WorksheetQuestion): NormalizedQuestion {
  const originalQuestionType = question.type;
  const worksheetOptions = question.type === "match"
    ? question.pairs?.map((pair) => ({ left: pair.left, right: pair.right }))
    : question.type === "assertionReason"
      ? question.assertionOptions
      : question.options;
  const correctAnswer = question.type === "mcq"
    ? question.correctOption ?? null
    : question.type === "trueFalse"
      ? question.trueFalseAnswer ?? null
      : question.answer ?? null;
  const normalized = buildQuestion({
    id: question.id,
    source: { type: "INLINE", sourceId: question.id, attribution: {} },
    snapshot: { kind: "INLINE", immutable: false },
    originalQuestionType,
    plainText: question.prompt,
    resourceIds: ids(question.resourceId),
    options: worksheetOptions,
    correctAnswer,
    explanation: question.explanation,
    marks: question.marks,
  });
  if (question.type === "match" && question.pairs?.length) {
    return { ...normalized, answer: { kind: "MATCH", matches: question.pairs.map((pair) => ({ left: pair.left, right: pair.right })) } };
  }
  return normalized;
}

type BuildQuestionInput = {
  id: string;
  source: NormalizedQuestion["source"];
  snapshot: NormalizedQuestion["snapshot"];
  originalQuestionType: string;
  plainText: string;
  resourceIds?: string[];
  options?: unknown;
  correctAnswer?: string | null;
  explanation?: string | null;
  marks?: number;
  difficulty?: string | null;
  bloomLevel?: string | null;
  competency?: string | null;
};

function buildQuestion(input: BuildQuestionInput): NormalizedQuestion {
  const questionType = normalizeQuestionType(input.originalQuestionType);
  const options = normalizeOptions(input.options);
  return {
    id: input.id,
    source: input.source,
    snapshot: input.snapshot,
    questionType,
    originalQuestionType: input.originalQuestionType,
    content: { plainText: input.plainText },
    resourceIds: [...(input.resourceIds ?? [])],
    options,
    answer: normalizeAnswer(questionType, input.correctAnswer, options, input.options),
    ...(input.explanation?.trim() ? { explanation: input.explanation.trim() } : {}),
    ...(typeof input.marks === "number" ? { marks: input.marks } : {}),
    ...(input.difficulty?.trim() ? { difficulty: input.difficulty.trim() } : {}),
    ...(input.bloomLevel?.trim() ? { bloomLevel: input.bloomLevel.trim() } : {}),
    ...(input.competency?.trim() ? { competency: input.competency.trim() } : {}),
    grading: gradingForQuestionType(questionType),
  };
}

function normalizeOptions(value: unknown): NormalizedQuestionOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (typeof entry === "string" && entry.trim()) return [{ id: `option-${index + 1}`, text: entry.trim() }];
    if (!isRecord(entry)) return [];
    const text = firstText(asText(entry.text), asText(entry.label), asText(entry.value));
    if (!text) return [];
    return [{ id: firstText(asText(entry.id), `option-${index + 1}`)!, text }];
  });
}

function normalizeAnswer(questionType: NormalizedQuestionType, correctAnswer: string | null | undefined, options: NormalizedQuestionOption[], rawOptions: unknown): NormalizedQuestionAnswer {
  if (questionType === "MCQ") return { kind: "SINGLE_OPTION", correctOptionIds: matchingOptionIds(options, correctAnswer), acceptedAnswers: texts(correctAnswer) };
  if (questionType === "MULTIPLE_SELECT") {
    const answers = jsonStringArray(correctAnswer);
    return { kind: "MULTIPLE_OPTIONS", correctOptionIds: answers.flatMap((answer) => matchingOptionIds(options, answer)), acceptedAnswers: answers };
  }
  if (questionType === "TRUE_FALSE") {
    const value = correctAnswer?.trim().toLowerCase();
    return { kind: "BOOLEAN", ...(value === "true" || value === "false" ? { correctBoolean: value === "true" } : {}) };
  }
  if (questionType === "FILL_BLANK") {
    return { kind: "TEXT", acceptedAnswers: fillBlankAcceptedAnswers(correctAnswer, rawOptions) };
  }
  if (questionType === "MATCH") return { kind: "MATCH", matches: matchPairs(rawOptions, correctAnswer) };
  if (questionType === "ORDERING") return { kind: "ORDERING", orderedOptionIds: jsonStringArray(correctAnswer) };
  if (["SHORT_ANSWER", "LONG_ANSWER", "CASE_BASED", "COMPETENCY", "HOTS", "PICTURE_BASED", "ASSERTION_REASON", "PRACTICAL", "PROJECT", "CUSTOM"].includes(questionType)) {
    return { kind: "MANUAL", acceptedAnswers: texts(correctAnswer) };
  }
  return { kind: "UNAVAILABLE" };
}

function matchPairs(rawOptions: unknown, correctAnswer: string | null | undefined): NormalizedMatchPair[] {
  if (Array.isArray(rawOptions)) {
    const pairs = rawOptions.flatMap((entry) => isRecord(entry) && typeof entry.left === "string" && typeof entry.right === "string"
      ? [{ left: entry.left, right: entry.right }]
      : []);
    if (pairs.length) return pairs;
  }
  const parsed = parseJsonRecord(correctAnswer);
  return parsed ? Object.entries(parsed).flatMap(([left, right]) => typeof right === "string" ? [{ left, right }] : []) : [];
}

function matchingOptionIds(options: NormalizedQuestionOption[], answer: string | null | undefined) {
  const expected = answer?.trim().toLocaleLowerCase("en") ?? "";
  if (!expected) return [];
  return options.filter((option) => option.id.toLocaleLowerCase("en") === expected || option.text.toLocaleLowerCase("en") === expected).map((option) => option.id);
}

function jsonStringArray(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean) : texts(value);
  } catch {
    return texts(value);
  }
}

function parseJsonRecord(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function compact<T extends Record<string, string | null | undefined>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => typeof entry === "string" && Boolean(entry))) as { [K in keyof T as T[K] extends string ? K : never]?: string };
}

function compactSnapshot(value: NormalizedQuestion["snapshot"]) {
  return {
    ...value,
    ...(value.sourceHash ? { sourceHash: value.sourceHash } : {}),
    ...(value.label ? { label: value.label } : {}),
  };
}

function ids(...values: Array<string | null | undefined>) {
  return values.filter((value): value is string => typeof value === "string" && Boolean(value));
}

function texts(value: string | null | undefined) {
  return value?.trim() ? [value.trim()] : [];
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function firstText(...values: Array<string | undefined>) {
  return values.find((value): value is string => typeof value === "string" && Boolean(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
