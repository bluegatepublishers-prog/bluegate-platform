"use client";

import Link from "next/link";
import { Bell, CalendarDays, ChevronDown, LogOut, School, Settings } from "lucide-react";

import LogoutButton from "@/components/dashboard/LogoutButton";

export default function SchoolHeader({ name, schoolName, academicYear }: { name: string; schoolName: string; academicYear?: string | null }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div>
        <p className="hidden text-[0.68rem] font-bold uppercase tracking-[0.18em] text-blue-700 sm:block">School workspace</p>
        <h1 className="text-lg font-bold tracking-[-0.015em] text-slate-950 sm:text-xl">Good morning, {name.split(" ")[0] || "Principal"}</h1>
        <p className="mt-1 hidden text-sm text-slate-500 sm:block">Here&apos;s what&apos;s happening at your school today.</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden items-center gap-2 border-r border-slate-200 pr-4 text-sm sm:flex">
          <CalendarDays className="h-5 w-5 text-blue-700" aria-hidden="true" />
          <span><small className="block text-slate-400">Academic year</small><strong className="text-slate-800">{academicYear ?? "Not selected"}</strong></span>
        </div>
        <button aria-label="Notifications" className="relative rounded-lg p-2.5 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <Bell className="h-5 w-5 text-slate-700" aria-hidden="true" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:gap-3 sm:px-3 sm:py-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{schoolName.slice(0, 1)}</span>
            <strong className="hidden max-w-40 truncate text-sm text-slate-800 md:block">{schoolName}</strong>
            <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
          </summary>
          <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            {[
              ["School Profile", "/school-dashboard/profile", School],
              ["Access & Permissions", "/school-dashboard/settings", Settings],
            ].map(([label, href, Icon]) => <Link key={String(href)} href={String(href)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Icon className="h-4 w-4" aria-hidden="true" />{String(label)}</Link>)}
            <div className="mt-2 border-t border-slate-100 pt-2"><span className="flex items-center gap-3 px-3 py-1 text-sm text-red-600"><LogOut className="h-4 w-4" aria-hidden="true" /><LogoutButton /></span></div>
          </div>
        </details>
      </div>
    </header>
  );
}
