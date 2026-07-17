"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  completePasswordResetAction,
  resendResetCodeAction,
  verifyResetCodeAction,
} from "@/app/account-security-actions";
import { INITIAL_ACCOUNT_SECURITY_STATE } from "@/lib/account-security-state";

export default function ResetPasswordForm() {
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyResetCodeAction, INITIAL_ACCOUNT_SECURITY_STATE);
  const [resendState, resendAction, resendPending] = useActionState(resendResetCodeAction, INITIAL_ACCOUNT_SECURITY_STATE);
  const [passwordState, passwordAction, passwordPending] = useActionState(completePasswordResetAction, INITIAL_ACCOUNT_SECURITY_STATE);
  const stage = passwordState.stage === "DONE" ? "DONE" : verifyState.stage === "PASSWORD" || passwordState.stage === "PASSWORD" ? "PASSWORD" : "CODE";
  const status = stage === "PASSWORD" ? passwordState.message || verifyState.message : resendState.message || verifyState.message;

  return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><section className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-xl sm:p-10"><p className="font-bold text-blue-700">Account recovery</p><h1 className="mt-2 text-3xl font-bold">Reset password</h1>{stage==="CODE"?<><p className="mt-4 leading-7 text-slate-600">If an eligible account exists, use the six-digit code sent by email. Codes expire after 10 minutes.</p><form action={verifyAction} className="mt-8 space-y-5"><label className="block font-medium">Reset code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="mt-2 w-full rounded-xl border px-4 py-3 text-center text-2xl tracking-[0.5em]"/></label><button disabled={verifyPending} className="w-full rounded-xl bg-blue-700 py-3 font-bold text-white disabled:opacity-60">{verifyPending?"Verifying…":"Verify code"}</button></form><form action={resendAction} className="mt-4"><button disabled={resendPending} className="w-full rounded-xl border border-blue-200 py-3 font-bold text-blue-700 disabled:opacity-60">{resendPending?"Sending…":"Resend reset code"}</button></form></>:stage==="PASSWORD"?<><p className="mt-4 leading-7 text-slate-600">Create a new password containing 10–128 characters, including letters and numbers.</p><form action={passwordAction} className="mt-8 space-y-5"><label className="block font-medium">New password<input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} className="mt-2 w-full rounded-xl border px-4 py-3"/></label><label className="block font-medium">Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} className="mt-2 w-full rounded-xl border px-4 py-3"/></label><button disabled={passwordPending} className="w-full rounded-xl bg-blue-700 py-3 font-bold text-white disabled:opacity-60">{passwordPending?"Updating…":"Set new password"}</button></form></>:<div className="mt-8 space-y-5 rounded-2xl bg-emerald-50 p-5 text-emerald-900"><p className="font-bold">{passwordState.message}</p><Link href="/portal" className="inline-flex rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">Return to sign in</Link></div>}{status&&stage!=="DONE"?<p role="status" className={`mt-5 rounded-xl p-4 text-sm font-semibold ${(stage==="PASSWORD"?passwordState.ok:resendState.ok||verifyState.ok)?"bg-emerald-50 text-emerald-800":"bg-rose-50 text-rose-800"}`}>{status}</p>:null}<Link href="/forgot-password" className="mt-7 block text-center font-bold text-blue-700">Start over</Link></section></div>;
}
