"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronDown, LogOut, Menu, Settings } from "lucide-react";
import { signOut } from "next-auth/react";

interface AdminHeaderProps {
  userLabel: string;
  onOpenMenu: () => void;
}

export default function AdminHeader({ userLabel, onOpenMenu }: AdminHeaderProps) {
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const initials = useMemo(() => {
    const parts = userLabel.split(" ").filter(Boolean);
    const head = `${parts[0]?.[0] ?? "A"}${parts[1]?.[0] ?? ""}`;
    return head.toUpperCase();
  }, [userLabel]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

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

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 pr-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Open admin account menu"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
              {initials}
            </span>
            <span className="hidden sm:inline">{userLabel}</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {menuOpen ? (
            <div role="menu" className="absolute right-0 z-40 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <Link href="/admin" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100" role="menuitem">
                Home
              </Link>
              <Link href="/admin/publisher-settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100" role="menuitem">
                <Settings className="h-4 w-4" />
                Publisher Settings
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isPending}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" />
                {isPending ? "Signing out..." : "Sign out"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
