"use client";

import { useActionState } from "react";

import { INITIAL_STUDENT_PASSWORD_RESET_STATE, resetStudentPasswordAction } from "@/app/school-dashboard/students/account-actions";

export default function StudentPasswordResetPanel({ studentId, loginId }: { studentId: string; loginId: string | null }) {
  const [state, action, pending] = useActionState(resetStudentPasswordAction, INITIAL_STUDENT_PASSWORD_RESET_STATE);
  return (
    <section className="rounded-3xl border bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold">Student login</h2>
      <p className="mt-2 text-slate-600">Login ID: <span className="font-mono font-semibold">{loginId ?? "Not assigned"}</span></p>
      <form action={action} className="mt-4" onSubmit={(event) => { if (!window.confirm("Reset this student’s password and show a new temporary password once?")) event.preventDefault(); }}>
        <input type="hidden" name="studentId" value={studentId} />
        <button type="submit" disabled={pending} className="rounded-xl border border-blue-200 px-4 py-2 font-bold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? "Resetting…" : "Reset student password"}
        </button>
      </form>
      {state.message ? <div role={state.ok ? "status" : "alert"} className={`mt-4 rounded-xl p-4 text-sm ${state.ok ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
        <p className="font-semibold">{state.message}</p>
        {state.ok && state.temporaryPassword ? <p className="mt-3 font-mono text-lg font-bold tracking-wide">{state.temporaryPassword}</p> : null}
        {state.ok ? <p className="mt-2 text-xs">This temporary password is shown once and is not stored in this page after refresh.</p> : null}
      </div> : null}
    </section>
  );
}
