export const WORKSHEET_QUESTION_TYPES = [
  "mcq",
  "fillBlank",
  "trueFalse",
  "match",
  "oneWord",
  "veryShort",
  "short",
  "long",
  "assertionReason",
  "caseBased",
  "competency",
  "hots",
  "custom",
] as const;

export type WorksheetQuestionType = (typeof WORKSHEET_QUESTION_TYPES)[number];

export const WORKSHEET_QUESTION_LABELS: Record<WorksheetQuestionType, string> = {
  mcq: "MCQ",
  fillBlank: "Fill in the Blanks",
  trueFalse: "True / False",
  match: "Match the Following",
  oneWord: "One-word Answer",
  veryShort: "Very Short Answer",
  short: "Short Answer",
  long: "Long Answer",
  assertionReason: "Assertion - Reason",
  caseBased: "Case-based Question",
  competency: "Competency-based Question",
  hots: "HOTS",
  custom: "Custom Question",
};

export type WorksheetVisibility = {
  student: boolean;
  teacher: boolean;
};

export type WorksheetOption = { id: string; text: string };
export type WorksheetPair = { id: string; left: string; right: string };
export type WorksheetSubQuestion = {
  id: string;
  prompt: string;
  answer?: string;
  marks?: number;
};

export type WorksheetQuestion = {
  id: string;
  type: WorksheetQuestionType;
  prompt: string;
  instructions?: string;
  marks?: number;
  answer?: string;
  explanation?: string;
  resourceId?: string;
  visibility?: WorksheetVisibility;
  options?: WorksheetOption[];
  correctOption?: string;
  blanks?: string[];
  trueFalseAnswer?: "true" | "false";
  pairs?: WorksheetPair[];
  assertion?: string;
  reason?: string;
  assertionOptions?: WorksheetOption[];
  correctAssertionOption?: string;
  caseText?: string;
  subQuestions?: WorksheetSubQuestion[];
};

export type WorksheetBlockData = {
  id: string;
  type: "worksheet";
  title?: string;
  instructions?: string;
  description?: string;
  marks?: number;
  difficulty?: string;
  duration?: string;
  teacherNote?: string;
  answerKeyEnabled?: boolean;
  questions: WorksheetQuestion[];
};

const DEFAULT_VISIBILITY: WorksheetVisibility = { student: true, teacher: true };

export function worksheetQuestionLabel(type: WorksheetQuestionType) {
  return WORKSHEET_QUESTION_LABELS[type] ?? WORKSHEET_QUESTION_LABELS.custom;
}

export function isWorksheetQuestionType(value: unknown): value is WorksheetQuestionType {
  return typeof value === "string" && WORKSHEET_QUESTION_TYPES.includes(value as WorksheetQuestionType);
}

export function createWorksheetQuestion(type: WorksheetQuestionType = "custom"): WorksheetQuestion {
  const question: WorksheetQuestion = {
    id: createStableId(),
    type,
    prompt: "",
    visibility: { ...DEFAULT_VISIBILITY },
  };
  if (type === "mcq") question.options = ["A", "B", "C", "D"].map((text) => ({ id: createStableId(), text }));
  if (type === "match") question.pairs = [createWorksheetPair(), createWorksheetPair()];
  if (type === "caseBased") question.subQuestions = [createWorksheetSubQuestion()];
  if (type === "assertionReason") question.assertionOptions = defaultAssertionOptions();
  return question;
}

export function createWorksheetBlock(): WorksheetBlockData {
  return {
    id: createStableId(),
    type: "worksheet",
    questions: [],
  };
}

export function createWorksheetPair(): WorksheetPair {
  return { id: createStableId(), left: "", right: "" };
}

export function createWorksheetSubQuestion(): WorksheetSubQuestion {
  return { id: createStableId(), prompt: "" };
}

export function defaultAssertionOptions(): WorksheetOption[] {
  return [
    { id: createStableId(), text: "Both Assertion and Reason are true, and Reason explains Assertion" },
    { id: createStableId(), text: "Both Assertion and Reason are true, but Reason does not explain Assertion" },
    { id: createStableId(), text: "Assertion is true, but Reason is false" },
    { id: createStableId(), text: "Assertion is false, but Reason is true" },
  ];
}

export function normalizeWorksheetBlock(value: unknown, id = createStableId()): WorksheetBlockData {
  const record = isRecord(value) ? value : {};
  const questions = Array.isArray(record.questions)
    ? record.questions.map((question) => normalizeWorksheetQuestion(question)).filter(Boolean) as WorksheetQuestion[]
    : [];
  return {
    id: typeof record.id === "string" && record.id.trim() ? record.id : id,
    type: "worksheet",
    title: optionalText(record.title),
    instructions: optionalText(record.instructions),
    description: optionalText(record.description),
    marks: optionalNumber(record.marks, 0),
    difficulty: optionalText(record.difficulty),
    duration: optionalText(record.duration),
    teacherNote: optionalText(record.teacherNote),
    answerKeyEnabled: record.answerKeyEnabled === false ? false : record.answerKeyEnabled === true ? true : undefined,
    questions,
  };
}

export function normalizeWorksheetQuestion(value: unknown): WorksheetQuestion | null {
  if (!isRecord(value)) return null;
  const type = isWorksheetQuestionType(value.type) ? value.type : "custom";
  const rawVisibility = isRecord(value.visibility) ? value.visibility : {};
  const question: WorksheetQuestion = {
    id: typeof value.id === "string" && value.id.trim() ? value.id : createStableId(),
    type,
    prompt: text(value.prompt ?? value.question ?? value.text),
    instructions: optionalText(value.instructions),
    marks: optionalNumber(value.marks, 0),
    answer: optionalText(value.answer),
    explanation: optionalText(value.explanation),
    resourceId: optionalText(value.resourceId),
    visibility: {
      student: rawVisibility.student === undefined ? true : rawVisibility.student === true,
      teacher: rawVisibility.teacher === undefined ? true : rawVisibility.teacher === true,
    },
  };
  if (type === "mcq") {
    question.options = normalizeOptions(value.options, ["A", "B", "C", "D"]);
    question.correctOption = optionalText(value.correctOption);
  }
  if (type === "fillBlank") question.blanks = normalizeTextList(value.blanks);
  if (type === "trueFalse" && (value.trueFalseAnswer === "true" || value.trueFalseAnswer === "false")) question.trueFalseAnswer = value.trueFalseAnswer;
  if (type === "match") question.pairs = normalizePairs(value.pairs);
  if (type === "assertionReason") {
    question.assertion = optionalText(value.assertion);
    question.reason = optionalText(value.reason);
    question.assertionOptions = normalizeOptions(value.assertionOptions, defaultAssertionOptions().map((option) => option.text));
    question.correctAssertionOption = optionalText(value.correctAssertionOption);
  }
  if (type === "caseBased") {
    question.caseText = optionalText(value.caseText);
    question.subQuestions = normalizeSubQuestions(value.subQuestions);
  }
  return question;
}

export function addWorksheetQuestion(block: WorksheetBlockData, question: WorksheetQuestion, index?: number): WorksheetBlockData {
  const questions = [...block.questions];
  questions.splice(Math.min(questions.length, Math.max(0, index ?? questions.length)), 0, question);
  return { ...block, questions };
}

export function removeWorksheetQuestion(block: WorksheetBlockData, questionId: string): WorksheetBlockData {
  return { ...block, questions: block.questions.filter((question) => question.id !== questionId) };
}

export function moveWorksheetQuestion(block: WorksheetBlockData, questionId: string, direction: -1 | 1): WorksheetBlockData {
  const questions = [...block.questions];
  const index = questions.findIndex((question) => question.id === questionId);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= questions.length) return block;
  [questions[index], questions[next]] = [questions[next], questions[index]];
  return { ...block, questions };
}

export function duplicateWorksheetQuestion(block: WorksheetBlockData, questionId: string): WorksheetBlockData {
  const index = block.questions.findIndex((question) => question.id === questionId);
  if (index < 0) return block;
  const source = block.questions[index];
  const copy = cloneQuestion(source);
  const questions = [...block.questions];
  questions.splice(index + 1, 0, copy);
  return { ...block, questions };
}

function cloneQuestion(question: WorksheetQuestion): WorksheetQuestion {
  return {
    ...question,
    id: createStableId(),
    visibility: question.visibility ? { ...question.visibility } : undefined,
    options: question.options?.map((option) => ({ ...option, id: createStableId() })),
    assertionOptions: question.assertionOptions?.map((option) => ({ ...option, id: createStableId() })),
    pairs: question.pairs?.map((pair) => ({ ...pair, id: createStableId() })),
    subQuestions: question.subQuestions?.map((subQuestion) => ({ ...subQuestion, id: createStableId() })),
  };
}

function normalizeOptions(value: unknown, fallback: string[]) {
  const options = Array.isArray(value) ? value.map((option) => {
    const record = isRecord(option) ? option : {};
    return { id: typeof record.id === "string" && record.id.trim() ? record.id : createStableId(), text: text(record.text ?? record.value) };
  }) : [];
  return options.length ? options : fallback.map((option) => ({ id: createStableId(), text: option }));
}

function normalizePairs(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((pair) => {
    const record = isRecord(pair) ? pair : {};
    return { id: typeof record.id === "string" && record.id.trim() ? record.id : createStableId(), left: text(record.left ?? record.columnA), right: text(record.right ?? record.columnB) };
  });
}

function normalizeSubQuestions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const record = isRecord(entry) ? entry : {};
    return { id: typeof record.id === "string" && record.id.trim() ? record.id : createStableId(), prompt: text(record.prompt ?? record.question ?? record.text), answer: optionalText(record.answer), marks: optionalNumber(record.marks, 0) };
  });
}

function normalizeTextList(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => text(entry)).filter(Boolean) : [];
}

function optionalNumber(value: unknown, minimum: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= minimum ? Math.min(10000, Math.round(number * 100) / 100) : undefined;
}

function optionalText(value: unknown) {
  const result = text(value);
  return result || undefined;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function createStableId() {
  return `worksheet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
