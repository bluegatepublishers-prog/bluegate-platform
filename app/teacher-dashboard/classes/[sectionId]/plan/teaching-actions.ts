"use server";

import type { TeachingPeriodStatus } from "@prisma/client";

import {
  addTeachingPeriodPages,
  createTeachingPeriod,
  createTeachingPeriodActivity,
  createTeachingPlan,
  deleteTeachingPeriod,
  deleteTeachingPeriodActivity,
  getOrCreateTeachingPlan,
  getTeachingPeriod,
  getTeachingPlan,
  getTeachingPlanForSchool,
  getTeachingPlanPageAvailability,
  getTeachingPlanPagePreview,
  getTeachingPlanTimetableOccurrences,
  listAvailableV2Pages,
  listTeachingPlans,
  moveTeachingPeriod,
  removeTeachingPeriodPage,
  reorderTeachingPeriodPages,
  reorderTeachingPeriods,
  saveTeachingPeriodComposer,

  updateTeachingPeriod,
  updateTeachingPeriodActivity,
  getTeachingPeriodComposerData,
  TeachingPlanError,
  type TeachingPlanContextInput,
} from "@/lib/teaching-plan";
import { planTeacherTimetableOccurrence } from "@/lib/teacher-planner";
import { saveTeachingPeriodAssignments, validateTeachingPeriodAssignmentDrafts } from "@/lib/assignments/assignment-service";
import { saveTeacherPeriodAssessments } from "@/lib/teacher-assessments";
import { isTeachingPeriodMeaningfullyPlanned } from "@/lib/teaching-period-plan-policy";

export async function planTeacherTimetableOccurrenceAction(input: { timetableEntryId: string; date: string; bookId?: string }) {
  return planTeacherTimetableOccurrence(input);
}

export async function getTeachingPlanTimetableOccurrencesAction(input: { sectionId: string; sectionSubjectId: string; academicYearId?: string; days?: number }) {
  return getTeachingPlanTimetableOccurrences(input);
}

export async function getTeachingPeriodComposerDataAction(input: TeachingPlanContextInput) {
  return getTeachingPeriodComposerData(input);
}

export async function saveTeachingPeriodComposerAction(input: {
  periodId?: string | null;
  sectionId: string;
  sectionSubjectId: string;
  timetableEntryId: string;
  date: string;
  bookId: string;
  chapterId?: string | null;
  pages?: unknown;
  objective?: string | null;
  notes?: string | null;
  activities?: unknown;
  assignments?: unknown;
  assessments?: unknown;
}) {
  if (input.assessments !== undefined && !Array.isArray(input.assessments)) throw new TeachingPlanError("INVALID_INPUT", "Assessments must be a list.");
  if (input.assignments !== undefined) validateTeachingPeriodAssignmentDrafts(input.assignments);
  const meaningful = isTeachingPeriodMeaningfullyPlanned({
    chapterId: input.chapterId,
    pageRefs: Array.isArray(input.pages) ? input.pages : [],
    objective: input.objective,
    notes: input.notes,
    activities: Array.isArray(input.activities) ? input.activities : [],
    assignments: Array.isArray(input.assignments) ? input.assignments : [],
    assessments: Array.isArray(input.assessments) ? input.assessments : [],
  });
  if (!input.periodId && !meaningful) {
    throw new TeachingPlanError("INVALID_INPUT", "Add something to the period before saving the plan.");
  }
  const period = input.periodId
    ? { id: input.periodId }
    : await planTeacherTimetableOccurrence({
        timetableEntryId: input.timetableEntryId,
        date: input.date,
        bookId: input.bookId,
      });
  await saveTeachingPeriodComposer({ ...input, periodId: period.id });
  if (input.assignments !== undefined) {
    await saveTeachingPeriodAssignments({
      sectionId: input.sectionId,
      sectionSubjectId: input.sectionSubjectId,
      periodId: period.id,
      drafts: input.assignments,
    });
  }
  if (input.assessments !== undefined) {
    await saveTeacherPeriodAssessments({ sectionId: input.sectionId, sectionSubjectId: input.sectionSubjectId, periodId: period.id, drafts: input.assessments });
  }
  return getTeachingPeriod({ periodId: period.id });
}

export async function getTeachingPlanAction(input: { planId: string }) {
  return getTeachingPlan(input);
}

export async function listTeachingPlansAction(input?: { academicYearId?: string; sectionSubjectId?: string; bookId?: string }) {
  return listTeachingPlans(input);
}

export async function createTeachingPlanAction(input: TeachingPlanContextInput) {
  return createTeachingPlan(input);
}

export async function getOrCreateTeachingPlanAction(input: TeachingPlanContextInput) {
  return getOrCreateTeachingPlan(input);
}

export async function createTeachingPeriodAction(input: {
  planId: string;
  title: string;
  plannedDate?: string | null;
  chapterId?: string | null;
  objective?: string | null;
  notes?: string | null;
}) {
  return createTeachingPeriod(input);
}

export async function updateTeachingPeriodAction(input: {
  periodId: string;
  title: string;
  plannedDate?: string | null;
  status?: TeachingPeriodStatus;
  chapterId?: string | null;
  objective?: string | null;
  notes?: string | null;
}) {
  return updateTeachingPeriod(input);
}

export async function deleteTeachingPeriodAction(input: { periodId: string }) {
  return deleteTeachingPeriod(input);
}

export async function createTeachingPeriodActivityAction(input: {
  periodId: string;
  type: unknown;
  title: string;
  description?: string | null;
}) {
  return createTeachingPeriodActivity(input);
}

export async function updateTeachingPeriodActivityAction(input: {
  activityId: string;
  type?: unknown;
  title?: string;
  description?: string | null;
}) {
  return updateTeachingPeriodActivity(input);
}

export async function deleteTeachingPeriodActivityAction(input: { activityId: string }) {
  return deleteTeachingPeriodActivity(input);
}

export async function reorderTeachingPeriodsAction(input: { planId: string; orderedPeriodIds: unknown }) {
  return reorderTeachingPeriods(input);
}

export async function moveTeachingPeriodAction(input: { periodId: string; direction: "EARLIER" | "LATER" }) {
  return moveTeachingPeriod(input);
}

export async function getTeachingPeriodAction(input: { periodId: string }) {
  return getTeachingPeriod(input);
}

export async function addTeachingPeriodPagesAction(input: { periodId: string; pages: unknown }) {
  return addTeachingPeriodPages(input);
}

export async function removeTeachingPeriodPageAction(input: { periodId: string; pageRefId: string }) {
  return removeTeachingPeriodPage(input);
}

export async function reorderTeachingPeriodPagesAction(input: { periodId: string; orderedPageRefIds: unknown }) {
  return reorderTeachingPeriodPages(input);
}

export async function listAvailableV2PagesAction(input: TeachingPlanContextInput) {
  return listAvailableV2Pages(input);
}

export async function getTeachingPlanForSchoolAction(planId: string) {
  return getTeachingPlanForSchool(planId);
}
export async function getTeachingPlanPageAvailabilityAction(input: TeachingPlanContextInput) {
  return getTeachingPlanPageAvailability(input);
}

export async function getTeachingPlanPagePreviewAction(input: TeachingPlanContextInput & { pageId: string; moduleId: string }) {
  return getTeachingPlanPagePreview(input);
}
