export type PublisherChoice = { id: string; text: string };
export type PublisherPair = { left: string; right: string };

export type PublisherQuestionDraft = {
  questionType: string;
  questionText: string;
  chapterId: string;
  moduleId: string;
  imageResourceId: string;
  options: PublisherChoice[];
  pairs: PublisherPair[];
  correctAnswer: string;
  correctAnswers: string[];
  acceptedAnswers: string[];
  explanation: string;
  marks: number;
  difficulty: string;
  bloomLevel: string;
  competency: string;
  tags: string;
};

export const MINIMUM_PUBLISHER_CHOICES = 2;
export function formatPublisherChapterLabel(chapterNumber: number | undefined, title: string) {
  const cleanTitle = title.trim();
  if (!cleanTitle) return chapterNumber === undefined ? "Chapter" : `Chapter ${chapterNumber}`;
  if (/^chapter\s+\d+\s*:/iu.test(cleanTitle)) return cleanTitle;
  return chapterNumber === undefined ? cleanTitle : `Chapter ${chapterNumber}: ${cleanTitle}`;
}

export function createPublisherQuestionDraft(chapterId = ""): PublisherQuestionDraft {
  return {
    questionType: "MCQ",
    questionText: "",
    chapterId,
    moduleId: "",
    imageResourceId: "",
    options: [{ id: "option-1", text: "" }, { id: "option-2", text: "" }],
    pairs: [{ left: "", right: "" }],
    correctAnswer: "",
    correctAnswers: [],
    acceptedAnswers: [],
    explanation: "",
    marks: 1,
    difficulty: "MEDIUM",
    bloomLevel: "",
    competency: "",
    tags: "",
  };
}

export function nextPublisherChoiceId(options: PublisherChoice[]) {
  let sequence = options.length + 1;
  while (options.some((option) => option.id === `option-${sequence}`)) sequence += 1;
  return `option-${sequence}`;
}

export function addPublisherChoice(draft: PublisherQuestionDraft) {
  return { ...draft, options: [...draft.options, { id: nextPublisherChoiceId(draft.options), text: "" }] };
}

export function removePublisherChoice(draft: PublisherQuestionDraft, id: string) {
  if (draft.options.length <= MINIMUM_PUBLISHER_CHOICES) return draft;
  return {
    ...draft,
    options: draft.options.filter((option) => option.id !== id),
    correctAnswer: draft.correctAnswer === id ? "" : draft.correctAnswer,
    correctAnswers: draft.correctAnswers.filter((answer) => answer !== id),
  };
}

export function normalizePublisherChoices(value: unknown): PublisherChoice[] {
  if (!Array.isArray(value)) return [];
  const choices = value.flatMap((entry, index) => {
    if (typeof entry === "string" && entry.trim()) return [{ id: `option-${index + 1}`, text: entry.trim() }];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const item = entry as Record<string, unknown>;
    const text = [item.text, item.label, item.value].find((candidate) => typeof candidate === "string" && candidate.trim());
    if (typeof text !== "string") return [];
    return [{ id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `option-${index + 1}`, text: text.trim() }];
  });
  return choices.length ? choices : [];
}

export function normalizePublisherPairs(value: unknown): PublisherPair[] {
  if (!Array.isArray(value)) return [{ left: "", right: "" }];
  const pairs = value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const item = entry as Record<string, unknown>;
    return typeof item.left === "string" && typeof item.right === "string" ? [{ left: item.left, right: item.right }] : [];
  });
  return pairs.length ? pairs : [{ left: "", right: "" }];
}

export function parsePublisherCorrectAnswers(value: string | null, questionType: string) {
  if (!value || !["MULTIPLE_SELECT", "ORDERING"].includes(questionType)) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

export function validatePublisherQuestionDraft(draft: PublisherQuestionDraft) {
  if (!draft.questionText.trim()) return "Question text is required.";
  if (["MCQ", "MULTIPLE_SELECT", "ORDERING"].includes(draft.questionType)) {
    if (draft.options.length < MINIMUM_PUBLISHER_CHOICES || draft.options.some((option) => !option.text.trim())) return "At least two non-empty options are required.";
    if (new Set(draft.options.map((option) => option.id)).size !== draft.options.length) return "Option identifiers must be unique.";
  }
  if (draft.questionType === "MCQ" && !draft.options.some((option) => option.id === draft.correctAnswer)) return "Select one correct option.";
  if (draft.questionType === "MULTIPLE_SELECT" && !draft.correctAnswers.some((answer) => draft.options.some((option) => option.id === answer))) return "Select at least one correct option.";
  if (draft.questionType === "TRUE_FALSE" && !["true", "false"].includes(draft.correctAnswer)) return "Select True or False.";
  if (draft.questionType === "FILL_BLANK" && !draft.correctAnswer.trim()) return "Fill Blank requires a correct answer.";
  if (draft.questionType === "MATCH" && draft.pairs.some((pair) => !pair.left.trim() || !pair.right.trim())) return "Every matching pair needs a left and right value.";
  if (draft.questionType === "PICTURE_BASED" && !draft.imageResourceId) return "Picture Based requires an image resource.";
  return null;
}
