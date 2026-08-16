"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function SuperAdminAccountMenu({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-xs font-bold text-white">{name}</p>
        <p className="text-[10px] text-slate-300">{email}</p>
      </div>
      <button
        type="button"
        onClick={() => startTransition(() => signOut({ callbackUrl: "/super-admin/login" }))}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-100 transition hover:border-red-400 hover:bg-red-950 disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" />
        {pending ? "Signing out…" : "Logout"}
      </button>
    </div>
  );
}
