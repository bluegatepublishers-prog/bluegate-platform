import type { NormalizedQuestion } from "@/lib/normalized-question";

export type ContextOption = { id: string; label: string };
export type BookOption = { id: string; title: string; sectionSubjectIds: string[]; chapters: Array<{ id: string; title: string; chapterNumber: number }> };
export type ModuleOption = { id: string; title: string; bookId: string; chapterId: string };
export type ImageOption = { id: string; title: string; type: string; thumbnail: string | null; mimeType: string | null };
export type BankOptions = { contexts: ContextOption[]; books: BookOption[]; modules: ModuleOption[]; images: ImageOption[] };
export type Choice = { id: string; text: string };
export type Pair = { left: string; right: string };
export type Normalized = NormalizedQuestion;
export type Question = {
  id: string;
  context: { sectionSubjectId: string | null; bookId: string | null; chapterId: string | null; moduleId: string | null };
  question: { questionType: string; questionText: string; options: unknown; correctAnswer: string | null; explanation: string | null; marks: number; difficulty: string; bloomLevel: string | null; competency: string | null; tags: string[] };
  imageResource: ImageOption | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED" | string;
  revision: number;
  sourceHash: string;
  createdAt: string;
  updatedAt: string;
  normalized: Normalized;
};
export type Draft = {
  questionType: string; questionText: string; marks: number; difficulty: string;
  sectionSubjectId: string; bookId: string; chapterId: string; moduleId: string;
  tags: string; imageResourceId: string; options: Choice[]; correctAnswer: string;
  correctAnswers: string[]; pairs: Pair[]; bloomLevel: string; competency: string; explanation: string;
};
export type Filters = { status: "" | "DRAFT" | "ACTIVE"; questionType: string; difficulty: string; sectionSubjectId: string; bookId: string; chapterId: string; moduleId: string; tags: string };
export const EMPTY_FILTERS: Filters = { status: "", questionType: "", difficulty: "", sectionSubjectId: "", bookId: "", chapterId: "", moduleId: "", tags: "" };
export const QUESTION_TYPES = [["MCQ", "Multiple choice"], ["TRUE_FALSE", "True / False"], ["FILL_BLANK", "Fill in the blank"], ["MATCH", "Match the following"], ["MULTIPLE_SELECT", "Multiple select"], ["ORDERING", "Ordering / sequence"], ["PICTURE_BASED", "Picture-based"], ["SHORT_ANSWER", "Short answer"], ["LONG_ANSWER", "Long answer"], ["CASE_BASED", "Case-based"], ["COMPETENCY", "Competency"], ["HOTS", "HOTS"], ["ASSERTION_REASON", "Assertion / reason"], ["PRACTICAL", "Practical"], ["PROJECT", "Project"], ["CUSTOM", "Custom"]] as const;
export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export function title(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
export function typeLabel(value: string) { return QUESTION_TYPES.find(([type]) => type === value)?.[1] ?? title(value); }
export function gradingLabel(capability: string) { return capability === "AUTO" ? "Auto graded" : capability === "HYBRID" ? "Hybrid" : "Manual review"; }
export function formatDate(value: string) { try { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); } catch { return "recently"; } }
export function friendlyError(message?: string) { return message && !message.includes("Error") ? message : "Question Bank is unavailable. Please try again."; }