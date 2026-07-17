"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { activateStudentAccount, createPendingSchool, createPendingTeacher, OnboardingError } from "@/lib/onboarding";
import type { OnboardingState } from "@/lib/onboarding-policy";
import { activateParentInvitation, ParentOnboardingError } from "@/lib/parent-onboarding";

const data = (form: FormData) => Object.fromEntries(form.entries()) as Record<string, unknown>;
const failed = (error: unknown): OnboardingState => ({ ok: false, message: error instanceof OnboardingError ? error.message : "The request could not be completed. Please try again." });

async function continueToEmailVerification(result: {
  challengeReference: string;
  maskedEmail: string;
  deliveryState: "SENT" | "FAILED" | "NOT_CONFIGURED";
}): Promise<OnboardingState> {
  (await cookies()).set("bluegate_email_challenge", result.challengeReference, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  if (result.deliveryState !== "SENT") {
    return {
      ok: false,
      message: `Your account remains unverified. We could not send a code to ${result.maskedEmail}. Open verification and try resend shortly.`,
      verificationReady: true,
    };
  }
  redirect("/verify-email");
}

export async function schoolSignupAction(_: OnboardingState, form: FormData): Promise<OnboardingState> {
  let result;
  try { result = await createPendingSchool(data(form)); }
  catch (error) { return failed(error); }
  return continueToEmailVerification(result);
}

export async function teacherSignupAction(_: OnboardingState, form: FormData): Promise<OnboardingState> {
  let result;
  try { result = await createPendingTeacher(data(form)); }
  catch (error) { return failed(error); }
  return continueToEmailVerification(result);
}

export async function studentActivationAction(_: OnboardingState, form: FormData): Promise<OnboardingState> {
  let result;
  try { result = await activateStudentAccount(data(form)); }
  catch (error) { return failed(error); }
  return continueToEmailVerification(result);
}

export async function parentActivationAction(_: OnboardingState, form: FormData): Promise<OnboardingState> {
  try { const result = await activateParentInvitation(data(form)); return { ok: true, message: `Account activated for ${result.email}. Your school must approve the relationship before child progress appears.` }; }
  catch (error) { return { ok: false, message: error instanceof ParentOnboardingError ? error.message : "The request could not be completed. Please try again." }; }
}
