"use client";

import { useTransition } from "react";
import { LogOut, Menu } from "lucide-react";
import { signOut } from "next-auth/react";

interface AdminHeaderProps {
  userLabel: string;
  onOpenMenu: () => void;
}

export default function AdminHeader({ userLabel, onOpenMenu }: AdminHeaderProps) {
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut({ callbackUrl: "/teacher-login" });
    });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-700 transition hover:bg-slate-50 lg:hidden"
            aria-label="Open admin navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              Admin
            </p>
            <p className="truncate text-sm font-medium text-slate-600 sm:text-base">
              {userLabel}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isPending}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{isPending ? "Signing out..." : "Sign out"}</span>
        </button>
      </div>
    </header>
  );
}
