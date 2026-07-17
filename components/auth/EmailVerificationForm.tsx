"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  resendEmailVerificationAction,
  verifyEmailAction,
} from "@/app/account-security-actions";
import { INITIAL_ACCOUNT_SECURITY_STATE } from "@/lib/account-security-state";

export default function EmailVerificationForm({
  maskedEmail,
  backPath,
}: {
  maskedEmail: string;
  backPath: string;
}) {
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyEmailAction,
    INITIAL_ACCOUNT_SECURITY_STATE,
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendEmailVerificationAction,
    INITIAL_ACCOUNT_SECURITY_STATE,
  );
  const state = resendState.message ? resendState : verifyState;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-blue-50 p-5 text-blue-950">
        <p className="font-bold">Check your email</p>
        <p className="mt-2 text-sm">We sent a six-digit code to {maskedEmail}. It expires after 10 minutes.</p>
      </div>
      {verifyState.ok ? (
        <div className="space-y-5 rounded-2xl bg-emerald-50 p-5 text-emerald-900">
          <p className="font-bold">{verifyState.message}</p>
          <Link className="inline-flex rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white" href={verifyState.loginPath ?? "/portal"}>Continue to sign in</Link>
        </div>
      ) : (
        <>
          <form action={verifyAction} className="space-y-5">
            <label className="block text-sm font-semibold text-slate-700">Verification code
              <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="mt-2 w-full rounded-xl border px-4 py-3 text-center text-2xl tracking-[0.5em]" />
            </label>
            <button disabled={verifyPending} className="w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-60">{verifyPending ? "Verifying…" : "Verify email"}</button>
          </form>
          <form action={resendAction}>
            <button disabled={resendPending} className="w-full rounded-xl border border-blue-200 px-5 py-3 font-bold text-blue-700 disabled:opacity-60">{resendPending ? "Sending…" : "Resend code"}</button>
          </form>
        </>
      )}
      {state.message && !verifyState.ok ? <p role="status" className={`rounded-xl p-4 text-sm font-semibold ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{state.message}</p> : null}
      <Link className="block text-center text-sm font-bold text-blue-700" href={backPath}>Back to signup or activation</Link>
    </div>
  );
}
