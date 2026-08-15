import { normalizeQuestionType } from "@/lib/normalized-question";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ: "MCQ",
  TRUE_FALSE: "True / False",
  FILL_BLANK: "Fill in the Blanks",
  MULTIPLE_SELECT: "Multiple Select",
  MATCH: "Match the Following",
  ORDERING: "Ordering / Sequence",
  SHORT_ANSWER: "Short Answer",
  LONG_ANSWER: "Long Answer",
  CASE_BASED: "Case-based",
  COMPETENCY: "Competency",
  HOTS: "HOTS",
  PICTURE_BASED: "Picture-based",
  ASSERTION_REASON: "Assertion / Reason",
  PRACTICAL: "Practical",
  PROJECT: "Project",
  CUSTOM: "Custom",
};

const LAUNCHER_LABELS: Record<string, string> = {
  CHAPTER_TEST: "CHAPTER TEST",
  MULTI_CHAPTER_TEST: "CHAPTER TEST",
  UNIT_TEST: "UNIT TEST",
  TERM_TEST: "TERM TEST",
  MULTI_TERM_TEST: "TERM TEST",
  BOOK_TEST: "BOOK TEST",
  EXAM: "EXAM",
  FINAL_EXAM: "FINAL EXAM",
  DIAGNOSTIC: "DIAGNOSTIC",
};

export function getPublisherAssessmentQuestionTypeLabel(questionType: string) {
  const normalized = normalizeQuestionType(questionType);
  return QUESTION_TYPE_LABELS[normalized] ?? questionType.replaceAll("_", " ");
}

export function getPublisherAssessmentLauncherLabel(kind: string) {
  return LAUNCHER_LABELS[kind] ?? "ASSESSMENT";
}

export function groupPublisherAssessmentItemsByType<T extends { questionType: string }>(items: T[]) {
  const groups: Array<{ questionType: string; items: T[] }> = [];
  for (const item of items) {
    const questionType = normalizeQuestionType(item.questionType);
    const existing = groups.find((group) => group.questionType === questionType);
    if (existing) existing.items.push(item);
    else groups.push({ questionType, items: [item] });
  }
  return groups;
}

type ChapterLike = { title: string; chapterNumber: number };

export function getPublisherAssessmentScopeSummary(input: {
  chapter?: ChapterLike | null;
  unit?: { title: string } | null;
  chapters?: ChapterLike[];
}) {
  if (input.chapter) return `Chapter ${input.chapter.chapterNumber}: ${input.chapter.title}`;
  if (input.unit) return input.unit.title;
  const chapters = input.chapters ?? [];
  if (chapters.length === 1) return `Chapter ${chapters[0].chapterNumber}: ${chapters[0].title}`;
  if (chapters.length > 1) {
    const first = chapters[0].chapterNumber;
    const last = chapters[chapters.length - 1].chapterNumber;
    return `Chapters ${first}-${last}`;
  }
  return "Whole Book";
}
