import { type ClassroomAssignmentItemType } from "@prisma/client";

import type { ContentDocument } from "@/lib/content-document";
import { isLayoutV2Document } from "@/lib/content-layout-v2";
import {
  deriveTeachingPageTitle,
  getTeachingPageSourceHash,
} from "@/lib/teaching-plan-policy";
import {
  resolveV2StudentWorkTarget,
  semanticHash,
  type StudentWorkTargetInput,
} from "@/lib/student-work-policy";

export const ASSIGNMENT_ITEM_LIMITS = {
  identifier: 128,
  items: 200,
  instructionText: 5_000,
  questionPrompt: 5_000,
  optionLabel: 250,
  options: 12,
  label: 512,
} as const;

export type AssignmentItemErrorCode =
  | "UNAUTHORIZED"
  | "ASSIGNMENT_NOT_FOUND"
  | "ITEM_NOT_FOUND"
  | "INVALID_ITEM"
  | "INVALID_TARGET"
  | "BOOK_REQUIRED"
  | "BOOK_NOT_ENTITLED"
  | "SOURCE_CHANGED"
  | "MISSING_TARGET"
  | "ITEM_HAS_RESPONSES"
  | "ASSIGNMENT_LOCKED"
  | "CONFLICT"
  | "SAVE_FAILED";

export class AssignmentItemPolicyError extends Error {
  constructor(readonly code: AssignmentItemErrorCode, message: string) {
    super(message);
  }
}

export type TeacherQuestionResponseType = "SHORT_TEXT" | "LONG_TEXT" | "MCQ" | "TRUE_FALSE";
export type TeacherQuestionOption = { id: string; label: string };
export type TeacherQuestionPayload = {
  prompt: string;
  responseType: TeacherQuestionResponseType;
  options?: TeacherQuestionOption[];
  sourceQuestionId?: string;
  sourceKind?: "BOOK" | "PUBLISHER" | "MY";
  questionType?: string;
  marks?: number;
  difficulty?: string;
  correctAnswer?: string | null;
  explanation?: string | null;
};
export type InstructionPayload = { text: string };

export type PublisherPageItemInput = {
  type: "PUBLISHER_PAGE";
  moduleId: string;
  pageId: string;
};
export type PublisherQuestionItemInput = {
  type: "PUBLISHER_QUESTION";
  moduleId: string;
  pageId?: string;
  frameId?: string;
  childFrameId?: string;
  questionId: string;
};
export type InstructionItemInput = { type: "INSTRUCTION"; payload: InstructionPayload };
export type TeacherQuestionItemInput = { type: "TEACHER_QUESTION"; sourceQuestionId?: string; payload: TeacherQuestionPayload };
export type AssignmentItemInput = PublisherPageItemInput | PublisherQuestionItemInput | InstructionItemInput | TeacherQuestionItemInput;

export type AssignmentItemTarget = {
  moduleId?: string;
  pageId?: string;
  frameId?: string;
  childFrameId?: string;
  questionId?: string;
  targetSourceHash?: string;
  targetLabelSnapshot?: string;
  payload?: InstructionPayload | TeacherQuestionPayload;
};

export type AssignmentItemState = "CURRENT" | "SOURCE_CHANGED" | "MISSING_TARGET";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, maximum: number, label: string) {
  if (typeof value !== "string") throw new AssignmentItemPolicyError("INVALID_ITEM", `Enter a valid ${label}.`);
  const text = value.replace(/\s+/gu, " ").trim();
  if (!text || text.length > maximum || /[<>]/u.test(text) || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(text)) {
    throw new AssignmentItemPolicyError("INVALID_ITEM", `Enter a valid ${label}.`);
  }
  return text;
}

export function cleanAssignmentItemIdentifier(value: unknown, label = "item") {
  if (typeof value !== "string") throw new AssignmentItemPolicyError("INVALID_ITEM", `Invalid ${label}.`);
  const id = value.trim();
  if (!id || id.length > ASSIGNMENT_ITEM_LIMITS.identifier) throw new AssignmentItemPolicyError("INVALID_ITEM", `Invalid ${label}.`);
  return id;
}

function optionalIdentifier(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") return undefined;
  return cleanAssignmentItemIdentifier(value, label);
}

function optionId(label: string, index: number) {
  return `option_${semanticHash({ label, index })}`;
}

export function normalizeInstructionPayload(value: unknown): InstructionPayload {
  if (!isRecord(value)) throw new AssignmentItemPolicyError("INVALID_ITEM", "Enter valid instruction text.");
  return { text: cleanText(value.text, ASSIGNMENT_ITEM_LIMITS.instructionText, "instruction text") };
}

export function normalizeTeacherQuestionPayload(value: unknown, previous?: unknown): TeacherQuestionPayload {
  if (!isRecord(value)) throw new AssignmentItemPolicyError("INVALID_ITEM", "Enter a valid teacher question.");
  const prompt = cleanText(value.prompt, ASSIGNMENT_ITEM_LIMITS.questionPrompt, "question prompt");
  const responseType = value.responseType;
  if (responseType !== "SHORT_TEXT" && responseType !== "LONG_TEXT" && responseType !== "MCQ" && responseType !== "TRUE_FALSE") {
    throw new AssignmentItemPolicyError("INVALID_ITEM", "Choose a supported response type.");
  }
  const sourceQuestionId = optionalIdentifier(value.sourceQuestionId, "source question");
  const sourceKind = ["BOOK", "PUBLISHER", "MY"].includes(String(value.sourceKind ?? "")) ? String(value.sourceKind) as "BOOK" | "PUBLISHER" | "MY" : undefined;
  const questionType = typeof value.questionType === "string" ? value.questionType.trim().slice(0, 64) || undefined : undefined;
  const marks = Number.isInteger(value.marks) && Number(value.marks) >= 1 && Number(value.marks) <= 100 ? Number(value.marks) : undefined;
  const difficulty = typeof value.difficulty === "string" ? value.difficulty.trim().slice(0, 32) || undefined : undefined;
  const correctAnswer = typeof value.correctAnswer === "string" ? value.correctAnswer.slice(0, 2_000) : null;
  const explanation = typeof value.explanation === "string" ? value.explanation.slice(0, 5_000) : null;
  const source = { ...(sourceQuestionId ? { sourceQuestionId } : {}), ...(sourceKind ? { sourceKind } : {}), ...(questionType ? { questionType } : {}), ...(marks ? { marks } : {}), ...(difficulty ? { difficulty } : {}), ...(correctAnswer !== null ? { correctAnswer } : {}), ...(explanation !== null ? { explanation } : {}) };
  if (responseType !== "MCQ") return { prompt, responseType, ...source };
  if (!Array.isArray(value.options) || value.options.length < 2 || value.options.length > ASSIGNMENT_ITEM_LIMITS.options) {
    throw new AssignmentItemPolicyError("INVALID_ITEM", "Provide between two and twelve options.");
  }
  const previousOptions = isRecord(previous) && Array.isArray(previous.options)
    ? previous.options.filter(isRecord).map((option) => ({ id: typeof option.id === "string" ? option.id : "", label: typeof option.label === "string" ? option.label : "" }))
    : [];
  const labels = new Set<string>();
  const preservedIds = new Set<string>();
  const options = value.options.map((raw, index) => {
    const label = cleanText(isRecord(raw) ? raw.label : raw, ASSIGNMENT_ITEM_LIMITS.optionLabel, "option label");
    if (labels.has(label)) throw new AssignmentItemPolicyError("INVALID_ITEM", "Options must be distinct.");
    labels.add(label);
    const prior = previousOptions.find((option) => option.label === label && option.id && !preservedIds.has(option.id));
    const id = prior?.id && prior.id.length <= ASSIGNMENT_ITEM_LIMITS.identifier ? prior.id : optionId(label, index);
    preservedIds.add(id);
    return { id, label };
  });
  return { prompt, responseType, options, ...source };
}

export function assignmentItemRequiresBook(type: AssignmentItemInput["type"] | ClassroomAssignmentItemType) {
  return type !== "INSTRUCTION";
}
export function parseAssignmentItemInput(value: unknown, previousPayload?: unknown): AssignmentItemInput {
  if (!isRecord(value) || typeof value.type !== "string") throw new AssignmentItemPolicyError("INVALID_ITEM", "Choose a valid assignment item type.");
  if (value.type === "PUBLISHER_PAGE") {
    return { type: value.type, moduleId: cleanAssignmentItemIdentifier(value.moduleId, "module"), pageId: cleanAssignmentItemIdentifier(value.pageId, "page") };
  }
  if (value.type === "PUBLISHER_QUESTION") {
    return {
      type: value.type,
      moduleId: cleanAssignmentItemIdentifier(value.moduleId, "module"),
      pageId: optionalIdentifier(value.pageId, "page"),
      frameId: optionalIdentifier(value.frameId, "frame"),
      childFrameId: optionalIdentifier(value.childFrameId, "child frame"),
      questionId: cleanAssignmentItemIdentifier(value.questionId, "question"),
    };
  }
  if (value.type === "INSTRUCTION") return { type: value.type, payload: normalizeInstructionPayload(value.payload) };
  if (value.type === "TEACHER_QUESTION") {
    const payload = normalizeTeacherQuestionPayload(value.payload, previousPayload);
    return { type: value.type, ...(payload.sourceQuestionId ? { sourceQuestionId: payload.sourceQuestionId } : {}), payload };
  }
  throw new AssignmentItemPolicyError("INVALID_ITEM", "Choose a valid assignment item type.");
}

function orderedPages(document: ContentDocument) {
  return (document.pageLayout?.pages ?? []).slice().sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

function boundedLabel(value: string) {
  return value.replace(/\s+/gu, " ").trim().slice(0, ASSIGNMENT_ITEM_LIMITS.label);
}

export function resolvePublisherPageItem(input: PublisherPageItemInput, document: ContentDocument): AssignmentItemTarget {
  if (!isLayoutV2Document(document) || !document.pageLayout) throw new AssignmentItemPolicyError("INVALID_TARGET", "The selected V2 page is not available.");
  const pages = orderedPages(document);
  const index = pages.findIndex((page) => page.id === input.pageId);
  const page = pages[index];
  if (!page) throw new AssignmentItemPolicyError("INVALID_TARGET", "The selected V2 page is not available.");
  const displayPageNumber = index + 1;
  return {
    moduleId: input.moduleId,
    pageId: page.id,
    targetSourceHash: getTeachingPageSourceHash(page),
    targetLabelSnapshot: boundedLabel(`Page ${displayPageNumber} — ${deriveTeachingPageTitle(page, document, displayPageNumber)}`),
  };
}

export function resolvePublisherQuestionItem(input: PublisherQuestionItemInput, document: ContentDocument, bookId: string): AssignmentItemTarget {
  try {
    const resolved = resolveV2StudentWorkTarget({
      bookId,
      moduleId: input.moduleId,
      type: "ANSWER",
      target: {
        moduleId: input.moduleId,
        ...(input.pageId ? { pageId: input.pageId } : {}),
        ...(input.frameId ? { frameId: input.frameId } : {}),
        ...(input.childFrameId ? { childFrameId: input.childFrameId } : {}),
        questionId: input.questionId,
      },
      document,
    });
    const pages = orderedPages(document);
    const pageNumber = pages.findIndex((page) => page.id === resolved.target.pageId) + 1;
    if (pageNumber <= 0) throw new AssignmentItemPolicyError("INVALID_TARGET", "The selected publisher question is not available.");
    return {
      moduleId: input.moduleId,
      pageId: resolved.target.pageId,
      frameId: resolved.target.frameId,
      childFrameId: resolved.target.childFrameId,
      questionId: resolved.target.questionId,
      targetSourceHash: resolved.targetSourceHash,
      targetLabelSnapshot: boundedLabel(`Page ${pageNumber} — Question`),
    };
  } catch (error) {
    if (error instanceof AssignmentItemPolicyError) throw error;
    throw new AssignmentItemPolicyError("INVALID_TARGET", "The selected publisher question is not available.");
  }
}

export function teacherQuestionSourceHash(payload: TeacherQuestionPayload) {
  return semanticHash({ prompt: payload.prompt, responseType: payload.responseType, options: payload.options?.map((option) => ({ id: option.id, label: option.label })) ?? [] });
}

export function buildAssignmentAwareTargetKey(input: { assignmentItemId: string; target?: StudentWorkTargetInput; teacherQuestion?: boolean }) {
  const itemId = cleanAssignmentItemIdentifier(input.assignmentItemId, "assignment item");
  if (input.teacherQuestion) return `ASSIGNMENT_ITEM:${encodeURIComponent(itemId)}:TEACHER_QUESTION`;
  const target = input.target;
  if (!target?.questionId || !target.pageId || !target.frameId) throw new AssignmentItemPolicyError("INVALID_TARGET", "The assignment question is not available.");
  return [
    "ASSIGNMENT_ITEM",
    encodeURIComponent(itemId),
    "QUESTION",
    encodeURIComponent(target.pageId),
    encodeURIComponent(target.frameId),
    encodeURIComponent(target.childFrameId ?? "root"),
    encodeURIComponent(target.questionId),
  ].join(":");
}

export function resolveStoredAssignmentItemState(input: {
  type: ClassroomAssignmentItemType;
  moduleId: string | null;
  pageId: string | null;
  frameId: string | null;
  childFrameId: string | null;
  questionId: string | null;
  targetSourceHash: string | null;
  payload: unknown;
  bookId: string | null;
  document?: ContentDocument | null;
}): AssignmentItemState {
  if (input.type === "INSTRUCTION") {
    try { normalizeInstructionPayload(input.payload); return "CURRENT"; } catch { return "MISSING_TARGET"; }
  }
  if (input.type === "TEACHER_QUESTION") {
    try { normalizeTeacherQuestionPayload(input.payload); return "CURRENT"; } catch { return "MISSING_TARGET"; }
  }
  if (!input.bookId || !input.moduleId || !input.document) return "MISSING_TARGET";
  try {
    const target = input.type === "PUBLISHER_PAGE"
      ? resolvePublisherPageItem({ type: "PUBLISHER_PAGE", moduleId: input.moduleId, pageId: input.pageId ?? "" }, input.document)
      : resolvePublisherQuestionItem({ type: "PUBLISHER_QUESTION", moduleId: input.moduleId, pageId: input.pageId ?? undefined, frameId: input.frameId ?? undefined, childFrameId: input.childFrameId ?? undefined, questionId: input.questionId ?? "" }, input.document, input.bookId);
    return target.targetSourceHash === input.targetSourceHash ? "CURRENT" : "SOURCE_CHANGED";
  } catch {
    return "MISSING_TARGET";
  }
}

export function validateAssignmentItemOrder(existingIds: string[], orderedIds: unknown) {
  if (!Array.isArray(orderedIds) || orderedIds.length !== existingIds.length) throw new AssignmentItemPolicyError("CONFLICT", "The assignment item order is stale.");
  const requested = orderedIds.map((value) => cleanAssignmentItemIdentifier(value, "assignment item"));
  const known = new Set(existingIds);
  if (new Set(requested).size !== requested.length || requested.some((id) => !known.has(id))) {
    throw new AssignmentItemPolicyError("CONFLICT", "The assignment item order is stale.");
  }
  return requested;
}
