"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail } from "lucide-react";

import { forgotPasswordAction } from "@/app/account-security-actions";
import { INITIAL_ACCOUNT_SECURITY_STATE } from "@/lib/account-security-state";

export default function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    forgotPasswordAction,
    INITIAL_ACCOUNT_SECURITY_STATE,
  );
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><section className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-xl sm:p-10"><p className="font-bold text-blue-700">Account recovery</p><h1 className="mt-2 text-3xl font-bold">Forgot password</h1><p className="mt-4 leading-7 text-slate-600">Enter your registered email. The response is the same whether or not an eligible account exists.</p><form action={action} className="mt-8 space-y-6"><label className="block font-medium">Email address<div className="relative mt-2"><Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"/><input name="email" type="email" autoComplete="email" required className="w-full rounded-2xl border py-4 pl-12 pr-4 outline-none focus:border-blue-600"/></div></label><button disabled={pending} className="w-full rounded-2xl bg-blue-700 py-4 font-bold text-white disabled:opacity-60">{pending?"Sending…":"Send reset code"}</button></form>{state.message?<p role="status" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-800">{state.message}</p>:null}<Link href="/portal" className="mt-7 block text-center font-bold text-blue-700">Back to portal</Link></section></div>;
}
