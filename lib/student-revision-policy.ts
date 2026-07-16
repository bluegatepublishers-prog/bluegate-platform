export interface ApprovedRevisionChapter {
  id: string;
  chapterNumber: number;
  title: string;
  summary: string | null;
  keywords: string[];
  learningOutcomes: Array<{
    id: string;
    outcome: string;
    bloomLevel: string | null;
    competency: string | null;
  }>;
  questions: Array<{
    id: string;
    questionText: string;
    correctAnswer: string | null;
    explanation: string | null;
  }>;
  activities: Array<{
    id: string;
    title: string;
    objective: string;
    instructions: string;
    expectedLearning: string | null;
  }>;
}

export function buildStudentRevisionContent(chapter: ApprovedRevisionChapter) {
  const summary = chapter.summary?.trim() || null;
  const keywords = [...new Set(chapter.keywords.map((item) => item.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .map((keyword) => ({ keyword, definition: null as string | null }));
  const quickRevisionCards = chapter.questions
    .filter((item) => item.questionText.trim() && item.correctAnswer?.trim())
    .map((item) => ({
      id: item.id,
      question: item.questionText.trim(),
      answer: item.correctAnswer!.trim(),
      explanation: item.explanation?.trim() || null,
    }));

  return {
    id: chapter.id,
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    summary,
    keyPoints: chapter.learningOutcomes.map((item) => ({
      id: item.id,
      text: item.outcome,
      bloomLevel: item.bloomLevel,
      competency: item.competency,
    })),
    keywords,
    formulae: [] as string[],
    importantDates: [] as Array<{ date: string; description: string }>,
    definitions: [] as Array<{ term: string; definition: string }>,
    mindMap: null as null,
    quickRevisionCards,
    rememberBoxes: [] as string[],
    commonMistakes: [] as string[],
    didYouKnow: [] as string[],
    activities: chapter.activities.map((item) => ({
      id: item.id,
      title: item.title,
      objective: item.objective,
      instructions: item.instructions,
      expectedLearning: item.expectedLearning,
    })),
  };
}

export type RevisionChecklist = {
  summaryRead: boolean;
  keywordsRead: boolean;
  mindMapRead: boolean;
  revisionCompleted: boolean;
};

const checklistKeys = ["summaryRead", "keywordsRead", "mindMapRead", "revisionCompleted"] as const;

export function validateRevisionChecklist(input: unknown): RevisionChecklist | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) => !checklistKeys.includes(key as typeof checklistKeys[number]))) return null;
  if (checklistKeys.some((key) => typeof record[key] !== "boolean")) return null;
  return {
    summaryRead: record.summaryRead as boolean,
    keywordsRead: record.keywordsRead as boolean,
    mindMapRead: record.mindMapRead as boolean,
    revisionCompleted: record.revisionCompleted as boolean,
  };
}
