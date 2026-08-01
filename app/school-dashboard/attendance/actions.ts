"use server";

import { revalidatePath } from "next/cache";
import { AttendanceLockBehavior, AttendanceMode } from "@prisma/client";

import {
  bulkLockSchoolAttendanceByDate,
  lockSchoolAttendanceSession,
  reviewAttendanceCorrection,
  updateSchoolAttendancePolicy,
} from "@/lib/attendance";

function text(form: FormData, key: string, maxLength = 200) {
  return String(form.get(key) ?? "").trim().slice(0, maxLength);
}

function bool(form: FormData, key: string) {
  return form.get(key) === "on" || form.get(key) === "true";
}

function intValue(form: FormData, key: string, fallback: number) {
  const parsed = Number.parseInt(text(form, key, 10), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function floatValue(form: FormData, key: string, fallback: number) {
  const parsed = Number.parseFloat(text(form, key, 10));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function revalidateAttendancePages() {
  revalidatePath("/school-dashboard");
  revalidatePath("/school-dashboard/academics");
  revalidatePath("/school-dashboard/attendance");
  revalidatePath("/school-dashboard/attendance/settings");
  revalidatePath("/school-dashboard/reports");
}

export async function lockAttendanceSessionAction(form: FormData): Promise<void> {
  const sessionId = text(form, "sessionId", 191);
  if (!sessionId) throw new Error("Session ID is required.");

  await lockSchoolAttendanceSession(sessionId);
  revalidateAttendancePages();
  revalidatePath(`/school-dashboard/attendance/sessions/${sessionId}`);
}

export async function bulkLockAttendanceDateAction(form: FormData): Promise<void> {
  const date = text(form, "date", 40);
  if (!date) throw new Error("Date is required.");

  await bulkLockSchoolAttendanceByDate({ date });
  revalidateAttendancePages();
}

export async function reviewAttendanceCorrectionAction(form: FormData): Promise<void> {
  const correctionId = text(form, "correctionId", 191);
  const decision = text(form, "decision", 20);
  const decisionNote = text(form, "decisionNote", 500);

  if (!correctionId || (decision !== "APPROVE" && decision !== "REJECT")) {
    throw new Error("Correction ID and decision are required.");
  }

  await reviewAttendanceCorrection({
    correctionId,
    decision: decision as "APPROVE" | "REJECT",
    decisionNote: decisionNote || undefined,
  });
  revalidateAttendancePages();
}

export async function saveSchoolAttendancePolicyAction(form: FormData): Promise<void> {
  const attendanceModeRaw = text(form, "attendanceMode", 20);
  const lockBehaviorRaw = text(form, "lockBehavior", 40);
  const workingDays = [1, 2, 3, 4, 5, 6, 7].filter((day) => bool(form, `workingDay${day}`));

  if (!Object.values(AttendanceMode).includes(attendanceModeRaw as AttendanceMode)) {
    throw new Error("Choose a valid attendance mode.");
  }
  if (!Object.values(AttendanceLockBehavior).includes(lockBehaviorRaw as AttendanceLockBehavior)) {
    throw new Error("Choose a valid lock behavior.");
  }

  await updateSchoolAttendancePolicy({
    attendanceMode: attendanceModeRaw as AttendanceMode,
    lockBehavior: lockBehaviorRaw as AttendanceLockBehavior,
    lockHour: intValue(form, "lockHour", 18),
    correctionWindowDays: intValue(form, "correctionWindowDays", 7),
    minimumAttendancePercentage: floatValue(form, "minimumAttendancePercentage", 75),
    lateThresholdMinutes: intValue(form, "lateThresholdMinutes", 10),
    halfDayThresholdMinutes: intValue(form, "halfDayThresholdMinutes", 180),
    allowTeacherDraftSaving: bool(form, "allowTeacherDraftSaving"),
    requireRemarkAbsent: bool(form, "requireRemarkAbsent"),
    requireRemarkLate: bool(form, "requireRemarkLate"),
    requireRemarkHalfDay: bool(form, "requireRemarkHalfDay"),
    requireRemarkExcused: bool(form, "requireRemarkExcused"),
    workingDays,
    excludeHolidays: bool(form, "excludeHolidays"),
  });
  revalidateAttendancePages();
}
