"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Lock, Mail, ShieldCheck } from "lucide-react";

import { changePasswordAction } from "@/app/account-security-actions";
import { INITIAL_ACCOUNT_SECURITY_STATE } from "@/lib/account-security-state";

export default function AccountSecurityPanel({
  email,
  emailVerified,
}: {
  email: string | null;
  emailVerified: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    changePasswordAction,
    INITIAL_ACCOUNT_SECURITY_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state.ok]);

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-blue-700" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">Account &amp; Security</h2>
          <p className="text-sm text-slate-500">Manage your sign-in email status and password.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Mail className="h-4 w-4" /> Email
          </div>
          <p className="mt-2 break-all font-semibold text-slate-900">{email ?? "Not provided"}</p>
          <p className={`mt-1 text-xs font-semibold ${!email ? "text-slate-600" : emailVerified ? "text-emerald-700" : "text-amber-700"}`}>
            {!email ? "No email on this school-managed account" : emailVerified ? "Verified" : "Verification pending"}
          </p>
          <p className="mt-2 text-xs text-slate-500">Email changes remain subject to the verified-email workflow.</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Lock className="h-4 w-4" /> Password
          </div>
          <p className="mt-2 text-sm text-slate-600">Change your password using your current password.</p>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="mt-3 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white"
          >
            {open ? "Close" : "Change Password"}
          </button>
        </div>
      </div>

      {open ? (
        <form ref={formRef} action={action} className="mt-5 space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-4" aria-label="Change password">
          <label className="block text-sm font-semibold text-slate-700">Current password
            <input name="currentPassword" type="password" autoComplete="current-password" required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">New password
            <input name="newPassword" type="password" autoComplete="new-password" minLength={10} maxLength={128} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Confirm password
            <input name="confirmPassword" type="password" autoComplete="new-password" minLength={10} maxLength={128} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" />
          </label>
          {state.message ? <p role={state.ok ? "status" : "alert"} className={`rounded-xl p-3 text-sm font-semibold ${state.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{state.message}</p> : null}
          <button type="submit" disabled={pending} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Changing…" : "Change Password"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
