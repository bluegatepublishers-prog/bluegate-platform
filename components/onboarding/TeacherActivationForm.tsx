"use client";
import Link from "next/link";
import { useActionState } from "react";
import { activateTeacherAction, type TeacherActivationState } from "@/app/(auth)/teacher-activate/actions";
const initial: TeacherActivationState = { ok: false, message: "" };
export default function TeacherActivationForm({ reference, token }: { reference: string; token: string }) {
  const [state, action, pending] = useActionState(activateTeacherAction.bind(null, reference, token), initial);
  if (state.ok) return <div className="rounded-xl bg-emerald-50 p-4 text-emerald-900"><p className="font-semibold">{state.message}</p><Link href="/teacher-login" className="mt-4 inline-flex h-9 items-center rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white">Go to Teacher Login</Link></div>;
  return <form action={action} className="mt-6 space-y-4"><label className="block text-sm font-semibold">New password<input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} className="mt-1 h-9 w-full rounded-lg border px-3"/></label><label className="block text-sm font-semibold">Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} className="mt-1 h-9 w-full rounded-lg border px-3"/></label>{state.message ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-800">{state.message}</p> : null}<button disabled={pending} className="h-9 w-full rounded-lg bg-blue-700 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Activating…" : "Activate Teacher Account"}</button></form>;
}
