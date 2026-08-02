"use client";

import Link from "next/link";
import { useActionState } from "react";
import { activateMentorAction, type MentorActivationState } from "@/app/(auth)/mentor-activate/actions";

const initial: MentorActivationState = { ok: false, message: "" };

export default function MentorActivationForm({ reference, token }: { reference: string; token: string }) {
  const [state, action, pending] = useActionState(activateMentorAction.bind(null, reference, token), initial);
  if (state.ok) return <div className="rounded-2xl bg-emerald-50 p-6 text-emerald-900"><p className="font-bold">{state.message}</p><Link href="/mentor-login" className="mt-5 inline-flex rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">Go to Mentor Login</Link></div>;
  return <form action={action} className="mt-8 space-y-5"><label className="block font-semibold">New password<input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} className="mt-2 w-full rounded-xl border px-4 py-3"/></label><label className="block font-semibold">Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} className="mt-2 w-full rounded-xl border px-4 py-3"/></label>{state.message?<p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-800">{state.message}</p>:null}<button disabled={pending} className="w-full rounded-xl bg-blue-700 py-3 font-bold text-white disabled:opacity-60">{pending?"Activating…":"Activate Mentor Account"}</button></form>;
}
