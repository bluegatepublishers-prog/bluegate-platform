import type { ContentBlock, ContentDocument } from "@/lib/content-document";
import { isActivityBlock, isExerciseBlock, isWorksheetBlock } from "@/lib/content-document";
import type { LayoutV2Frame, LayoutV2Page } from "@/lib/content-layout-v2";
import type { BookNarrationManifest } from "@/lib/content-narration";
import type { StudentWorkClientItem } from "@/lib/student-work-client";
import { payloadOptionIds, payloadText } from "@/lib/student-work-client";
import type { StudentWorkTargetInput } from "@/lib/student-work-policy";

export const STUDENT_PAGE_STATES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const;
export type StudentPageState = (typeof STUDENT_PAGE_STATES)[number];
export type CompletionReason = "DERIVED" | "EXPLICIT";

export type StudentProgressQuestion = {
  id: string;
  type: string;
  target: StudentWorkTargetInput;
  options?: string[];
  required: boolean;
};

export type StudentPageProgress = {
  pageId: string;
  pageNumber: number;
  state: StudentPageState;
  completedReason?: CompletionReason;
  answerable: number;
  answered: number;
  staleRequired: number;
  explicitCompletion: boolean;
  requirements: StudentProgressQuestion[];
};

export type StudentModuleProgress = {
  moduleId: string;
  totalPages: number;
  startedPages: number;
  completedPages: number;
  answerableQuestions: number;
  answeredQuestions: number;
  staleRequired: number;
  pages: StudentPageProgress[];
  percentage: number;
};

export type StudentBookProgress = {
  totalPages: number;
  startedPages: number;
  completedPages: number;
  answerableQuestions: number;
  answeredQuestions: number;
  staleRequired: number;
  percentage: number;
  modules: StudentModuleProgress[];
};

export type ResumeLocation = {
  pageId: string;
  pageNumber: number;
  segmentId?: string;
  segmentAvailable: boolean;
  fallback: boolean;
};

type ProgressModule = { moduleId: string; document: ContentDocument };

const TEXT_TYPES = new Set([
  "fillblank",
  "oneword",
  "veryshort",
  "short",
  "long",
  "custom",
  "observation",
  "result",
  "reflection",
]);
const CHOICE_TYPES = new Set(["mcq", "truefalse"]);

function normalizeType(type: string) {
  return type.replace(/[\s_-]+/g, "").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStudentFrame(frame: LayoutV2Frame) {
  return frame.audience !== "TEACHER" && !frame.hidden && frame.readable !== false;
}

function frameRecords(document: ContentDocument) {
  const records: Array<{ page: LayoutV2Page; frame: LayoutV2Frame; childFrame?: LayoutV2Frame }> = [];
  for (const page of document.pageLayout?.pages ?? []) {
    for (const frame of page.frames) {
      if (isStudentFrame(frame)) records.push({ page, frame });
      for (const childFrame of frame.children ?? []) {
        if (isStudentFrame(frame) && isStudentFrame(childFrame)) records.push({ page, frame, childFrame });
      }
    }
  }
  return records;
}

function blockForRecord(blocks: Map<string, ContentBlock>, record: { frame: LayoutV2Frame; childFrame?: LayoutV2Frame }) {
  const blockId = record.childFrame?.contentRef?.blockId ?? record.frame.contentRef?.blockId;
  return blockId ? blocks.get(blockId) : undefined;
}

function questionType(value: unknown) {
  return isRecord(value) && typeof value.type === "string" ? value.type : "custom";
}

function questionId(value: unknown) {
  return isRecord(value) && typeof value.id === "string" ? value.id : null;
}

function questionRequired(value: unknown) {
  if (!isRecord(value)) return true;
  return value.required !== false && value.optional !== true;
}

function questionOptions(value: unknown) {
  if (!isRecord(value)) return [];
  const options = Array.isArray(value.options) ? value.options : Array.isArray(value.assertionOptions) ? value.assertionOptions : [];
  return options.flatMap((option) => isRecord(option) && typeof option.id === "string" ? [option.id] : []);
}

function supportedQuestion(value: unknown) {
  const type = normalizeType(questionType(value));
  return TEXT_TYPES.has(type) || CHOICE_TYPES.has(type);
}

function pageRequirements(document: ContentDocument, moduleId: string, page: LayoutV2Page): StudentProgressQuestion[] {
  const blocks = new Map(document.blocks.map((block) => [block.id, block]));
  const requirements: StudentProgressQuestion[] = [];
  for (const record of frameRecords(document).filter((entry) => entry.page.id === page.id)) {
    const block = blockForRecord(blocks, record);
    if (!block) continue;
    const entries: unknown[] = isWorksheetBlock(block)
      ? block.questions
      : isExerciseBlock(block)
        ? [...block.questions, ...block.groups.flatMap((group) => group.questions)]
        : isActivityBlock(block)
          ? block.fields.filter((field) => ["observation", "result", "reflection", "custom"].includes(field.type))
          : [];
    for (const entry of entries) {
      if (!isRecord(entry) || entry.visibility && isRecord(entry.visibility) && entry.visibility.student === false) continue;
      const id = questionId(entry);
      if (!id || !supportedQuestion(entry)) continue;
      requirements.push({
        id,
        type: questionType(entry),
        target: {
          moduleId,
          pageId: page.id,
          frameId: record.frame.id,
          ...(record.childFrame ? { childFrameId: record.childFrame.id } : {}),
          questionId: id,
        },
        options: questionOptions(entry),
        required: questionRequired(entry),
      });
    }
  }
  return requirements.filter((entry) => entry.required);
}

function currentWork(items: StudentWorkClientItem[], type: string, target: StudentWorkTargetInput) {
  return items.find((item) => item.type === type && item.status === "CURRENT" && Object.entries(target).every(([key, value]) => item.target[key as keyof StudentWorkTargetInput] === value));
}

function anyWork(items: StudentWorkClientItem[], type: string, target: StudentWorkTargetInput) {
  return items.find((item) => item.type === type && Object.entries(target).every(([key, value]) => item.target[key as keyof StudentWorkTargetInput] === value));
}

function answerIsValid(item: StudentWorkClientItem | undefined, requirement: StudentProgressQuestion) {
  if (!item || item.status !== "CURRENT") return false;
  const type = normalizeType(requirement.type);
  if (CHOICE_TYPES.has(type)) {
    const selected = payloadOptionIds(item.payload);
    return selected.length > 0 && (requirement.options?.length ? selected.every((id) => requirement.options?.includes(id)) : true);
  }
  return Boolean(payloadText(item.payload).trim());
}

function hasEngagement(items: StudentWorkClientItem[], moduleId: string, pageId: string) {
  return items.some((item) => ["READING_POSITION", "NOTE", "HIGHLIGHT", "BOOKMARK"].includes(item.type) && item.status === "CURRENT" && item.target.moduleId === moduleId && (item.target.pageId === pageId || item.type === "READING_POSITION" && isRecord(item.payload) && item.payload.pageId === pageId));
}

export function getQuestionCompletion(items: StudentWorkClientItem[], requirement: StudentProgressQuestion) {
  const answer = anyWork(items, "ANSWER", requirement.target);
  return { answered: answerIsValid(answer, requirement), stale: answer?.status === "STALE" };
}

export function getPageProgress(input: { document: ContentDocument; moduleId: string; pageId: string; items: StudentWorkClientItem[] }): StudentPageProgress {
  const pages = input.document.pageLayout?.pages ?? [];
  const pageIndex = pages.findIndex((page) => page.id === input.pageId);
  const page = pageIndex >= 0 ? pages[pageIndex] : undefined;
  const safePage = page ?? pages[0];
  if (!safePage) return { pageId: input.pageId, pageNumber: 0, state: "NOT_STARTED", answerable: 0, answered: 0, staleRequired: 0, explicitCompletion: false, requirements: [] };
  const requirements = pageRequirements(input.document, input.moduleId, safePage);
  const answers = requirements.map((requirement) => getQuestionCompletion(input.items, requirement));
  const answered = answers.filter((entry) => entry.answered).length;
  const staleRequired = answers.filter((entry) => entry.stale).length;
  const completion = currentWork(input.items, "COMPLETION", { moduleId: input.moduleId, pageId: safePage.id });
  const explicitCompletion = isRecord(completion?.payload) && completion.payload.state === "COMPLETED";
  const state: StudentPageState = requirements.length
    ? answered === requirements.length && staleRequired === 0 ? "COMPLETED" : answered > 0 || staleRequired > 0 || hasEngagement(input.items, input.moduleId, safePage.id) ? "IN_PROGRESS" : "NOT_STARTED"
    : explicitCompletion ? "COMPLETED" : hasEngagement(input.items, input.moduleId, safePage.id) ? "IN_PROGRESS" : "NOT_STARTED";
  return {
    pageId: safePage.id,
    pageNumber: pages.findIndex((entry) => entry.id === safePage.id) + 1,
    state,
    ...(state === "COMPLETED" ? { completedReason: requirements.length ? "DERIVED" as const : "EXPLICIT" as const } : {}),
    answerable: requirements.length,
    answered,
    staleRequired,
    explicitCompletion,
    requirements,
  };
}

export function getModuleProgress(moduleId: string, document: ContentDocument, items: StudentWorkClientItem[]): StudentModuleProgress {
  const pages = document.pageLayout?.pages ?? [];
  const pageProgress = pages.map((page) => getPageProgress({ document, moduleId, pageId: page.id, items }));
  const score = pageProgress.reduce((sum, page) => sum + (page.state === "COMPLETED" ? 1 : page.state === "IN_PROGRESS" ? 0.5 : 0), 0);
  return {
    moduleId,
    totalPages: pageProgress.length,
    startedPages: pageProgress.filter((page) => page.state !== "NOT_STARTED").length,
    completedPages: pageProgress.filter((page) => page.state === "COMPLETED").length,
    answerableQuestions: pageProgress.reduce((sum, page) => sum + page.answerable, 0),
    answeredQuestions: pageProgress.reduce((sum, page) => sum + page.answered, 0),
    staleRequired: pageProgress.reduce((sum, page) => sum + page.staleRequired, 0),
    pages: pageProgress,
    percentage: pageProgress.length ? Math.round((score / pageProgress.length) * 100) : 0,
  };
}

export function getBookProgress(modules: ProgressModule[], items: StudentWorkClientItem[]): StudentBookProgress {
  const moduleProgress = modules.map((module) => getModuleProgress(module.moduleId, module.document, items));
  const totalPages = moduleProgress.reduce((sum, module) => sum + module.totalPages, 0);
  const score = moduleProgress.reduce((sum, module) => sum + module.pages.reduce((pageSum, page) => pageSum + (page.state === "COMPLETED" ? 1 : page.state === "IN_PROGRESS" ? 0.5 : 0), 0), 0);
  return {
    totalPages,
    startedPages: moduleProgress.reduce((sum, module) => sum + module.startedPages, 0),
    completedPages: moduleProgress.reduce((sum, module) => sum + module.completedPages, 0),
    answerableQuestions: moduleProgress.reduce((sum, module) => sum + module.answerableQuestions, 0),
    answeredQuestions: moduleProgress.reduce((sum, module) => sum + module.answeredQuestions, 0),
    staleRequired: moduleProgress.reduce((sum, module) => sum + module.staleRequired, 0),
    percentage: totalPages ? Math.round((score / totalPages) * 100) : 0,
    modules: moduleProgress,
  };
}

export function resolveResumeLocation(input: { document: ContentDocument; moduleId: string; item?: StudentWorkClientItem; manifest?: BookNarrationManifest }): ResumeLocation | null {
  if (!input.item || input.item.type !== "READING_POSITION") return null;
  if (input.item.target.moduleId && input.item.target.moduleId !== input.moduleId) return null;
  const pages = input.document.pageLayout?.pages ?? [];
  if (!pages.length || !isRecord(input.item.payload) || typeof input.item.payload.pageId !== "string") return null;
  const pageId = input.item.payload.pageId;
  const page = pages.find((entry) => entry.id === pageId) ?? pages[0];
  if (!page) return null;
  const requestedSegment = typeof input.item.payload.segmentId === "string" ? input.item.payload.segmentId : undefined;
  const segment = requestedSegment ? input.manifest?.segments.find((entry) => entry.id === requestedSegment && entry.pageId === page.id) : undefined;
  return { pageId: page.id, pageNumber: pages.findIndex((entry) => entry.id === page.id) + 1, ...(segment ? { segmentId: segment.id } : {}), segmentAvailable: Boolean(segment), fallback: page.id !== pageId };
}
