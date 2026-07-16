"use server";

import { activateStudentAccount, createPendingSchool, createPendingTeacher, OnboardingError } from "@/lib/onboarding";
import type { OnboardingState } from "@/lib/onboarding-policy";
import { activateParentInvitation, ParentOnboardingError } from "@/lib/parent-onboarding";

const data = (form: FormData) => Object.fromEntries(form.entries()) as Record<string, unknown>;
const failed = (error: unknown): OnboardingState => ({ ok: false, message: error instanceof OnboardingError ? error.message : "The request could not be completed. Please try again." });

export async function schoolSignupAction(_: OnboardingState, form: FormData): Promise<OnboardingState> {
  try { await createPendingSchool(data(form)); return { ok: true, message: "Your school request was submitted. A publisher administrator must approve it before sign-in." }; }
  catch (error) { return failed(error); }
}

export async function teacherSignupAction(_: OnboardingState, form: FormData): Promise<OnboardingState> {
  try { await createPendingTeacher(data(form)); return { ok: true, message: "Your teacher request was submitted to the selected school. You can sign in after the school approves it." }; }
  catch (error) { return failed(error); }
}

export async function studentActivationAction(_: OnboardingState, form: FormData): Promise<OnboardingState> {
  try { const result = await activateStudentAccount(data(form)); return { ok: true, message: `Account activated. Sign in with the email held by your school (${result.email}).` }; }
  catch (error) { return failed(error); }
}

export async function parentActivationAction(_: OnboardingState, form: FormData): Promise<OnboardingState> {
  try { const result = await activateParentInvitation(data(form)); return { ok: true, message: `Account activated for ${result.email}. Your school must approve the relationship before child progress appears.` }; }
  catch (error) { return { ok: false, message: error instanceof ParentOnboardingError ? error.message : "The request could not be completed. Please try again." }; }
}
