"use server";

import { getTeachingPeriod, getTeachingPlan, updateTeachingPeriod } from "@/lib/teaching-plan";
import {
  saveTeachingPeriodAssignments,

} from "@/lib/assignments/assignment-service";
import { saveTeacherPeriodAssessments, type TeacherPeriodAssessmentDraft } from "@/lib/teacher-assessments";
import { requireTeacherSubject } from "@/lib/teacher-experience";

type TeachModeScope = {
  sectionId: string;
  sectionSubjectId: string;
  periodId: string;
};

function iso(value: Date | null) {
  return value?.toISOString() ?? "";
}

function existingAssignmentDrafts(period: Awaited<ReturnType<typeof getTeachingPeriod>>): Array<Record<string, unknown>> {
  return period.assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    instructions: assignment.instructions ?? "",
    assignmentType: assignment.assignmentType as string,
    intent: assignment.status as string,
    sectionSubjectId: assignment.sectionSubjectId ?? "",
    bookId: assignment.bookId ?? "",
    chapterId: assignment.chapterId ?? "",
    totalMarks: assignment.totalMarks ?? "",
    allowTextSubmission: assignment.allowTextSubmission,
    allowFileSubmission: assignment.allowFileSubmission,
    allowMultipleFiles: assignment.allowMultipleFiles,
    maximumFiles: assignment.maximumFiles,
    maximumFileSizeMb: Math.max(1, Math.ceil(assignment.maximumFileSizeBytes / (1024 * 1024))),
    acceptedFileTypes: assignment.acceptedFileTypes as string[],
    allowLateSubmission: assignment.allowLateSubmission,
    allowResubmission: assignment.allowResubmission,
    maximumAttempts: assignment.maximumAttempts,
    publishAt: iso(assignment.publishAt),
    dueAt: iso(assignment.dueAt),
    closeAt: iso(assignment.closeAt),
  }));
}

function existingAssessmentDrafts(period: Awaited<ReturnType<typeof getTeachingPeriod>>): TeacherPeriodAssessmentDraft[] {
  return period.assessments.map((assessment) => ({
    id: assessment.id,
    title: assessment.title,
    type: assessment.type,
    instructions: assessment.instructions,
    durationMinutes: assessment.durationMinutes,
    maximumMarks: assessment.totalMarks || "",
    opensAt: iso(assessment.opensAt),
    dueAt: iso(assessment.dueAt),
    maxAttempts: assessment.maxAttempts,
    resultRelease: assessment.resultRelease,
    bookId: assessment.bookId,
    chapterId: assessment.chapterId,
    intent: "DRAFT",
  }));
}

async function assertTeachModeScope(input: TeachModeScope, period: Awaited<ReturnType<typeof getTeachingPeriod>>) {
  const { subject } = await requireTeacherSubject(input.sectionId, input.sectionSubjectId);
  const plan = await getTeachingPlan({ planId: period.planId });
  if (plan.sectionSubjectId !== subject.id) throw new Error("This teaching period is outside the selected class and subject.");
}

function safeMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message && error.message.length < 240) return error.message;
  return fallback;
}

export async function createTeachModeAssignmentAction(input: TeachModeScope & {
  bookId: string; assignmentType: "CLASSWORK" | "HOMEWORK" | "WORKSHEET";
  title: string;
  instructions: string;
  totalMarks?: string;
  dueAt?: string;
}) {
  try {
    const before = await getTeachingPeriod({ periodId: input.periodId });
    const draft = {
      title: input.title,
      instructions: input.instructions,
      assignmentType: input.assignmentType,
      intent: "DRAFT",
      sectionSubjectId: input.sectionSubjectId,
      bookId: input.bookId,
      chapterId: before.chapterId ?? "",
      totalMarks: input.totalMarks || "",
      allowTextSubmission: true,
      allowFileSubmission: false,
      allowMultipleFiles: false,
      maximumFiles: 1,
      maximumFileSizeMb: 10,
      acceptedFileTypes: [],
      allowLateSubmission: false,
      allowResubmission: false,
      maximumAttempts: 1,
      publishAt: "",
      dueAt: input.dueAt || "",
      closeAt: "",
    };
    await saveTeachingPeriodAssignments({
      sectionId: input.sectionId,
      sectionSubjectId: input.sectionSubjectId,
      periodId: input.periodId,
      drafts: [...existingAssignmentDrafts(before), draft],
    });
    const after = await getTeachingPeriod({ periodId: input.periodId });
    const beforeIds = new Set(before.assignments.map((assignment) => assignment.id));
    const created = after.assignments.find((assignment) => !beforeIds.has(assignment.id));
    return { ok: true as const, id: created?.id ?? null, period: after };
  } catch (error) {
    return { ok: false as const, message: safeMessage(error, "The classroom work could not be created.") };
  }
}

export async function createTeachModeAssessmentAction(input: TeachModeScope & { bookId: string;
  title: string;
  type: string;
  durationMinutes?: string;
  maximumMarks?: string;
}) {
  try {
    const before = await getTeachingPeriod({ periodId: input.periodId });
    const draft: TeacherPeriodAssessmentDraft = {
      title: input.title,
      type: input.type,
      durationMinutes: input.durationMinutes || null,
      maximumMarks: input.maximumMarks || null,
      maxAttempts: 1,
      bookId: input.bookId,
      chapterId: before.chapterId,
      intent: "DRAFT",
    };
    await saveTeacherPeriodAssessments({
      sectionId: input.sectionId,
      sectionSubjectId: input.sectionSubjectId,
      periodId: input.periodId,
      drafts: [...existingAssessmentDrafts(before), draft],
    });
    const after = await getTeachingPeriod({ periodId: input.periodId });
    const beforeIds = new Set(before.assessments.map((assessment) => assessment.id));
    const created = after.assessments.find((assessment) => !beforeIds.has(assessment.id));
    return { ok: true as const, id: created?.id ?? null, period: after };
  } catch (error) {
    return { ok: false as const, message: safeMessage(error, "The assessment could not be created.") };
  }
}

export async function saveTeachModeNoteAction(input: TeachModeScope & { notes: string }) {
  try {
    const current = await getTeachingPeriod({ periodId: input.periodId });
    await assertTeachModeScope(input, current);
    const period = await updateTeachingPeriod({
      periodId: input.periodId,
      title: current.title,
      plannedDate: current.plannedDate?.toISOString() ?? null,
      chapterId: current.chapterId,
      notes: input.notes,
    });
    return { ok: true as const, period };
  } catch (error) {
    return { ok: false as const, message: safeMessage(error, "The teacher note could not be saved.") };
  }
}

export async function updateTeachModeStatusAction(input: TeachModeScope & { status: "COMPLETED" | "SKIPPED" }) {
  try {
    const current = await getTeachingPeriod({ periodId: input.periodId });
    await assertTeachModeScope(input, current);
    const period = await updateTeachingPeriod({
      periodId: input.periodId,
      title: current.title,
      plannedDate: current.plannedDate?.toISOString() ?? null,
      chapterId: current.chapterId,
      status: input.status,
    });
    return { ok: true as const, period };
  } catch (error) {
    return { ok: false as const, message: safeMessage(error, "The lesson status could not be updated.") };
  }
}
