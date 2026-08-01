"use server";

import { revalidatePath } from "next/cache";
import {
  cancelMentorSession,
  completeMentorSession,
  createMentorNote,
  launchMentorStudentAi,
  recordMentorRemedialReview,
  reviseMentorNote,
  scheduleMentorSession,
} from "@/lib/mentor-dashboard";

function value(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }

export async function createMentorNoteAction(formData: FormData) {
  const studentId = value(formData, "studentId");
  await createMentorNote({ studentId, type: value(formData, "type"), body: formData.get("body") });
  revalidatePath(`/mentor-dashboard/students/${studentId}`);
  revalidatePath("/mentor-dashboard");
}

export async function mentorRemedialAction(formData: FormData) {
  const studentId = value(formData, "studentId"), action = value(formData, "action");
  if (action !== "REVIEW" && action !== "RECOMMEND_COMPLETION") throw new Error("This mentor action is unavailable.");
  await recordMentorRemedialReview({ studentId, planId: value(formData, "planId"), action });
  revalidatePath(`/mentor-dashboard/students/${studentId}`);
  revalidatePath("/mentor-dashboard");
}

export async function launchStudentAiAction(formData: FormData) {
  const studentId = value(formData, "studentId");
  await launchMentorStudentAi(studentId);
  revalidatePath(`/mentor-dashboard/students/${studentId}`);
  revalidatePath("/mentor-dashboard");
}

export async function scheduleMentorSessionAction(formData: FormData) {
  const studentId = value(formData, "studentId");
  const scheduledAt = new Date(value(formData, "scheduledAt"));
  const durationRaw = value(formData, "durationMinutes");
  await scheduleMentorSession({
    studentId,
    topic: value(formData, "topic"),
    scheduledAt,
    durationMinutes: durationRaw ? Number.parseInt(durationRaw, 10) : undefined,
  });
  revalidatePath(`/mentor-dashboard/students/${studentId}/sessions`);
  revalidatePath("/mentor-dashboard/sessions");
  revalidatePath("/mentor-dashboard");
}

export async function completeMentorSessionAction(formData: FormData) {
  const studentId = value(formData, "studentId");
  await completeMentorSession({
    studentId,
    sessionId: value(formData, "sessionId"),
    summary: value(formData, "summary"),
  });
  revalidatePath(`/mentor-dashboard/students/${studentId}/sessions`);
  revalidatePath("/mentor-dashboard/sessions");
  revalidatePath("/mentor-dashboard");
}

export async function cancelMentorSessionAction(formData: FormData) {
  const studentId = value(formData, "studentId");
  await cancelMentorSession({
    studentId,
    sessionId: value(formData, "sessionId"),
    reason: value(formData, "reason"),
  });
  revalidatePath(`/mentor-dashboard/students/${studentId}/sessions`);
  revalidatePath("/mentor-dashboard/sessions");
  revalidatePath("/mentor-dashboard");
}

export async function reviseMentorNoteAction(formData: FormData) {
  const studentId = value(formData, "studentId");
  await reviseMentorNote({
    studentId,
    noteId: value(formData, "noteId"),
    type: value(formData, "type"),
    body: value(formData, "body"),
  });
  revalidatePath(`/mentor-dashboard/students/${studentId}/notes`);
  revalidatePath("/mentor-dashboard/notes");
  revalidatePath("/mentor-dashboard");
}
