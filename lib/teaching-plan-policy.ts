import type { ContentDocument } from "@/lib/content-document";
import { isLayoutV2Document, type LayoutV2Page, type LayoutV2VisualMode } from "@/lib/content-layout-v2";
import { TeachingPeriodStatus } from "@prisma/client";

export const TEACHING_PLAN_POLICY_LIMITS = { identifier: 128 } as const;

export type TeachingPlanErrorCode =
  | "UNAUTHORIZED" | "INVALID_INPUT" | "ACADEMIC_YEAR_INVALID" | "SECTION_SUBJECT_INVALID"
  | "BOOK_NOT_ENTITLED" | "PLAN_NOT_FOUND" | "PERIOD_NOT_FOUND" | "PAGE_REF_NOT_FOUND"
  | "INVALID_PAGE" | "V1_UNSUPPORTED" | "INVALID_MODULE" | "DUPLICATE_PAGE"
  | "DATE_INVALID" | "DATE_CLOSED" | "STATUS_INVALID" | "CHAPTER_INVALID" | "FEATURE_DISABLED"
  | "CONFLICT" | "SAVE_FAILED";

export class TeachingPlanError extends Error {
  readonly code: TeachingPlanErrorCode;
  constructor(code: TeachingPlanErrorCode, message: string) {
    super(message);
    this.name = "TeachingPlanError";
    this.code = code;
  }
}

export type TeachingPageTarget = { pageId: string; moduleId?: string };
export type TeachingPageDeepLink = { bookId: string; moduleId: string; pageId: string; query: string; anchor: string };
export type TeachingPageMetadata = {
  moduleId: string;
  moduleTitle: string;
  chapterId: string | null;
  chapterTitle: string | null;
  pageId: string;
  currentPageOrder: number;
  displayPageNumber: number;
  title: string;
  visualMode?: LayoutV2VisualMode;
  deepLink: TeachingPageDeepLink;
};
export type TeachingModuleDocument = {
  id: string;
  title: string;
  displayOrder: number;
  chapterId: string | null;
  chapterTitle: string | null;
  document: ContentDocument | null;
};
export type TeachingPageCandidate = {
  module: TeachingModuleDocument;
  document: ContentDocument;
  page: LayoutV2Page;
  currentPageOrder: number;
  displayPageNumber: number;
  pageSourceHash: string;
};
export type TeachingPlanScopeValues = {
  schoolId: string;
  academicYearId: string;
  sectionSubjectId: string;
  teacherId: string;
  bookId: string;
};

function invalidInput(message: string): never {
  throw new TeachingPlanError("INVALID_INPUT", message);
}

function cleanIdentifier(value: unknown, label: string): string {
  if (typeof value !== "string") invalidInput("Invalid " + label + ".");
  const valueAsString = value.trim();
  if (!valueAsString || valueAsString.length > TEACHING_PLAN_POLICY_LIMITS.identifier) invalidInput("Invalid " + label + ".");
  return valueAsString;
}

export const TEACHING_PERIOD_STATUS_VALUES = [
  TeachingPeriodStatus.PLANNED,
  TeachingPeriodStatus.COMPLETED,
  TeachingPeriodStatus.SKIPPED,
  TeachingPeriodStatus.RESCHEDULED,
] as const;

export function parseTeachingPeriodStatus(value: unknown): TeachingPeriodStatus {
  if (typeof value === "string" && TEACHING_PERIOD_STATUS_VALUES.includes(value as TeachingPeriodStatus)) {
    return value as TeachingPeriodStatus;
  }
  throw new TeachingPlanError("STATUS_INVALID", "Invalid teaching period status.");
}

function utcCalendarDay(value: Date) {
  const day = new Date(0);
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCFullYear(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  return day;
}

export function parseTeachingPeriodDate(
  value: unknown,
  academicYear: { startDate: Date; endDate: Date },
): Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new TeachingPlanError("DATE_INVALID", "Use a valid date in YYYY-MM-DD format.");
  }
  const [year, month, date] = value.split("-").map(Number);
  const parsed = new Date(0);
  parsed.setUTCHours(0, 0, 0, 0);
  parsed.setUTCFullYear(year, month - 1, date);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== date
  ) {
    throw new TeachingPlanError("DATE_INVALID", "Use a real calendar date.");
  }
  const start = utcCalendarDay(academicYear.startDate);
  const end = utcCalendarDay(academicYear.endDate);
  if (parsed < start || parsed > end) {
    throw new TeachingPlanError("DATE_INVALID", "The planned date must be within the academic year.");
  }
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function assertTeachingPlanScope(plan: TeachingPlanScopeValues, expected: TeachingPlanScopeValues) {
  if (
    plan.schoolId !== expected.schoolId ||
    plan.academicYearId !== expected.academicYearId ||
    plan.sectionSubjectId !== expected.sectionSubjectId ||
    plan.teacherId !== expected.teacherId ||
    plan.bookId !== expected.bookId
  ) {
    throw new TeachingPlanError("UNAUTHORIZED", "This teaching plan is outside your authorized scope.");
  }
}

export function validateOrderedIds(existingIds: string[], orderedIds: unknown, label: string): string[] {
  if (!Array.isArray(orderedIds) || orderedIds.length !== existingIds.length) throw new TeachingPlanError("CONFLICT", "The " + label + " order is stale.");
  const existing = new Set(existingIds);
  const requested = orderedIds.map((value) => cleanIdentifier(value, label + " id"));
  const unique = new Set(requested);
  if (unique.size !== requested.length || requested.some((id) => !existing.has(id))) throw new TeachingPlanError("CONFLICT", "The " + label + " order is stale.");
  return requested;
}

export function buildCollisionSafeSequencePlan(ids: string[], temporaryOffset = 1_000_000) {
  return ids.map((id, index) => ({ id, temporarySequence: temporaryOffset + index + 1, finalSequence: index + 1 }));
}

export function buildTeachingPageDeepLink(input: { bookId: string; moduleId: string; pageId: string }): TeachingPageDeepLink {
  const bookId = cleanIdentifier(input.bookId, "Book");
  const moduleId = cleanIdentifier(input.moduleId, "BookModule");
  const pageId = cleanIdentifier(input.pageId, "page");
  const params = new URLSearchParams({ pageId, moduleId });
  return { bookId, moduleId, pageId, query: "?" + params.toString(), anchor: "page-" + encodeURIComponent(pageId) };
}

function orderedPages(document: ContentDocument) {
  return (document.pageLayout?.pages ?? []).slice().sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

function cleanPageText(value: string) {
  return value.replace(/\s+/gu, " ").trim().slice(0, 160);
}

function frameText(frame: { textSpans?: Array<{ text: string }>; payload?: unknown }) {
  const spanText = frame.textSpans?.map((span) => span.text).join("").trim();
  if (spanText) return cleanPageText(spanText);
  if (typeof frame.payload === "string") return cleanPageText(frame.payload);
  if (isRecord(frame.payload)) {
    for (const key of ["title", "heading", "text", "body", "prompt", "label"]) {
      const value = frame.payload[key];
      if (typeof value === "string" && value.trim()) return cleanPageText(value);
    }
  }
  return "";
}

function blockText(document: ContentDocument, blockId: string) {
  const block = document.blocks.find((item) => item.id === blockId);
  if (!block || !isRecord(block)) return "";
  for (const key of ["title", "text", "prompt", "objective", "instructions"]) {
    const value = (block as unknown as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return cleanPageText(value);
  }
  return "";
}

function nestedFrames(frames: Array<{ children?: Array<unknown> }>) {
  const output: Array<Record<string, unknown>> = [];
  const visit = (frame: Record<string, unknown>) => {
    output.push(frame);
    if (Array.isArray(frame.children)) frame.children.filter(isRecord).forEach(visit);
  };
  frames.filter(isRecord).forEach(visit);
  return output;
}

export function deriveTeachingPageTitle(page: LayoutV2Page, document: ContentDocument, displayPageNumber: number) {
  const blocks = new Map(document.blocks.map((block) => [block.id, block]));
  const frames = nestedFrames(page.frames as unknown as Array<{ children?: Array<unknown> }>);
  const heading = frames.find((frame) => {
    const reference = isRecord(frame.contentRef) ? frame.contentRef.blockId : undefined;
    const block = typeof reference === "string" ? blocks.get(reference) : undefined;
    return block && isRecord(block) && ["heading", "heading3", "subheading"].includes(String(block.type)) && (blockText(document, String(reference)) || frameText(frame as never));
  });
  const candidate = heading
    ? (isRecord(heading.contentRef) && typeof heading.contentRef.blockId === "string" ? blockText(document, heading.contentRef.blockId) : frameText(heading as never))
    : frames.map((frame) => {
        const reference = isRecord(frame.contentRef) ? frame.contentRef.blockId : undefined;
        return (typeof reference === "string" ? blockText(document, reference) : "") || frameText(frame as never);
      }).find(Boolean);
  return candidate || "Page " + displayPageNumber;
}

export function getTeachingPageSourceHash(page: LayoutV2Page) {
  return semanticHash({
    id: page.id,
    background: page.background,
    frames: page.frames,
  });
}

function semanticHash(value: unknown) {
  const presentationKeys = new Set(["x", "y", "width", "height", "zIndex", "layer", "layoutMode", "wrapMode", "rotation", "locked", "renderMode", "visualMode", "replica", "layout", "order"]);
  const semanticize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(semanticize);
    if (!isRecord(entry)) return entry;
    return Object.fromEntries(Object.keys(entry).filter((key) => !presentationKeys.has(key)).sort().map((key) => [key, semanticize(entry[key])]));
  };
  return stableHash(JSON.stringify(semanticize(value)));
}

function stableHash(value: string) {
  let left = 2166136261;
  let right = 2246822519;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 16777619);
    right = Math.imul(right ^ (code + index), 2246822519);
  }
  return (left >>> 0).toString(16).padStart(8, "0") + (right >>> 0).toString(16).padStart(8, "0");
}

function v2Pages(module: TeachingModuleDocument): TeachingPageCandidate[] {
  const document = module.document;
  if (!document || !isLayoutV2Document(document) || !document.pageLayout) return [];
  const pages = orderedPages(document);
  return pages.map((page, index) => ({
    module,
    document,
    page,
    currentPageOrder: index,
    displayPageNumber: index + 1,
    pageSourceHash: getTeachingPageSourceHash(page),
  }));
}

export function resolveTeachingPageTargetFromDocuments(target: TeachingPageTarget, modules: TeachingModuleDocument[]): TeachingPageCandidate {
  const pageId = cleanIdentifier(target.pageId, "page");
  if (target.moduleId && !modules.some((module) => module.id === target.moduleId)) throw new TeachingPlanError("INVALID_MODULE", "The selected module is not part of this book.");
  const selected = target.moduleId ? modules.filter((module) => module.id === target.moduleId) : modules;
  const matches = selected.flatMap((module) => v2Pages(module).filter((candidate) => candidate.page.id === pageId));
  if (matches.length === 1) return matches[0];
  if (target.moduleId) {
    const selectedModule = selected[0];
    if (selectedModule?.document && !isLayoutV2Document(selectedModule.document)) throw new TeachingPlanError("V1_UNSUPPORTED", "This module does not contain V2 page layout.");
  }
  if (!matches.length && selected.some((module) => module.document && !isLayoutV2Document(module.document))) throw new TeachingPlanError("V1_UNSUPPORTED", "This module does not contain V2 page layout.");
  throw new TeachingPlanError("INVALID_PAGE", "The selected V2 page was not found.");
}
