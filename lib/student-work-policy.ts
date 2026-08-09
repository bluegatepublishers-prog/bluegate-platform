import { buildV2NarrationManifest, hashText } from "@/lib/content-narration";
import {
  isActivityBlock,
  isExerciseBlock,
  isWorksheetBlock,
  type ContentBlock,
  type ContentDocument,
} from "@/lib/content-document";
import {
  isLayoutV2Document,
  type LayoutV2Frame,
  type LayoutV2Page,
} from "@/lib/content-layout-v2";

export const STUDENT_WORK_TARGET_KEY_MAX_LENGTH = 512;

export function assertStudentWorkTargetKeyLength(targetKey: string) {
  if (targetKey.length > STUDENT_WORK_TARGET_KEY_MAX_LENGTH) {
    throw new StudentWorkPolicyError("The Student Work target is too long.", "INVALID_TARGET");
  }
  return targetKey;
}

export const STUDENT_WORK_TYPES = [
  "ANSWER",
  "NOTE",
  "HIGHLIGHT",
  "BOOKMARK",
  "COMPLETION",
  "READING_POSITION",
] as const;

export type StudentWorkTypeName = (typeof STUDENT_WORK_TYPES)[number];

export type StudentWorkTargetInput = {
  chapterId?: string;
  moduleId?: string;
  pageId?: string;
  frameId?: string;
  childFrameId?: string;
  questionId?: string;
  segmentId?: string;
};

export type HighlightAnchor = {
  start: number;
  end: number;
  text: string;
  prefix?: string;
  suffix?: string;
};

export const STUDENT_WORK_LIMITS = {
  identifier: 128,
  targetKey: 512,
  shortText: 160,
  answerText: 20000,
  noteText: 5000,
  selectedText: 2000,
  contextText: 2000,
  payloadBytes: 24000,
  answerArrayItems: 64,
  answerObjectKeys: 32,
} as const;

export type StudentWorkPolicyCode =
  | "INVALID_TARGET"
  | "INVALID_PAYLOAD"
  | "CONTENT_UNAVAILABLE"
  | "CONFLICT"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "SAVE_FAILED";

export class StudentWorkPolicyError extends Error {
  constructor(
    message: string,
    public readonly code: StudentWorkPolicyCode = "INVALID_TARGET",
  ) {
    super(message);
    this.name = "StudentWorkPolicyError";
  }
}

export type StudentWorkTargetStatus = "CURRENT" | "STALE" | "MISSING_TARGET";

export type ResolvedStudentWorkTarget = {
  type: StudentWorkTypeName;
  target: StudentWorkTargetInput;
  targetKey: string;
  masterSourceHash: string;
  targetSourceHash: string;
  semanticText?: string;
  question?: Record<string, unknown>;
};

type FrameRecord = {
  page: LayoutV2Page;
  frame: LayoutV2Frame;
  childFrame?: LayoutV2Frame;
};

type QuestionCandidate = FrameRecord & {
  question: Record<string, unknown>;
  questionKind: "WORKSHEET" | "EXERCISE" | "ACTIVITY";
};

const PRESENTATION_KEYS = new Set([
  "x",
  "y",
  "width",
  "height",
  "zIndex",
  "layer",
  "layoutMode",
  "wrapMode",
  "rotation",
  "locked",
  "renderMode",
  "visualMode",
  "replica",
  "layout",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanIdentifier(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new StudentWorkPolicyError("The target is invalid.", "INVALID_TARGET");
  }
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > STUDENT_WORK_LIMITS.identifier) {
    throw new StudentWorkPolicyError("The target is invalid.", "INVALID_TARGET");
  }
  return cleaned;
}

export function normalizeStudentWorkTarget(value: unknown): StudentWorkTargetInput {
  if (!isRecord(value)) {
    throw new StudentWorkPolicyError("The target is invalid.", "INVALID_TARGET");
  }
  const target: StudentWorkTargetInput = {};
  for (const key of ["chapterId", "moduleId", "pageId", "frameId", "childFrameId", "questionId", "segmentId"] as const) {
    const cleaned = cleanIdentifier(value[key]);
    if (cleaned) target[key] = cleaned;
  }
  return target;
}

function encodeTargetPart(value: string) {
  return encodeURIComponent(value.trim());
}

function baseTargetKey(bookId: string, target: StudentWorkTargetInput) {
  if (target.questionId) {
    if (!target.pageId || !target.frameId) throw new StudentWorkPolicyError("The target is invalid.", "INVALID_TARGET");
    return [
      "QUESTION",
      encodeTargetPart(target.pageId),
      encodeTargetPart(target.frameId),
      encodeTargetPart(target.childFrameId ?? "root"),
      encodeTargetPart(target.questionId),
    ].join(":");
  }
  if (target.segmentId) {
    if (!target.pageId || !target.frameId) throw new StudentWorkPolicyError("The target is invalid.", "INVALID_TARGET");
    return [
      "SEGMENT",
      encodeTargetPart(target.pageId),
      encodeTargetPart(target.frameId),
      encodeTargetPart(target.childFrameId ?? "root"),
      encodeTargetPart(target.segmentId),
    ].join(":");
  }
  if (target.childFrameId) {
    if (!target.pageId || !target.frameId) throw new StudentWorkPolicyError("The target is invalid.", "INVALID_TARGET");
    return ["CHILD", encodeTargetPart(target.pageId), encodeTargetPart(target.frameId), encodeTargetPart(target.childFrameId)].join(":");
  }
  if (target.frameId) {
    if (!target.pageId) throw new StudentWorkPolicyError("The target is invalid.", "INVALID_TARGET");
    return ["FRAME", encodeTargetPart(target.pageId), encodeTargetPart(target.frameId)].join(":");
  }
  if (target.pageId) return ["PAGE", encodeTargetPart(target.pageId)].join(":");
  return ["BOOK", encodeTargetPart(bookId)].join(":");
}

export function buildStudentWorkTargetKey(input: {
  bookId: string;
  type: StudentWorkTypeName;
  target: StudentWorkTargetInput;
  anchor?: HighlightAnchor;
}) {
  const base = baseTargetKey(input.bookId, input.target);
  if (input.type === "READING_POSITION") {
    return ["BOOK", encodeTargetPart(input.bookId), "READING_POSITION"].join(":");
  }
  if (input.type === "HIGHLIGHT") {
    if (!input.anchor) throw new StudentWorkPolicyError("A highlight anchor is required.", "INVALID_PAYLOAD");
    return ["HIGHLIGHT", base, semanticHash(input.anchor)].join(":");
  }
  if (input.type === "NOTE") return ["NOTE", base].join(":");
  if (input.type === "BOOKMARK") return ["BOOKMARK", base].join(":");
  if (input.type === "COMPLETION") return ["COMPLETION", base].join(":");
  return base;
}

export function validateWorkTargetPolicy(type: StudentWorkTypeName, target: StudentWorkTargetInput) {
  const hasPage = Boolean(target.pageId);
  const hasFrame = Boolean(target.frameId);
  const hasChild = Boolean(target.childFrameId);
  const hasQuestion = Boolean(target.questionId);
  const hasSegment = Boolean(target.segmentId);

  if (hasChild && !hasFrame) throw new StudentWorkPolicyError("The target is invalid.", "INVALID_TARGET");

  switch (type) {
    case "ANSWER":
      if (!hasQuestion) throw new StudentWorkPolicyError("An answer must target a question.", "INVALID_TARGET");
      break;
    case "NOTE":
      if (!hasPage && !hasFrame) throw new StudentWorkPolicyError("A note must target a page or frame.", "INVALID_TARGET");
      if (hasQuestion || hasSegment || hasChild && !hasFrame) throw new StudentWorkPolicyError("The target is invalid.", "INVALID_TARGET");
      break;
    case "HIGHLIGHT":
      if ((!hasPage && !hasSegment) || (!hasFrame && !hasSegment)) throw new StudentWorkPolicyError("A highlight must target semantic page content.", "INVALID_TARGET");
      if (hasQuestion) throw new StudentWorkPolicyError("The target is invalid.", "INVALID_TARGET");
      break;
    case "BOOKMARK":
      if (!hasPage || hasFrame || hasChild || hasQuestion || hasSegment) throw new StudentWorkPolicyError("A bookmark must target a page.", "INVALID_TARGET");
      break;
    case "COMPLETION":
      if (!hasPage && !hasFrame && !hasQuestion) throw new StudentWorkPolicyError("Completion requires an interactable target.", "INVALID_TARGET");
      if (hasSegment || hasChild && !hasFrame) throw new StudentWorkPolicyError("The target is invalid.", "INVALID_TARGET");
      break;
    case "READING_POSITION":
      if (hasPage || hasFrame || hasChild || hasQuestion || hasSegment) throw new StudentWorkPolicyError("Reading position is book-scoped.", "INVALID_TARGET");
      break;
  }
}

function rejectUnknownKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const allowedSet = new Set(allowed);
  if (Object.keys(value).some((key) => !allowedSet.has(key))) {
    throw new StudentWorkPolicyError("The work payload is invalid.", "INVALID_PAYLOAD");
  }
}

function assertSafeText(value: unknown, max: number, field: string): string {
  if (typeof value !== "string") {
    throw new StudentWorkPolicyError("The " + field + " is invalid.", "INVALID_PAYLOAD");
  }
  const text = value.trim();
  if (!text || text.length > max || /<\s*\/?\s*[a-z][^>]*>|javascript\s*:/iu.test(text)) {
    throw new StudentWorkPolicyError("The " + field + " is invalid.", "INVALID_PAYLOAD");
  }
  return text;
}

function validateJsonValue(value: unknown, depth = 0): unknown {
  if (depth > 4) throw new StudentWorkPolicyError("The answer is too deeply nested.", "INVALID_PAYLOAD");
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return assertSafeText(value, STUDENT_WORK_LIMITS.answerText, "answer");
  if (Array.isArray(value)) {
    if (value.length > STUDENT_WORK_LIMITS.answerArrayItems) throw new StudentWorkPolicyError("The answer is too large.", "INVALID_PAYLOAD");
    return value.map((entry) => validateJsonValue(entry, depth + 1));
  }
  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length > STUDENT_WORK_LIMITS.answerObjectKeys) throw new StudentWorkPolicyError("The answer is too large.", "INVALID_PAYLOAD");
    return Object.fromEntries(keys.map((key) => [key, validateJsonValue(value[key], depth + 1)]));
  }
  throw new StudentWorkPolicyError("The answer is invalid.", "INVALID_PAYLOAD");
}

function validateHighlightAnchor(value: unknown): HighlightAnchor {
  if (!isRecord(value)) throw new StudentWorkPolicyError("The highlight anchor is invalid.", "INVALID_PAYLOAD");
  rejectUnknownKeys(value, ["start", "end", "text", "prefix", "suffix"]);
  const start = value.start;
  const end = value.end;
  if (!Number.isInteger(start) || !Number.isInteger(end) || (start as number) < 0 || (end as number) <= (start as number) || (end as number) - (start as number) > STUDENT_WORK_LIMITS.selectedText) {
    throw new StudentWorkPolicyError("The highlight anchor is invalid.", "INVALID_PAYLOAD");
  }
  return {
    start: start as number,
    end: end as number,
    text: assertSafeText(value.text, STUDENT_WORK_LIMITS.selectedText, "highlight text"),
    ...(value.prefix !== undefined ? { prefix: assertSafeText(value.prefix, STUDENT_WORK_LIMITS.contextText, "highlight prefix") } : {}),
    ...(value.suffix !== undefined ? { suffix: assertSafeText(value.suffix, STUDENT_WORK_LIMITS.contextText, "highlight suffix") } : {}),
  };
}

export type ValidatedStudentWorkPayload =
  | { type: "ANSWER"; value: Record<string, unknown> }
  | { type: "NOTE"; value: { text: string } }
  | { type: "HIGHLIGHT"; value: { anchor: HighlightAnchor; selectedText?: string; style?: "YELLOW" | "GREEN" | "BLUE" | "PINK" } }
  | { type: "BOOKMARK"; value: { label?: string } }
  | { type: "COMPLETION"; value: { state: "IN_PROGRESS" | "COMPLETED" } }
  | { type: "READING_POSITION"; value: { pageId: string; segmentId?: string } };

export function validateStudentWorkPayload(type: StudentWorkTypeName, payload: unknown): ValidatedStudentWorkPayload {
  if (!isRecord(payload)) throw new StudentWorkPolicyError("The work payload is invalid.", "INVALID_PAYLOAD");
  let validated: ValidatedStudentWorkPayload;
  switch (type) {
    case "ANSWER": {
      rejectUnknownKeys(payload, ["value", "optionIds", "status"]);
      if (!Object.prototype.hasOwnProperty.call(payload, "value") && !Object.prototype.hasOwnProperty.call(payload, "optionIds")) {
        throw new StudentWorkPolicyError("An answer is required.", "INVALID_PAYLOAD");
      }
      const optionIds = payload.optionIds === undefined
        ? undefined
        : Array.isArray(payload.optionIds) && payload.optionIds.length <= STUDENT_WORK_LIMITS.answerArrayItems && payload.optionIds.every((entry) => typeof entry === "string" && Boolean(entry.trim()))
          ? payload.optionIds.map((entry) => assertSafeText(entry, STUDENT_WORK_LIMITS.identifier, "option"))
          : (() => { throw new StudentWorkPolicyError("The answer options are invalid.", "INVALID_PAYLOAD"); })();
      const status = payload.status === undefined ? "DRAFT" : payload.status === "DRAFT" || payload.status === "SUBMITTED" ? payload.status : null;
      if (!status) throw new StudentWorkPolicyError("The answer status is invalid.", "INVALID_PAYLOAD");
      validated = {
        type,
        value: {
          ...(Object.prototype.hasOwnProperty.call(payload, "value") ? { value: validateJsonValue(payload.value) } : {}),
          ...(optionIds ? { optionIds } : {}),
          status,
        },
      };
      break;
    }
    case "NOTE":
      rejectUnknownKeys(payload, ["text"]);
      validated = { type, value: { text: assertSafeText(payload.text, STUDENT_WORK_LIMITS.noteText, "note") } };
      break;
    case "HIGHLIGHT": {
      rejectUnknownKeys(payload, ["anchor", "selectedText", "style"]);
      const anchor = validateHighlightAnchor(payload.anchor);
      const selectedText = payload.selectedText === undefined ? undefined : assertSafeText(payload.selectedText, STUDENT_WORK_LIMITS.selectedText, "selected text");
      const style = payload.style === undefined ? undefined : ["YELLOW", "GREEN", "BLUE", "PINK"].includes(payload.style as string) ? payload.style as "YELLOW" | "GREEN" | "BLUE" | "PINK" : null;
      if (payload.style !== undefined && !style) throw new StudentWorkPolicyError("The highlight style is invalid.", "INVALID_PAYLOAD");
      validated = { type, value: { anchor, ...(selectedText ? { selectedText } : {}), ...(style ? { style } : {}) } };
      break;
    }
    case "BOOKMARK":
      rejectUnknownKeys(payload, ["label"]);
      validated = { type, value: { ...(payload.label === undefined ? {} : { label: assertSafeText(payload.label, STUDENT_WORK_LIMITS.shortText, "bookmark label") }) } };
      break;
    case "COMPLETION":
      rejectUnknownKeys(payload, ["state"]);
      if (payload.state !== "IN_PROGRESS" && payload.state !== "COMPLETED") throw new StudentWorkPolicyError("The completion state is invalid.", "INVALID_PAYLOAD");
      validated = { type, value: { state: payload.state } };
      break;
    case "READING_POSITION":
      rejectUnknownKeys(payload, ["pageId", "segmentId"]);
      validated = {
        type,
        value: {
          pageId: assertSafeText(payload.pageId, STUDENT_WORK_LIMITS.identifier, "reading page"),
          ...(payload.segmentId === undefined ? {} : { segmentId: assertSafeText(payload.segmentId, STUDENT_WORK_LIMITS.identifier, "reading segment") }),
        },
      };
      break;
  }
  const bytes = new TextEncoder().encode(JSON.stringify(validated.value)).byteLength;
  if (bytes > STUDENT_WORK_LIMITS.payloadBytes) throw new StudentWorkPolicyError("The work payload is too large.", "INVALID_PAYLOAD");
  return validated;
}

function semanticize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(semanticize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => !PRESENTATION_KEYS.has(key))
      .sort()
      .map((key) => [key, semanticize(value[key])]),
  );
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(semanticize(value));
}

export function semanticHash(value: unknown) {
  return hashText(stableSerialize(value));
}

function frameSemanticValue(frame: LayoutV2Frame): unknown {
  return semanticize({
    id: frame.id,
    type: frame.type,
    contentRef: frame.contentRef,
    payload: frame.payload,
    readable: frame.readable,
    audioAllowed: frame.audioAllowed,
    readingOrder: frame.readingOrder,
    language: frame.language,
    narrationLabel: frame.narrationLabel,
    altText: frame.altText,
    direction: frame.direction,
    alignment: frame.alignment,
    heightMode: frame.heightMode,
    overflow: frame.overflow,
    textSpans: frame.textSpans,
    fontFamily: frame.fontFamily,
    fontSize: frame.fontSize,
    fontWeight: frame.fontWeight,
    fontStyle: frame.fontStyle,
    lineHeight: frame.lineHeight,
    letterSpacing: frame.letterSpacing,
    textColor: frame.textColor,
    resourceId: frame.resourceId,
    fitMode: frame.fitMode,
    crop: frame.crop,
    zoom: frame.zoom,
    offsetX: frame.offsetX,
    offsetY: frame.children?.map(frameSemanticValue),
  });
}

function pageSemanticValue(page: LayoutV2Page): unknown {
  return semanticize({
    id: page.id,
    background: page.background,
    frames: page.frames.map(frameSemanticValue),
  });
}

function documentSemanticValue(document: ContentDocument): unknown {
  return semanticize({
    layoutVersion: document.layoutVersion,
    blocks: document.blocks,
    pages: document.pageLayout?.pages.map(pageSemanticValue) ?? [],
  });
}

function frameMatches(record: FrameRecord, target: StudentWorkTargetInput) {
  return (!target.pageId || record.page.id === target.pageId) &&
    (!target.frameId || record.frame.id === target.frameId) &&
    (!target.childFrameId || record.childFrame?.id === target.childFrameId);
}

function collectFrameRecords(document: ContentDocument): FrameRecord[] {
  const records: FrameRecord[] = [];
  for (const page of document.pageLayout?.pages ?? []) {
    for (const frame of page.frames) {
      records.push({ page, frame });
      for (const child of frame.children ?? []) records.push({ page, frame, childFrame: child });
    }
  }
  return records;
}

function questionCandidatesForBlock(record: FrameRecord, block: ContentBlock): QuestionCandidate[] {
  if (record.childFrame && record.frame.type !== "EDUCATIONAL") return [];
  if (record.frame.type === "WORKSHEET" && isWorksheetBlock(block)) {
    return block.questions.filter((question) => question.visibility?.student !== false).map((question) => ({ ...record, question: question as unknown as Record<string, unknown>, questionKind: "WORKSHEET" }));
  }
  if (record.frame.type === "EXERCISE" && isExerciseBlock(block)) {
    return [...block.questions, ...block.groups.flatMap((group) => group.questions)]
      .filter((question) => question.visibility?.student !== false)
      .map((question) => ({ ...record, question: question as unknown as Record<string, unknown>, questionKind: "EXERCISE" }));
  }
  if (record.frame.type === "ACTIVITY" && isActivityBlock(block)) {
    return block.fields
      .filter((field) => field.visibility?.student !== false && field.type !== "teacherNote")
      .map((field) => ({ ...record, question: field as unknown as Record<string, unknown>, questionKind: "ACTIVITY" }));
  }
  return [];
}

function collectQuestionCandidates(document: ContentDocument): QuestionCandidate[] {
  const blocks = new Map(document.blocks.map((block) => [block.id, block]));
  return collectFrameRecords(document).flatMap((record) => {
    const blockId = record.frame.type === "EDUCATIONAL" && record.childFrame
      ? record.childFrame.contentRef?.blockId
      : record.frame.contentRef?.blockId;
    const block = blockId ? blocks.get(blockId) : undefined;
    return block ? questionCandidatesForBlock(record, block) : [];
  });
}

export type StudentVisibleV2Question = {
  pageId: string;
  frameId: string;
  childFrameId?: string;
  questionId: string;
  responseType: string | null;
  prompt: string;
};

export function listStudentVisibleV2Questions(document: ContentDocument): StudentVisibleV2Question[] {
  if (!isLayoutV2Document(document) || !document.pageLayout) return [];
  return collectQuestionCandidates(document)
    .map((candidate) => {
      const questionId = typeof candidate.question.id === "string" ? candidate.question.id : "";
      const prompt = ["prompt", "text", "label", "title"]
        .map((key) => candidate.question[key])
        .find((value): value is string => typeof value === "string" && Boolean(value.trim()))?.replace(/s+/gu, " ").trim().slice(0, 240) ?? "Question";
      const responseType = ["responseType", "questionType", "type"]
        .map((key) => candidate.question[key])
        .find((value): value is string => Boolean(value)) ?? null;
      return {
        pageId: candidate.page.id,
        frameId: candidate.frame.id,
        ...(candidate.childFrame ? { childFrameId: candidate.childFrame.id } : {}),
        questionId,
        responseType,
        prompt,
      };
    })
    .filter((question) => Boolean(question.questionId));
}
function findFrameRecord(document: ContentDocument, target: StudentWorkTargetInput): FrameRecord | null {
  if (!target.frameId) return null;
  const records = collectFrameRecords(document).filter((record) => record.frame.id === target.frameId && (!target.pageId || record.page.id === target.pageId));
  if (target.childFrameId) {
    return records.find((record) => record.childFrame?.id === target.childFrameId) ?? null;
  }
  return records.find((record) => !record.childFrame) ?? null;
}

function failTarget(): never {
  throw new StudentWorkPolicyError("This content target is not available.", "INVALID_TARGET");
}

function targetSemanticValue(record: FrameRecord | undefined, question?: Record<string, unknown>) {
  return {
    page: record ? pageSemanticValue(record.page) : undefined,
    frame: record ? frameSemanticValue(record.childFrame ?? record.frame) : undefined,
    question,
  };
}

function segmentForTarget(document: ContentDocument, target: StudentWorkTargetInput, moduleId?: string) {
  const manifest = buildV2NarrationManifest(document, "STUDENT", { scopeId: moduleId ?? "document" });
  return manifest.segments.find((segment) =>
    segment.id === target.segmentId &&
    (!target.pageId || segment.pageId === target.pageId) &&
    (!target.frameId || segment.frameId === target.frameId) &&
    (!target.childFrameId || segment.childFrameId === target.childFrameId),
  ) ?? null;
}

function assertHighlightMatchesText(anchor: HighlightAnchor, text: string) {
  if (anchor.end > text.length || text.slice(anchor.start, anchor.end) !== anchor.text) {
    throw new StudentWorkPolicyError("The highlight anchor is invalid.", "INVALID_TARGET");
  }
  if (anchor.prefix && !text.slice(Math.max(0, anchor.start - anchor.prefix.length), anchor.start).endsWith(anchor.prefix)) {
    throw new StudentWorkPolicyError("The highlight anchor is invalid.", "INVALID_TARGET");
  }
  if (anchor.suffix && !text.slice(anchor.end, anchor.end + anchor.suffix.length).startsWith(anchor.suffix)) {
    throw new StudentWorkPolicyError("The highlight anchor is invalid.", "INVALID_TARGET");
  }
}

function textForFrame(document: ContentDocument, record: FrameRecord, moduleId?: string) {
  const manifest = buildV2NarrationManifest(document, "STUDENT", { scopeId: moduleId ?? "document" });
  return manifest.segments
    .filter((segment) =>
      segment.pageId === record.page.id &&
      segment.frameId === record.frame.id &&
      (!record.childFrame || segment.childFrameId === record.childFrame.id),
    )
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((segment) => segment.text)
    .join("\n");
}

function requiredPage(document: ContentDocument, target: StudentWorkTargetInput) {
  if (!target.pageId) failTarget();
  const page = document.pageLayout?.pages.find((entry) => entry.id === target.pageId);
  if (!page) failTarget();
  return page;
}

export function resolveV2StudentWorkTarget(input: {
  bookId: string;
  moduleId?: string;
  type: StudentWorkTypeName;
  target: StudentWorkTargetInput;
  payload?: ValidatedStudentWorkPayload["value"];
  document?: ContentDocument;
}): ResolvedStudentWorkTarget {
  validateWorkTargetPolicy(input.type, input.target);
  const target = { ...input.target, ...(input.moduleId ? { moduleId: input.moduleId } : {}) };
  const readingPayload = input.payload as { pageId?: string; segmentId?: string } | undefined;
  if (input.type === "READING_POSITION" && !input.document && !readingPayload?.pageId) {
    const masterSourceHash = semanticHash({ bookId: input.bookId, type: input.type });
    return {
      type: input.type,
      target,
      targetKey: buildStudentWorkTargetKey({ bookId: input.bookId, type: input.type, target }),
      masterSourceHash,
      targetSourceHash: masterSourceHash,
    };
  }
  if (!input.document || !isLayoutV2Document(input.document)) {
    throw new StudentWorkPolicyError("This content target is not available.", "CONTENT_UNAVAILABLE");
  }
  const masterSourceHash = semanticHash(documentSemanticValue(input.document));

  if (input.type === "READING_POSITION") {
    const payload = input.payload as { pageId?: string; segmentId?: string } | undefined;
    const readingPageId = payload?.pageId;
    if (readingPageId) {
      const page = input.document.pageLayout?.pages.find((entry) => entry.id === readingPageId);
      if (!page) failTarget();
      if (payload.segmentId) {
        const segment = segmentForTarget(input.document, { pageId: readingPageId, segmentId: payload.segmentId }, input.moduleId);
        if (!segment) failTarget();
      }
      return {
        type: input.type,
        target: { ...target, pageId: readingPageId, ...(payload.segmentId ? { segmentId: payload.segmentId } : {}) },
        targetKey: buildStudentWorkTargetKey({ bookId: input.bookId, type: input.type, target }),
        masterSourceHash,
        targetSourceHash: semanticHash(pageSemanticValue(page)),
      };
    }
    return {
      type: input.type,
      target,
      targetKey: buildStudentWorkTargetKey({ bookId: input.bookId, type: input.type, target }),
      masterSourceHash,
      targetSourceHash: masterSourceHash,
    };
  }

  if (input.type === "ANSWER" || input.type === "COMPLETION") {
    if (input.target.questionId) {
      const candidates = collectQuestionCandidates(input.document).filter((candidate) =>
        candidate.question.id === input.target.questionId && frameMatches(candidate, input.target),
      );
      if (candidates.length !== 1) failTarget();
      const candidate = candidates[0];
      const canonicalTarget = {
        ...target,
        pageId: candidate.page.id,
        frameId: candidate.frame.id,
        ...(candidate.childFrame ? { childFrameId: candidate.childFrame.id } : {}),
      };
      return {
        type: input.type,
        target: canonicalTarget,
        targetKey: buildStudentWorkTargetKey({ bookId: input.bookId, type: input.type, target: canonicalTarget }),
        masterSourceHash,
        targetSourceHash: semanticHash(targetSemanticValue(candidate, candidate.question)),
        question: candidate.question,
      };
    }
  }

  if (input.type === "BOOKMARK") {
    const page = requiredPage(input.document, input.target);
    const canonicalTarget = { ...target, pageId: page.id };
    return {
      type: input.type,
      target: canonicalTarget,
      targetKey: buildStudentWorkTargetKey({ bookId: input.bookId, type: input.type, target: canonicalTarget }),
      masterSourceHash,
      targetSourceHash: semanticHash(pageSemanticValue(page)),
    };
  }

  const frame = findFrameRecord(input.document, input.target);
  if (input.type === "HIGHLIGHT") {
    const payload = input.payload as { anchor?: HighlightAnchor } | undefined;
    if (!payload?.anchor) throw new StudentWorkPolicyError("A highlight anchor is required.", "INVALID_PAYLOAD");
    if (input.target.segmentId) {
      const segment = segmentForTarget(input.document, input.target, input.moduleId);
      if (!segment) failTarget();
      assertHighlightMatchesText(payload.anchor, segment.text);
      const canonicalTarget = { ...target, pageId: segment.pageId, frameId: segment.frameId, ...(segment.childFrameId ? { childFrameId: segment.childFrameId } : {}) };
      return {
        type: input.type,
        target: canonicalTarget,
        targetKey: buildStudentWorkTargetKey({ bookId: input.bookId, type: input.type, target: canonicalTarget, anchor: payload.anchor }),
        masterSourceHash,
        targetSourceHash: semanticHash({ segment: { id: segment.id, sourceHash: segment.sourceHash, text: segment.text }, anchor: payload.anchor }),
        semanticText: segment.text,
      };
    }
    if (!frame) failTarget();
    const text = textForFrame(input.document, frame, input.moduleId);
    if (!text) failTarget();
    assertHighlightMatchesText(payload.anchor, text);
    const canonicalTarget = { ...target, pageId: frame.page.id, frameId: frame.frame.id, ...(frame.childFrame ? { childFrameId: frame.childFrame.id } : {}) };
    return {
      type: input.type,
      target: canonicalTarget,
      targetKey: buildStudentWorkTargetKey({ bookId: input.bookId, type: input.type, target: canonicalTarget, anchor: payload.anchor }),
      masterSourceHash,
      targetSourceHash: semanticHash({ frame: frameSemanticValue(frame.childFrame ?? frame.frame), text, anchor: payload.anchor }),
      semanticText: text,
    };
  }

  if (input.type === "NOTE" || input.type === "COMPLETION") {
    if (input.target.pageId && !input.target.frameId) {
      const page = requiredPage(input.document, input.target);
      const canonicalTarget = { ...target, pageId: page.id };
      return {
        type: input.type,
        target: canonicalTarget,
        targetKey: buildStudentWorkTargetKey({ bookId: input.bookId, type: input.type, target: canonicalTarget }),
        masterSourceHash,
        targetSourceHash: semanticHash(pageSemanticValue(page)),
      };
    }
    if (!frame) failTarget();
    if (frame.frame.hidden || frame.childFrame?.hidden) failTarget();
    const canonicalTarget = { ...target, pageId: frame.page.id, frameId: frame.frame.id, ...(frame.childFrame ? { childFrameId: frame.childFrame.id } : {}) };
    return {
      type: input.type,
      target: canonicalTarget,
      targetKey: buildStudentWorkTargetKey({ bookId: input.bookId, type: input.type, target: canonicalTarget }),
      masterSourceHash,
      targetSourceHash: semanticHash(targetSemanticValue(frame)),
    };
  }

  failTarget();
}
