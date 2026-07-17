"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  completePasswordReset,
  requestPasswordReset,
  resendEmailVerification,
  resendPasswordResetCode,
  verifyEmailCode,
  verifyPasswordResetCode,
} from "@/lib/account-security";
import type { AccountSecurityState } from "@/lib/account-security-state";

const EMAIL_CHALLENGE_COOKIE = "bluegate_email_challenge";
const RESET_CHALLENGE_COOKIE = "bluegate_password_reset";
const RESET_COMPLETION_COOKIE = "bluegate_password_completion";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 10 * 60,
};

export async function verifyEmailAction(
  _: AccountSecurityState,
  form: FormData,
): Promise<AccountSecurityState> {
  const store = await cookies();
  const result = await verifyEmailCode(
    store.get(EMAIL_CHALLENGE_COOKIE)?.value,
    form.get("code"),
  );
  if (result.ok) store.delete(EMAIL_CHALLENGE_COOKIE);
  return result;
}

export async function resendEmailVerificationAction(): Promise<AccountSecurityState> {
  const store = await cookies();
  const reference = store.get(EMAIL_CHALLENGE_COOKIE)?.value;
  const result = await resendEmailVerification(reference);
  if (result.ok && reference) store.set(EMAIL_CHALLENGE_COOKIE, reference, cookieOptions);
  return result;
}

export async function forgotPasswordAction(
  _: AccountSecurityState,
  form: FormData,
): Promise<AccountSecurityState> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const result = await requestPasswordReset(form.get("email"), forwarded);
  (await cookies()).set(RESET_CHALLENGE_COOKIE, result.reference, cookieOptions);
  redirect("/reset-password");
}

export async function verifyResetCodeAction(
  _: AccountSecurityState,
  form: FormData,
): Promise<AccountSecurityState> {
  const store = await cookies();
  const result = await verifyPasswordResetCode(
    store.get(RESET_CHALLENGE_COOKIE)?.value,
    form.get("code"),
  );
  if (!result.ok) return { ...result, stage: "CODE" };
  const reference = store.get(RESET_CHALLENGE_COOKIE)?.value;
  if (reference) store.set(RESET_CHALLENGE_COOKIE, reference, cookieOptions);
  store.set(RESET_COMPLETION_COOKIE, result.completionToken, cookieOptions);
  return { ok: true, message: result.message, stage: "PASSWORD" };
}

export async function resendResetCodeAction(): Promise<AccountSecurityState> {
  const store = await cookies();
  const reference = store.get(RESET_CHALLENGE_COOKIE)?.value;
  const result = await resendPasswordResetCode(reference);
  if (reference) store.set(RESET_CHALLENGE_COOKIE, reference, cookieOptions);
  return result;
}

export async function completePasswordResetAction(
  _: AccountSecurityState,
  form: FormData,
): Promise<AccountSecurityState> {
  const store = await cookies();
  const result = await completePasswordReset(
    store.get(RESET_CHALLENGE_COOKIE)?.value,
    store.get(RESET_COMPLETION_COOKIE)?.value,
    form.get("password"),
    form.get("confirmPassword"),
  );
  if (!result.ok) return { ...result, stage: "PASSWORD" };
  store.delete(RESET_CHALLENGE_COOKIE);
  store.delete(RESET_COMPLETION_COOKIE);
  return { ...result, stage: "DONE" };
}
