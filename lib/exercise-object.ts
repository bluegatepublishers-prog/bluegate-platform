import {
  createWorksheetQuestion,
  normalizeWorksheetQuestion,
  type AuthoringQuestion,
  type AuthoringQuestionType,
} from "@/lib/authoring-question";

export type ExerciseGroup = {
  id: string;
  title?: string;
  instructions?: string;
  questions: AuthoringQuestion[];
};

export type ExerciseBlockData = {
  id: string;
  type: "exercise";
  title?: string;
  introduction?: string;
  instructions?: string;
  teacherNote?: string;
  difficulty?: string;
  suggestedTime?: string;
  showAnswersToStudent?: boolean;
  questions: AuthoringQuestion[];
  groups: ExerciseGroup[];
};

export function createExerciseQuestion(type: AuthoringQuestionType = "custom") {
  return createWorksheetQuestion(type);
}

export function createExerciseBlock(): ExerciseBlockData {
  return { id: createStableId(), type: "exercise", questions: [], groups: [] };
}

export function createExerciseGroup(): ExerciseGroup {
  return { id: createStableId(), questions: [] };
}

export function normalizeExerciseBlock(value: unknown, id = createStableId()): ExerciseBlockData {
  const record = isRecord(value) ? value : {};
  const groups = Array.isArray(record.groups)
    ? record.groups.map((group) => normalizeExerciseGroup(group)).filter(Boolean) as ExerciseGroup[]
    : [];
  const questions = normalizeQuestions(record.questions);
  return {
    id: typeof record.id === "string" && record.id.trim() ? record.id : id,
    type: "exercise",
    title: optionalText(record.title),
    introduction: optionalText(record.introduction),
    instructions: optionalText(record.instructions),
    teacherNote: optionalText(record.teacherNote),
    difficulty: optionalText(record.difficulty),
    suggestedTime: optionalText(record.suggestedTime ?? record.estimatedMinutes),
    showAnswersToStudent: record.showAnswersToStudent === true,
    questions,
    groups,
  };
}

export function addExerciseQuestion(block: ExerciseBlockData, question: AuthoringQuestion, groupId?: string, index?: number) {
  if (!groupId) return insertQuestion(block, question, index);
  return { ...block, groups: block.groups.map((group) => group.id === groupId ? { ...group, questions: insertAt(group.questions, question, index) } : group) };
}

export function removeExerciseQuestion(block: ExerciseBlockData, questionId: string) {
  return { ...block, questions: block.questions.filter((question) => question.id !== questionId), groups: block.groups.map((group) => ({ ...group, questions: group.questions.filter((question) => question.id !== questionId) })) };
}

export function moveExerciseQuestion(block: ExerciseBlockData, questionId: string, direction: -1 | 1) {
  if (block.questions.some((question) => question.id === questionId)) return { ...block, questions: moveItems(block.questions, questionId, direction) };
  return { ...block, groups: block.groups.map((group) => group.questions.some((question) => question.id === questionId) ? { ...group, questions: moveItems(group.questions, questionId, direction) } : group) };
}

export function duplicateExerciseQuestion(block: ExerciseBlockData, questionId: string) {
  if (block.questions.some((question) => question.id === questionId)) return { ...block, questions: duplicateItems(block.questions, questionId) };
  return { ...block, groups: block.groups.map((group) => group.questions.some((question) => question.id === questionId) ? { ...group, questions: duplicateItems(group.questions, questionId) } : group) };
}

export function addExerciseGroup(block: ExerciseBlockData, group = createExerciseGroup(), index?: number) {
  return { ...block, groups: insertAt(block.groups, group, index) };
}

export function updateExerciseGroup(block: ExerciseBlockData, groupId: string, patch: Partial<ExerciseGroup>) {
  return { ...block, groups: block.groups.map((group) => group.id === groupId ? { ...group, ...patch } : group) };
}

export function removeExerciseGroup(block: ExerciseBlockData, groupId: string) {
  const group = block.groups.find((entry) => entry.id === groupId);
  return { ...block, groups: block.groups.filter((entry) => entry.id !== groupId), questions: group ? [...block.questions, ...group.questions] : block.questions };
}

export function moveExerciseGroup(block: ExerciseBlockData, groupId: string, direction: -1 | 1) {
  return { ...block, groups: moveItems(block.groups, groupId, direction) };
}

function normalizeExerciseGroup(value: unknown): ExerciseGroup | null {
  if (!isRecord(value)) return null;
  return { id: typeof value.id === "string" && value.id.trim() ? value.id : createStableId(), title: optionalText(value.title), instructions: optionalText(value.instructions), questions: normalizeQuestions(value.questions) };
}

function normalizeQuestions(value: unknown) {
  return Array.isArray(value) ? value.map((question) => normalizeWorksheetQuestion(question)).filter(Boolean) as AuthoringQuestion[] : [];
}

function insertQuestion(block: ExerciseBlockData, question: AuthoringQuestion, index?: number) {
  return { ...block, questions: insertAt(block.questions, question, index) };
}

function insertAt<T>(items: T[], item: T, index?: number) {
  const next = [...items]; next.splice(Math.min(next.length, Math.max(0, index ?? next.length)), 0, item); return next;
}

function moveItems<T extends { id: string }>(items: T[], id: string, direction: -1 | 1) {
  const next = [...items]; const index = next.findIndex((item) => item.id === id); const target = index + direction;
  if (index < 0 || target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]]; return next;
}

function duplicateItems<T extends AuthoringQuestion>(items: T[], id: string) {
  const index = items.findIndex((item) => item.id === id); if (index < 0) return items;
  const source = items[index]; const copy = cloneQuestion(source); return [...items.slice(0, index + 1), copy, ...items.slice(index + 1)];
}

function cloneQuestion(question: AuthoringQuestion): AuthoringQuestion {
  return { ...question, id: createStableId(), visibility: question.visibility ? { ...question.visibility } : undefined, options: question.options?.map((option) => ({ ...option, id: createStableId() })), assertionOptions: question.assertionOptions?.map((option) => ({ ...option, id: createStableId() })), pairs: question.pairs?.map((pair) => ({ ...pair, id: createStableId() })), subQuestions: question.subQuestions?.map((entry) => ({ ...entry, id: createStableId() })) };
}

function optionalText(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function createStableId() { return `exercise_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`; }
