export const TEACHING_PERIOD_ACTIVITY_TYPES = [
  "CLASSWORK",
  "DISCUSSION",
  "READING",
  "PRACTICAL",
  "PROJECT",
  "ACTIVITY",
  "OTHER",
] as const;

export type TeachingPeriodActivityType = (typeof TEACHING_PERIOD_ACTIVITY_TYPES)[number];
export type TeachingPeriodPlanState = "PLANNED" | "NOT_PLANNED";

export type TeachingPeriodMeaningfulInput = {
  chapterId?: string | null;
  pageRefs?: readonly unknown[] | null;
  objective?: string | null;
  notes?: string | null;
  activities?: readonly unknown[] | null;
  assignmentCount?: number;
  assessmentCount?: number;
  assignments?: readonly unknown[] | null;
  assessments?: readonly unknown[] | null;
};

function hasItems(value: readonly unknown[] | number | null | undefined) {
  return typeof value === "number" ? value > 0 : Boolean(value?.length);
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function isTeachingPeriodMeaningfullyPlanned(period: TeachingPeriodMeaningfulInput) {
  return Boolean(
    hasText(period.chapterId) ||
    hasItems(period.pageRefs) ||
    hasText(period.objective) ||
    hasText(period.notes) ||
    hasItems(period.activities) ||
    hasItems(period.assignmentCount) ||
    hasItems(period.assessmentCount) ||
    hasItems(period.assignments) ||
    hasItems(period.assessments),
  );
}

export function getTeachingPeriodPlanState(period: TeachingPeriodMeaningfulInput): TeachingPeriodPlanState {
  return isTeachingPeriodMeaningfullyPlanned(period) ? "PLANNED" : "NOT_PLANNED";
}

export function isTeachingPeriodActivityType(value: unknown): value is TeachingPeriodActivityType {
  return typeof value === "string" &&
    (TEACHING_PERIOD_ACTIVITY_TYPES as readonly string[]).includes(value);
}