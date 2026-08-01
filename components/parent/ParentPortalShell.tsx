"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { CalendarDays, CircleHelp, Home, LogOut, Menu, School2, Settings2, Users2, UserRound } from "lucide-react";
import { useState, useTransition } from "react";

const primaryNav = [
  { href: "/parent-dashboard", label: "Home", icon: Home },
  { href: "/parent-dashboard/children", label: "My Children", icon: Users2 },
  { href: "/parent-dashboard/notices", label: "Notices", icon: CircleHelp },
  { href: "/parent-dashboard/planner", label: "Planner", icon: CalendarDays },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/parent-dashboard" ? pathname === href : pathname.startsWith(href);
}

export default function ParentPortalShell({ parentName, children }: { parentName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    startTransition(async () => {
      await signOut({ callbackUrl: "/parent-login" });
    });
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-950 px-5 py-6 text-white lg:flex">
        <Link href="/parent-dashboard" className="flex items-center gap-3 rounded-3xl bg-white/5 px-4 py-4 shadow-sm backdrop-blur-sm">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-950/30">
            <School2 className="h-6 w-6" />
          </span>
          <span>
            <strong className="block text-lg">Bluegate</strong>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-300">Parent Portal</span>
          </span>
        </Link>

        <nav className="mt-10 space-y-2" aria-label="Parent navigation">
          {primaryNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-h-14 items-center gap-4 rounded-2xl px-4 font-semibold transition ${active ? "bg-white text-slate-950 shadow-lg shadow-black/10" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-xl shadow-blue-950/20">
          <p className="text-sm font-semibold text-blue-50/90">Approved parent access only</p>
          <p className="mt-3 text-lg font-semibold leading-7">Friendly, read-only views for child learning progress, notices and planning.</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen((value) => !value)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
                aria-label="Toggle menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">Bluegate Parent Portal</p>
                <h1 className="text-lg font-bold text-slate-950 sm:text-xl">Welcome, {parentName}</h1>
              </div>
            </div>

            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm outline-none">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">{parentName.slice(0, 1).toUpperCase()}</span>
                <span className="hidden text-left sm:block">
                  <strong className="block text-sm text-slate-950">{parentName}</strong>
                  <span className="text-xs text-slate-500">Account menu</span>
                </span>
              </summary>
              <div className="absolute right-0 mt-3 w-60 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-950">Account</p>
                  <p className="text-xs text-slate-500">Read-only links and support options</p>
                </div>
                <div className="p-2">
                  <Link href="/parent-dashboard/profile" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><UserRound className="h-4 w-4" />My Profile</Link>
                  <Link href="/parent-dashboard/settings" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Settings2 className="h-4 w-4" />Settings</Link>
                  <Link href="/parent-dashboard/help" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><CircleHelp className="h-4 w-4" />Help</Link>
                  <button type="button" onClick={handleLogout} disabled={pending} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"><LogOut className="h-4 w-4" />{pending ? "Signing out…" : "Logout"}</button>
                </div>
              </div>
            </details>
          </div>
        </header>

        {mobileOpen ? (
          <div className="border-b border-slate-200 bg-white px-4 py-4 lg:hidden">
            <div className="grid gap-2 sm:grid-cols-2">
              {primaryNav.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 font-semibold ${active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"}`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden" aria-label="Parent navigation mobile">
          <div className="grid grid-cols-4 gap-2">
            {primaryNav.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link key={href} href={href} className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] font-semibold ${active ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}>
                  <Icon className="h-5 w-5" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}