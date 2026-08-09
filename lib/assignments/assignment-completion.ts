import { validateStudentWorkPayload } from "@/lib/student-work-policy";

export type AssignmentCompletionQuestion = {
  id: string;
  type: string;
  options?: Array<{ id: string; text: string }>;
};

export type AssignmentCompletionItem = {
  id: string;
  type: "PUBLISHER_PAGE" | "PUBLISHER_QUESTION" | "INSTRUCTION" | "TEACHER_QUESTION";
  state: "CURRENT" | "SOURCE_CHANGED" | "MISSING_TARGET";
  question?: AssignmentCompletionQuestion;
  currentTargetSourceHash?: string | null;
};

export type AssignmentCompletionWork = {
  assignmentItemId: string | null;
  payload: unknown;
  targetSourceHash: string | null;
};

export type AssignmentCompletionItemState = "INFORMATIONAL" | "COMPLETE" | "REMAINING" | "STALE" | "UNAVAILABLE";

export type AssignmentCompletionSummary = {
  totalAnswerable: number;
  completedAnswerable: number;
  remainingAnswerable: number;
  unavailableAnswerable: number;
  staleAnswerable: number;
  canSubmit: boolean;
  items: Array<{ assignmentItemId: string; state: AssignmentCompletionItemState }>;
};

function normalizedType(value: string) {
  return value.toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function validResponse(item: AssignmentCompletionItem, payload: unknown) {
  let parsed: ReturnType<typeof validateStudentWorkPayload>;
  try {
    parsed = validateStudentWorkPayload("ANSWER", payload);
  } catch {
    return false;
  }
  const type = normalizedType(item.question?.type ?? "");
  const value = parsed.value as Record<string, unknown>;
  const choice = type === "MCQ" || type === "TRUE_FALSE" || type === "TRUEFALSE";
  if (choice) {
    const optionIds = Array.isArray(value.optionIds) ? value.optionIds : [];
    const options = item.question?.options?.length
      ? item.question.options
      : type === "TRUE_FALSE" || type === "TRUEFALSE"
        ? [{ id: "true", text: "True" }, { id: "false", text: "False" }]
        : [];
    return optionIds.length === 1 && options.some((option) => option.id === optionIds[0]);
  }
  return typeof value.value === "string" && Boolean(value.value.trim());
}

export function deriveAssignmentWorkCompletion(input: {
  items: AssignmentCompletionItem[];
  work: AssignmentCompletionWork[];
}): AssignmentCompletionSummary {
  const workByItem = new Map(
    input.work
      .filter((entry) => typeof entry.assignmentItemId === "string" && entry.assignmentItemId)
      .map((entry) => [entry.assignmentItemId as string, entry]),
  );
  let totalAnswerable = 0;
  let completedAnswerable = 0;
  let unavailableAnswerable = 0;
  let staleAnswerable = 0;
  const items = input.items.map((item) => {
    if (item.type !== "PUBLISHER_QUESTION" && item.type !== "TEACHER_QUESTION") {
      return { assignmentItemId: item.id, state: "INFORMATIONAL" as const };
    }
    if (item.state === "MISSING_TARGET" || !item.question || !item.currentTargetSourceHash) {
      unavailableAnswerable += 1;
      return { assignmentItemId: item.id, state: "UNAVAILABLE" as const };
    }
    totalAnswerable += 1;
    const work = workByItem.get(item.id);
    if (!work) return { assignmentItemId: item.id, state: "REMAINING" as const };
    if (work.targetSourceHash !== item.currentTargetSourceHash) {
      staleAnswerable += 1;
      return { assignmentItemId: item.id, state: "STALE" as const };
    }
    if (!validResponse(item, work.payload)) return { assignmentItemId: item.id, state: "REMAINING" as const };
    completedAnswerable += 1;
    return { assignmentItemId: item.id, state: "COMPLETE" as const };
  });
  const remainingAnswerable = totalAnswerable - completedAnswerable;
  return {
    totalAnswerable,
    completedAnswerable,
    remainingAnswerable,
    unavailableAnswerable,
    staleAnswerable,
    canSubmit: remainingAnswerable === 0,
    items,
  };
}
