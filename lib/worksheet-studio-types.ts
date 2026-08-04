import type { PublisherWorksheetType } from "@prisma/client";

export const WORKSHEET_TYPES = [
  "PRINTABLE",
  "INTERACTIVE",
  "REMEDIAL",
  "CHALLENGE",
  "HOME",
  "CLASSROOM",
  "REVISION",
  "DIAGNOSTIC",
  "ENRICHMENT",
] as const satisfies readonly PublisherWorksheetType[];

export const WORKSHEET_AUDIENCES = ["TEACHER", "STUDENT", "BOTH"] as const;
export const WORKSHEET_DIFFICULTIES = ["FOUNDATIONAL", "MODERATE", "ADVANCED"] as const;

export type WorksheetAudience = (typeof WORKSHEET_AUDIENCES)[number];
export type WorksheetDifficulty = (typeof WORKSHEET_DIFFICULTIES)[number];

export type WorksheetResourceSummary = {
  id: string;
  title: string;
  type: string;
  route: { href: string; openMode: "route" };
  published: boolean;
  teacherOnly: boolean;
};

export type WorksheetExerciseSummary = {
  id: string;
  title: string;
  questionCount: number;
  marks: number | null;
  published: boolean;
  route: { href: string; openMode: "route" } | null;
};

export type WorksheetStudioRecord = {
  id: string;
  publisherId: string;
  bookId: string;
  chapterId: string;
  moduleId: string | null;
  topicId: string | null;
  exerciseId: string | null;
  printableResourceId: string | null;
  answerKeyResourceId: string | null;
  supportingResourceIds: string[];
  title: string;
  slug: string;
  type: PublisherWorksheetType;
  instructions: string | null;
  estimatedMinutes: number | null;
  difficulty: WorksheetDifficulty | null;
  audience: WorksheetAudience;
  totalMarks: number | null;
  allowOnlineAttempt: boolean;
  allowPrint: boolean;
  showAnswersAfterSubmit: boolean;
  active: boolean;
  published: boolean;
  sortOrder: number;
  archived: boolean;
  updatedAt: string;
};

export type ResolvedWorksheetBlock = {
  worksheet: WorksheetStudioRecord;
  exercise: WorksheetExerciseSummary | null;
  printableResource: WorksheetResourceSummary | null;
  answerKeyResource: WorksheetResourceSummary | null;
  supportingResources: WorksheetResourceSummary[];
} | null;

export function worksheetTypeLabel(type: PublisherWorksheetType) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
