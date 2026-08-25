"use server";

import { revalidatePath } from "next/cache";
import {
  addManualQuestionToAssessment,
  addPublisherQuestionsToAssessment,
  addTeacherQuestionsToAssessment,
  addSnapshotQuestionsToAssessment,
  archiveTeacherAssessment,
  auditTeacherAssessmentDenial,
  closeTeacherAssessment,
  createTeacherAssessment,
  duplicateAssessmentQuestion,
  duplicateTeacherAssessment,
  completeTeacherAssessmentGrading,
  moveAssessmentQuestion,
  publishTeacherAssessment,
  publishTeacherAssessmentResult,
  publishTeacherAssessmentResultsBulk,
  reopenTeacherAssessmentGrading,
  removeAssessmentQuestion,
  saveTeacherAssessmentResponseGrade,
  restoreTeacherAssessment,
  shuffleAssessmentQuestions,
  TeacherAssessmentError,
  updateAssessmentQuestionMarks,
  updateTeacherAssessmentSettings,
} from "@/lib/teacher-assessments";

function refresh(sectionId: string, assessmentId?: string) {
  revalidatePath(`/teacher-dashboard/classes/${sectionId}/assessments`);
  if (assessmentId) {
    revalidatePath(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}`);
    revalidatePath(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/preview`);
    revalidatePath(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading`);
    revalidatePath(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/analytics`);
  }
}

async function safely<T>(
  sectionId: string,
  action:
    | "classroom.assessment.create"
    | "classroom.assessment.update"
    | "classroom.assessment.publish"
    | "classroom.assessment.archive"
    | "classroom.assessment.restore"
    | "classroom.assessment.duplicate"
    | "classroom.assessment.grading.save"
    | "classroom.assessment.grading.complete"
    | "classroom.assessment.grading.reopen"
    | "classroom.assessment.results.publish",
  operation: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const data = await operation();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof TeacherAssessmentError) {
      if (error.code === "NOT_FOUND") {
        await auditTeacherAssessmentDenial({ sectionId, action });
      }
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "The assessment could not be saved." };
  }
}

export async function createAssessmentAction(sectionId: string, formData: FormData) {
  const created = await safely(sectionId, "classroom.assessment.create", () =>
    createTeacherAssessment(sectionId, formData),
  );
  if (!created.ok) return created;

  const intent = String(formData.get("intent") ?? "DRAFT").toUpperCase();
  if (intent === "PUBLISH") {
    const expectedMarksRaw = Number(String(formData.get("maximumMarks") ?? "").trim());
    const expectedMarks = Number.isInteger(expectedMarksRaw) ? expectedMarksRaw : null;
    const published = await safely(sectionId, "classroom.assessment.publish", () =>
      publishTeacherAssessment(sectionId, created.data.assessmentId, expectedMarks),
    );
    if (!published.ok) {
      refresh(sectionId, created.data.assessmentId);
      return {
        ok: false as const,
        message: `Draft created. ${published.message}`,
        assessmentId: created.data.assessmentId,
      };
    }
  }

  refresh(sectionId, created.data.assessmentId);
  return { ok: true as const, assessmentId: created.data.assessmentId };
}

export async function updateAssessmentSettingsAction(sectionId: string, assessmentId: string, formData: FormData) {
  const result = await safely(sectionId, "classroom.assessment.update", () =>
    updateTeacherAssessmentSettings(sectionId, assessmentId, formData),
  );
  if (result.ok) refresh(sectionId, assessmentId);
}

function questionBankFilters(formData: FormData) {
  return {
    chapterId: String(formData.get("questionBankChapterId") ?? "").trim() || undefined,
    moduleId: String(formData.get("questionBankModuleId") ?? "").trim() || undefined,
    exerciseId: String(formData.get("questionBankExerciseId") ?? "").trim() || undefined,
    questionType: String(formData.get("questionBankType") ?? "").trim() || undefined,
    difficulty: String(formData.get("questionBankDifficulty") ?? "").trim() || undefined,
  };
}

export async function addSelectedQuestionsAction(sectionId: string, assessmentId: string, formData: FormData) {
  const filters = questionBankFilters(formData);
  const questionIds = formData.getAll("questionId").map((value) => String(value).trim()).filter(Boolean);
  const teacherQuestionIds = formData.getAll("teacherQuestionId").map((value) => String(value).trim()).filter(Boolean);
  const publisherResult = questionIds.length
    ? await safely(sectionId, "classroom.assessment.update", () => addPublisherQuestionsToAssessment(sectionId, assessmentId, questionIds, filters))
    : { ok: true as const, data: { added: 0 } };
  if (!publisherResult.ok) return;
  const teacherResult = teacherQuestionIds.length
    ? await safely(sectionId, "classroom.assessment.update", () => addTeacherQuestionsToAssessment(sectionId, assessmentId, teacherQuestionIds, filters))
    : { ok: true as const, data: { added: 0 } };
  if (teacherResult.ok) refresh(sectionId, assessmentId);
}
export async function addPublisherQuestionsAction(sectionId: string, assessmentId: string, formData: FormData) {
  const questionIds = formData
    .getAll("questionId")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const result = await safely(sectionId, "classroom.assessment.update", () =>
    addPublisherQuestionsToAssessment(sectionId, assessmentId, questionIds, questionBankFilters(formData)),
  );
  if (result.ok) refresh(sectionId, assessmentId);
}

export async function addMyQuestionsAction(sectionId: string, assessmentId: string, formData: FormData) {
  const teacherQuestionIds = formData
    .getAll("teacherQuestionId")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const result = await safely(sectionId, "classroom.assessment.update", () =>
    addTeacherQuestionsToAssessment(sectionId, assessmentId, teacherQuestionIds, questionBankFilters(formData)),
  );
  if (result.ok) refresh(sectionId, assessmentId);
}

export async function addPreviousAssessmentQuestionsAction(sectionId: string, assessmentId: string, formData: FormData) {
  const snapshotIds = formData
    .getAll("snapshotId")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const result = await safely(sectionId, "classroom.assessment.update", () =>
    addSnapshotQuestionsToAssessment(sectionId, assessmentId, snapshotIds),
  );
  if (result.ok) refresh(sectionId, assessmentId);
}

export async function addManualQuestionAction(sectionId: string, assessmentId: string, formData: FormData) {
  const result = await safely(sectionId, "classroom.assessment.update", () =>
    addManualQuestionToAssessment(sectionId, assessmentId, formData),
  );
  if (result.ok) refresh(sectionId, assessmentId);
}

export async function updateQuestionMarksAction(sectionId: string, assessmentId: string, assessmentQuestionId: string, formData: FormData) {
  const marks = Number(String(formData.get("marks") ?? "").trim());
  const result = await safely(sectionId, "classroom.assessment.update", () =>
    updateAssessmentQuestionMarks(sectionId, assessmentId, assessmentQuestionId, marks),
  );
  if (result.ok) refresh(sectionId, assessmentId);
}

export async function removeQuestionAction(sectionId: string, assessmentId: string, assessmentQuestionId: string) {
  const result = await safely(sectionId, "classroom.assessment.update", () =>
    removeAssessmentQuestion(sectionId, assessmentId, assessmentQuestionId),
  );
  if (result.ok) refresh(sectionId, assessmentId);
}

export async function moveQuestionAction(sectionId: string, assessmentId: string, assessmentQuestionId: string, direction: "UP" | "DOWN") {
  const result = await safely(sectionId, "classroom.assessment.update", () =>
    moveAssessmentQuestion(sectionId, assessmentId, assessmentQuestionId, direction),
  );
  if (result.ok) refresh(sectionId, assessmentId);
}

export async function shuffleQuestionsAction(sectionId: string, assessmentId: string) {
  const result = await safely(sectionId, "classroom.assessment.update", () =>
    shuffleAssessmentQuestions(sectionId, assessmentId),
  );
  if (result.ok) refresh(sectionId, assessmentId);
}

export async function duplicateQuestionAction(sectionId: string, assessmentId: string, assessmentQuestionId: string) {
  const result = await safely(sectionId, "classroom.assessment.update", () =>
    duplicateAssessmentQuestion(sectionId, assessmentId, assessmentQuestionId),
  );
  if (result.ok) refresh(sectionId, assessmentId);
}

export async function publishAssessmentAction(sectionId: string, assessmentId: string, formData: FormData) {
  const expectedMarksRaw = Number(String(formData.get("maximumMarks") ?? "").trim());
  const expectedMarks = Number.isInteger(expectedMarksRaw) ? expectedMarksRaw : null;
  const result = await safely(sectionId, "classroom.assessment.publish", () =>
    publishTeacherAssessment(sectionId, assessmentId, expectedMarks),
  );
  if (result.ok) refresh(sectionId, assessmentId);
}

export async function duplicateAssessmentAction(sectionId: string, assessmentId: string) {
  const result = await safely(sectionId, "classroom.assessment.duplicate", () =>
    duplicateTeacherAssessment(sectionId, assessmentId),
  );
  if (result.ok) refresh(sectionId, result.data.assessmentId);
}

export async function archiveAssessmentAction(sectionId: string, assessmentId: string) {
  const result = await safely(sectionId, "classroom.assessment.archive", () =>
    archiveTeacherAssessment(sectionId, assessmentId),
  );
  if (result.ok) refresh(sectionId, assessmentId);
}

export async function restoreAssessmentAction(sectionId: string, assessmentId: string) {
  const result = await safely(sectionId, "classroom.assessment.restore", () =>
    restoreTeacherAssessment(sectionId, assessmentId),
  );
  if (result.ok) refresh(sectionId, assessmentId);
}

export async function closeAssessmentAction(sectionId: string, assessmentId: string) {
  const result = await safely(sectionId, "classroom.assessment.update", () =>
    closeTeacherAssessment(sectionId, assessmentId),
  );
  if (result.ok) refresh(sectionId, assessmentId);
}

export async function saveAssessmentGradingDraftAction(
  sectionId: string,
  assessmentId: string,
  attemptId: string,
  formData: FormData,
) {
  const responseId = String(formData.get("responseId") ?? "").trim();
  const feedback = String(formData.get("feedback") ?? "").trim();
  const marksAwarded = Number(String(formData.get("marksAwarded") ?? "").trim());
  const result = await safely(sectionId, "classroom.assessment.grading.save", () =>
    saveTeacherAssessmentResponseGrade({
      sectionId,
      assessmentId,
      attemptId,
      responseId,
      marksAwarded,
      feedback,
    }),
  );
  if (result.ok) {
    revalidatePath(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading/${attemptId}`);
    refresh(sectionId, assessmentId);
  }
  return result;
}

export async function completeAssessmentGradingAction(sectionId: string, assessmentId: string, attemptId: string) {
  const result = await safely(sectionId, "classroom.assessment.grading.complete", () =>
    completeTeacherAssessmentGrading({ sectionId, assessmentId, attemptId }),
  );
  if (result.ok) {
    revalidatePath(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading/${attemptId}`);
    refresh(sectionId, assessmentId);
  }
  return result;
}

export async function reopenAssessmentGradingAction(
  sectionId: string,
  assessmentId: string,
  attemptId: string,
  formData: FormData,
) {
  const reason = String(formData.get("reason") ?? "").trim();
  const result = await safely(sectionId, "classroom.assessment.grading.reopen", () =>
    reopenTeacherAssessmentGrading({ sectionId, assessmentId, attemptId, reason }),
  );
  if (result.ok) {
    revalidatePath(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading/${attemptId}`);
    refresh(sectionId, assessmentId);
  }
  return result;
}

export async function publishAssessmentResultAction(sectionId: string, assessmentId: string, attemptId: string) {
  const result = await safely(sectionId, "classroom.assessment.results.publish", () =>
    publishTeacherAssessmentResult({ sectionId, assessmentId, attemptId }),
  );
  if (result.ok) {
    revalidatePath(`/teacher-dashboard/classes/${sectionId}/assessments/${assessmentId}/grading/${attemptId}`);
    refresh(sectionId, assessmentId);
  }
  return result;
}

export async function publishAssessmentResultsBulkAction(sectionId: string, assessmentId: string) {
  const result = await safely(sectionId, "classroom.assessment.results.publish", () =>
    publishTeacherAssessmentResultsBulk({ sectionId, assessmentId }),
  );
  if (result.ok) refresh(sectionId, assessmentId);
  return result;
}
