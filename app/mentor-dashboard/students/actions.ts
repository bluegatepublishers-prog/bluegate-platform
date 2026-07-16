"use server";

import { revalidatePath } from "next/cache";
import { createMentorNote, launchMentorStudentAi, recordMentorRemedialReview } from "@/lib/mentor-dashboard";

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
