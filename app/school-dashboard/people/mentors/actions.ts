"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assignSchoolMentorStudent,
  createSchoolMentor,
  removeSchoolMentorStudent,
  resendSchoolMentorActivation,
  setSchoolMentorActive,
} from "@/lib/school-mentors";

const message = (error: unknown) => error instanceof Error ? error.message : "The mentor request could not be completed.";
const detailPath = (mentorId: string) => `/school-dashboard/people/mentors/${encodeURIComponent(mentorId)}`;

export async function createSchoolMentorAction(form: FormData) {
  let destination: string;
  try {
    const result = await createSchoolMentor(Object.fromEntries(form.entries()));
    const status = result.accountAlreadyReady
      ? "Existing mentor account connected successfully."
      : result.invitationSent
        ? "Mentor created and activation email sent."
        : "Mentor created, but the activation email could not be delivered. Use Resend activation.";
    destination = `${detailPath(result.mentorId)}?message=${encodeURIComponent(status)}`;
  } catch (error) {
    destination = `/school-dashboard/people/mentors/new?error=${encodeURIComponent(message(error))}`;
  }
  redirect(destination);
}

export async function setSchoolMentorActiveAction(mentorId: string, form: FormData) {
  let status: string;
  try {
    const active = String(form.get("active") ?? "") === "true";
    await setSchoolMentorActive(mentorId, active);
    status = active ? "Mentor activated." : "Mentor deactivated and school assignments removed.";
  } catch (error) { status = message(error); }
  revalidatePath("/school-dashboard/people/mentors");
  revalidatePath(detailPath(mentorId));
  redirect(`${detailPath(mentorId)}?message=${encodeURIComponent(status)}`);
}

export async function assignSchoolMentorStudentAction(mentorId: string, form: FormData) {
  let status: string;
  try {
    await assignSchoolMentorStudent(mentorId, String(form.get("studentId") ?? ""));
    status = "Student assigned successfully.";
  } catch (error) { status = message(error); }
  revalidatePath(detailPath(mentorId));
  redirect(`${detailPath(mentorId)}?message=${encodeURIComponent(status)}`);
}

export async function removeSchoolMentorStudentAction(mentorId: string, assignmentId: string) {
  let status: string;
  try { await removeSchoolMentorStudent(mentorId, assignmentId); status = "Student assignment removed."; }
  catch (error) { status = message(error); }
  revalidatePath(detailPath(mentorId));
  redirect(`${detailPath(mentorId)}?message=${encodeURIComponent(status)}`);
}

export async function resendSchoolMentorActivationAction(mentorId: string) {
  let status: string;
  try { await resendSchoolMentorActivation(mentorId); status = "A new activation email was sent."; }
  catch (error) { status = message(error); }
  revalidatePath(detailPath(mentorId));
  redirect(`${detailPath(mentorId)}?message=${encodeURIComponent(status)}`);
}
