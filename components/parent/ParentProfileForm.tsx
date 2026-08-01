"use client";

import { useActionState } from "react";

import { saveParentProfile, type ParentActionState } from "@/app/parent-dashboard/parent-actions";

const initialState: ParentActionState = { ok: false, message: "" };

export default function ParentProfileForm({ name, email, phone }: { name: string; email: string; phone: string | null }) {
  const [state, action, pending] = useActionState(saveParentProfile, initialState);

  return (
    <form action={action} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-bold text-slate-950">My Profile</h2>
        <p className="mt-2 text-slate-600">Update the permitted account fields. Linked children and school relationships are managed by the school.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">Name<input name="name" defaultValue={name} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600" required /></label>
        <label className="block text-sm font-semibold text-slate-700">Email<input name="email" type="email" defaultValue={email} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600" required /></label>
        <label className="block text-sm font-semibold text-slate-700">Mobile number<input name="phone" defaultValue={phone ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600" /></label>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><p className="font-semibold text-slate-950">Password</p><p className="mt-2">Use the reset flow from the login page to change your password securely.</p></div>
      </div>

      {state.message ? <p className={`rounded-2xl p-4 text-sm font-semibold ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href="/forgot-password" className="text-sm font-semibold text-blue-700">Change password</a>
        <button disabled={pending} className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save Profile"}</button>
      </div>
    </form>
  );
}