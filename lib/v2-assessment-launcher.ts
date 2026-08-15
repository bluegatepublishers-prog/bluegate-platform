import type { LayoutV2Frame } from "@/lib/content-layout-v2";
import { getPublisherAssessmentLauncherLabel } from "@/lib/publisher-assessment-presentation";

export type V2PracticeQuestionType =
  | "MCQ"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "MULTIPLE_SELECT"
  | "SHORT_ANSWER";

export type V2AssessmentLauncherTarget = {
  exerciseId: string;
  groupId: string;
  questionType?: V2PracticeQuestionType;
  questionIds?: string[];
};

export type V2QuestionAssessmentLauncherPayload = {
  kind: "assessment-launcher";
  launcherType: "question";
  target: V2AssessmentLauncherTarget & { questionType: V2PracticeQuestionType };
  display: { label: string };
};

export type V2PublisherAssessmentLauncherPayload = {
  kind: "assessment-launcher";
  launcherType: "publisher-assessment";
  version: 1;
  assessmentId: string;
  display: { label: string };
};

export type V2AssessmentLauncherPayload =
  | V2QuestionAssessmentLauncherPayload
  | V2PublisherAssessmentLauncherPayload;

const LABELS: Record<V2PracticeQuestionType, string> = {
  MCQ: "MCQ",
  TRUE_FALSE: "TRUE / FALSE",
  MULTIPLE_SELECT: "MULTIPLE SELECT",
  SHORT_ANSWER: "SHORT ANSWER",
  FILL_BLANK: "FILL BLANK",
};

export function createV2AssessmentLauncherPayload(
  target: V2AssessmentLauncherTarget,
): V2QuestionAssessmentLauncherPayload {
  const questionType = normalizeQuestionType(target.questionType);
  return {
    kind: "assessment-launcher",
    launcherType: "question",
    target: {
      exerciseId: target.exerciseId,
      groupId: target.groupId,
      questionType,
      ...(target.questionIds?.length
        ? { questionIds: [...new Set(target.questionIds.map((id) => id.trim()).filter(Boolean))] }
        : {}),
    },
    display: { label: LABELS[questionType] },
  };
}

export function createV2PublisherAssessmentLauncherPayload(input: {
  assessmentId: string;
  kind: string;
}): V2PublisherAssessmentLauncherPayload {
  const assessmentId = input.assessmentId.trim();
  if (!assessmentId) throw new Error("A publisher assessment id is required.");
  return {
    kind: "assessment-launcher",
    launcherType: "publisher-assessment",
    version: 1,
    assessmentId,
    display: { label: getPublisherAssessmentLauncherLabel(input.kind) },
  };
}

export function getV2AssessmentLauncherPayload(
  frame: Pick<LayoutV2Frame, "type" | "payload">,
): V2AssessmentLauncherPayload | null {
  if (
    frame.type !== "ASSESSMENT_LAUNCHER" ||
    !frame.payload ||
    typeof frame.payload !== "object" ||
    Array.isArray(frame.payload)
  ) return null;

  const value = frame.payload as Record<string, unknown>;
  if (value.kind === "assessment-launcher" && value.launcherType === "publisher-assessment") {
    const assessmentId = typeof value.assessmentId === "string" ? value.assessmentId.trim() : "";
    if (!assessmentId) return null;
    const display = value.display && typeof value.display === "object" && !Array.isArray(value.display)
      ? (value.display as Record<string, unknown>) : {};
    return {
      kind: "assessment-launcher",
      launcherType: "publisher-assessment",
      version: 1,
      assessmentId,
      display: { label: typeof display.label === "string" && display.label.trim() ? display.label.trim() : "ASSESSMENT" },
    };
  }

  const target = value.target && typeof value.target === "object" && !Array.isArray(value.target)
    ? (value.target as Record<string, unknown>) : null;
  const exerciseId = target && typeof target.exerciseId === "string" ? target.exerciseId.trim() : "";
  const groupId = target && typeof target.groupId === "string" ? target.groupId.trim() : "";
  const legacyQuestionId = target && typeof target.questionId === "string" ? target.questionId.trim() : "";
  const questionIds = target && Array.isArray(target.questionIds)
    ? [...new Set(target.questionIds.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean))]
    : legacyQuestionId ? [legacyQuestionId] : [];
  if (value.kind !== "assessment-launcher" || value.launcherType !== "question" || (!exerciseId && !groupId && !legacyQuestionId)) return null;

  const questionType = normalizeQuestionType(target?.questionType);
  const display = value.display && typeof value.display === "object" && !Array.isArray(value.display)
    ? (value.display as Record<string, unknown>) : {};
  return {
    kind: "assessment-launcher",
    launcherType: "question",
    target: { exerciseId, groupId, questionType, ...(questionIds.length ? { questionIds } : {}) },
    display: { label: typeof display.label === "string" && display.label.trim() ? display.label.trim() : LABELS[questionType] },
  };
}

export function v2PracticeQuestionLabel(questionType: V2PracticeQuestionType) {
  return LABELS[questionType];
}

function normalizeQuestionType(value: unknown): V2PracticeQuestionType {
  return value === "TRUE_FALSE" || value === "FILL_BLANK" || value === "MULTIPLE_SELECT" || value === "SHORT_ANSWER"
    ? value : "MCQ";
}
