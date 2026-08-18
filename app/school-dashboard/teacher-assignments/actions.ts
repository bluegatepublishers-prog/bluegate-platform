"use server";

import { unstable_rethrow } from "next/navigation";

import {
  removeSchoolTeacherAssignments as removeMutation,
  saveSchoolTeacherAssignments as saveMutation,
  SchoolTeacherAssignmentError,
} from "@/lib/school-teacher-assignments";
import type { AssignmentErrorCode } from "@/lib/school-teacher-assignments";

export type AssignmentActionResult =
  | { ok: true; message: string }
  | { ok: false; code: AssignmentErrorCode; message: string; field?: string };

function expectedFailure(error: unknown): AssignmentActionResult | null {
  if (!(error instanceof SchoolTeacherAssignmentError)) return null;
  return { ok: false, code: error.code, message: error.message, field: error.field };
}

export async function saveSchoolTeacherAssignments(
  _previousState: AssignmentActionResult,
  form: FormData,
): Promise<AssignmentActionResult> {
  try {
    await saveMutation(form);
    return { ok: true, message: "Assignment saved." };
  } catch (error) {
    unstable_rethrow(error);
    const safe = expectedFailure(error);
    if (safe) return safe;
    console.error("Unexpected school teacher assignment save failure.", error);
    throw error;
  }
}

export async function removeSchoolTeacherAssignments(
  _previousState: AssignmentActionResult,
  form: FormData,
): Promise<AssignmentActionResult> {
  try {
    await removeMutation(form);
    return { ok: true, message: "Assignment removed." };
  } catch (error) {
    unstable_rethrow(error);
    const safe = expectedFailure(error);
    if (safe) return safe;
    console.error("Unexpected school teacher assignment removal failure.", error);
    throw error;
  }
}
