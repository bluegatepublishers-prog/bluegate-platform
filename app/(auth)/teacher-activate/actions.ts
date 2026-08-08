"use server";
import { activateSchoolTeacherAccount } from "@/lib/school-teacher-activation";
export type TeacherActivationState = { ok: boolean; message: string };
export async function activateTeacherAction(reference: string, token: string, _: TeacherActivationState, form: FormData): Promise<TeacherActivationState> {
  return activateSchoolTeacherAccount({ reference, token, password: form.get("password"), confirmation: form.get("confirmPassword") });
}
