"use server";

import { revalidatePath } from "next/cache";
import { AttendanceStatus, AttendanceSessionType } from "@prisma/client";

import {
  requestAttendanceCorrection,
  saveTeacherAttendanceDraft,
  submitTeacherAttendance,
} from "@/lib/attendance";

type AttendanceActionResult = {
  ok: boolean;
  message: string;
};

type AttendanceRowPayload = {
  enrollmentId: string;
  status: AttendanceStatus;
  remark?: string;
  checkInTime?: string;
};

function revalidate(sectionId: string) {
  revalidatePath(`/teacher-dashboard/classes/${sectionId}/attendance`);
  revalidatePath(`/teacher-dashboard/classes/${sectionId}`);
}

function asText(value: unknown, maxLength = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function parseSessionType(value: unknown) {
  const text = asText(value, 40);
  return Object.values(AttendanceSessionType).includes(text as AttendanceSessionType)
    ? (text as AttendanceSessionType)
    : AttendanceSessionType.DAILY;
}

function parseRows(rows: unknown): AttendanceRowPayload[] {
  if (!Array.isArray(rows)) throw new Error("Attendance payload is invalid.");
  const validStatuses = new Set<AttendanceStatus>(Object.values(AttendanceStatus));

  return rows.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("Attendance row is invalid.");
    const record = raw as {
      enrollmentId?: unknown;
      status?: unknown;
      remark?: unknown;
      checkInTime?: unknown;
    };

    const enrollmentId = asText(record.enrollmentId, 191);
    const statusText = asText(record.status, 40);
    if (!enrollmentId) throw new Error("Enrollment ID is required.");
    if (!validStatuses.has(statusText as AttendanceStatus)) {
      throw new Error("Invalid attendance status.");
    }

    const remark = asText(record.remark, 500);
    const checkInTime = asText(record.checkInTime, 5);

    return {
      enrollmentId,
      status: statusText as AttendanceStatus,
      remark: remark || undefined,
      checkInTime: checkInTime || undefined,
    };
  });
}

function parseJsonPayload(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    throw new Error("Attendance payload could not be parsed.");
  }
}

async function runAttendanceSave(input: {
  sectionId: string;
  date: string;
  sessionType: AttendanceSessionType;
  period?: string;
  sectionSubjectId: string;
  rows: AttendanceRowPayload[];
  mode: "draft" | "submit";
}) {
  if (input.mode === "draft") {
    await saveTeacherAttendanceDraft({
      sectionId: input.sectionId,
      date: input.date,
      sessionType: input.sessionType,
      period: input.period,
      sectionSubjectId: input.sectionSubjectId,
      records: input.rows,
    });
  } else {
    await submitTeacherAttendance({
      sectionId: input.sectionId,
      date: input.date,
      sessionType: input.sessionType,
      period: input.period,
      sectionSubjectId: input.sectionSubjectId,
      records: input.rows,
    });
  }
}

export async function saveTeacherAttendanceDraftAction(input: {
  sectionId: string;
  date: string;
  sessionType: string;
  period?: string;
  sectionSubjectId: string;
  rowsJson: string;
}): Promise<AttendanceActionResult> {
  try {
    const sectionId = asText(input.sectionId, 191);
    const sectionSubjectId = asText(input.sectionSubjectId, 191);
    const date = asText(input.date, 40);
    const period = asText(input.period, 32) || undefined;
    if (!sectionId || !sectionSubjectId || !date) {
      return { ok: false, message: "Section, subject, and date are required." };
    }

    const rows = parseRows(parseJsonPayload(input.rowsJson));
    await runAttendanceSave({
      sectionId,
      date,
      sessionType: parseSessionType(input.sessionType),
      period,
      sectionSubjectId,
      rows,
      mode: "draft",
    });
    revalidate(sectionId);
    return { ok: true, message: "Attendance draft saved." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Attendance draft could not be saved.",
    };
  }
}

export async function submitTeacherAttendanceAction(input: {
  sectionId: string;
  date: string;
  sessionType: string;
  period?: string;
  sectionSubjectId: string;
  rowsJson: string;
}): Promise<AttendanceActionResult> {
  try {
    const sectionId = asText(input.sectionId, 191);
    const sectionSubjectId = asText(input.sectionSubjectId, 191);
    const date = asText(input.date, 40);
    const period = asText(input.period, 32) || undefined;
    if (!sectionId || !sectionSubjectId || !date) {
      return { ok: false, message: "Section, subject, and date are required." };
    }

    const rows = parseRows(parseJsonPayload(input.rowsJson));
    await runAttendanceSave({
      sectionId,
      date,
      sessionType: parseSessionType(input.sessionType),
      period,
      sectionSubjectId,
      rows,
      mode: "submit",
    });
    revalidate(sectionId);
    return { ok: true, message: "Attendance submitted." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Attendance could not be submitted.",
    };
  }
}

export async function requestAttendanceCorrectionAction(input: {
  sectionId: string;
  attendanceRecordId: string;
  newStatus: string;
  reason: string;
}): Promise<AttendanceActionResult> {
  try {
    const sectionId = asText(input.sectionId, 191);
    const attendanceRecordId = asText(input.attendanceRecordId, 191);
    const reason = asText(input.reason, 500);
    const statusText = asText(input.newStatus, 40);

    if (!sectionId || !attendanceRecordId || !reason) {
      return { ok: false, message: "Record, reason, and section are required." };
    }

    if (!Object.values(AttendanceStatus).includes(statusText as AttendanceStatus)) {
      return { ok: false, message: "Choose a valid correction status." };
    }

    await requestAttendanceCorrection({
      sectionId,
      attendanceRecordId,
      newStatus: statusText as AttendanceStatus,
      reason,
    });
    revalidate(sectionId);
    return { ok: true, message: "Correction request sent to school for approval." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Correction request failed.",
    };
  }
}
