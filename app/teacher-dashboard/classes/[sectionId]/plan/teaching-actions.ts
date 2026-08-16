"use server";

import type { TeachingPeriodStatus } from "@prisma/client";

import {
  addTeachingPeriodPages,
  createTeachingPeriod,
  createTeachingPlan,
  deleteTeachingPeriod,
  getOrCreateTeachingPlan,
  getTeachingPeriod,
  getTeachingPlan,
  getTeachingPlanForSchool,
  getTeachingPlanPageAvailability,
  getTeachingPlanPagePreview,
  listAvailableV2Pages,
  listTeachingPlans,
  moveTeachingPeriod,
  removeTeachingPeriodPage,
  reorderTeachingPeriodPages,
  reorderTeachingPeriods,
  updateTeachingPeriod,
  type TeachingPlanContextInput,
} from "@/lib/teaching-plan";

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
}) {
  return createTeachingPeriod(input);
}

export async function updateTeachingPeriodAction(input: {
  periodId: string;
  title: string;
  plannedDate?: string | null;
  status?: TeachingPeriodStatus;
  chapterId?: string | null;
}) {
  return updateTeachingPeriod(input);
}

export async function deleteTeachingPeriodAction(input: { periodId: string }) {
  return deleteTeachingPeriod(input);
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
