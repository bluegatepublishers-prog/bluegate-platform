"use server";

import { activateSchoolMentorAccount } from "@/lib/school-mentors";

export type MentorActivationState = { ok: boolean; message: string };

export async function activateMentorAction(reference: string, token: string, _: MentorActivationState, form: FormData): Promise<MentorActivationState> {
  return activateSchoolMentorAccount({ reference, token, password: form.get("password"), confirmation: form.get("confirmPassword") });
}
