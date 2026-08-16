"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createPublisher } from "@/app/super-admin/publishers/management-actions";
import { initialPublisherCreateState } from "@/lib/super-admin-publisher-policy";

export default function PublisherCreateForm() {
  const [state, formAction, pending] = useActionState(createPublisher, initialPublisherCreateState);

  return (
    <form action={formAction} className="grid gap-5 rounded-3xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-950">Publisher details</h2>
        <p className="mt-1 text-sm text-slate-500">This creates the tenant and disabled feature permissions only. No user or password is created.</p>
      </div>
      <label className="font-semibold text-slate-800">
        Publisher name
        <input name="name" required maxLength={160} className="mt-2 w-full rounded-xl border px-3 py-2" placeholder="Edora Learning" />
      </label>
      <label className="font-semibold text-slate-800">
        Publisher slug
        <input name="slug" required maxLength={80} pattern="[a-z0-9-]+" className="mt-2 w-full rounded-xl border px-3 py-2" placeholder="edora-learning" />
        <span className="mt-1 block text-xs font-normal text-slate-500">Lowercase letters, numbers, and hyphens.</span>
      </label>
      <label className="font-semibold text-slate-800">
        Short name <span className="font-normal text-slate-500">(optional)</span>
        <input name="shortName" maxLength={60} className="mt-2 w-full rounded-xl border px-3 py-2" />
      </label>
      <label className="font-semibold text-slate-800">
        Support email <span className="font-normal text-slate-500">(optional)</span>
        <input name="supportEmail" type="email" maxLength={254} className="mt-2 w-full rounded-xl border px-3 py-2" />
      </label>
      {state.message ? <p role="alert" className={`rounded-xl p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{state.message}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-60">{pending ? "CreatingÃ¢â‚¬Â¦" : "Create Publisher"}</button>
        <Link href="/super-admin/publishers" className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700">Cancel</Link>
      </div>
    </form>
  );
}
