"use client";

import Link from "next/link";
import { Bell, CalendarDays, ChevronDown, LogOut, School, Settings } from "lucide-react";

import LogoutButton from "@/components/dashboard/LogoutButton";

export default function SchoolHeader({ name, schoolName, academicYear }: { name: string; schoolName: string; academicYear?: string | null }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-24 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div>
        <h1 className="text-xl font-bold text-slate-950">Good Morning, {name.split(" ")[0] || "Principal"}!</h1>
        <p className="mt-1 text-sm text-slate-500">Here&apos;s what&apos;s happening at your school today.</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 border-r pr-4 text-sm sm:flex">
          <CalendarDays className="h-5 w-5 text-blue-700" />
          <span>
            <small className="block text-slate-400">Academic Year</small>
            <strong>{academicYear ?? "Not selected"}</strong>
          </span>
        </div>
        <button aria-label="Notifications" className="relative rounded-xl p-3 hover:bg-slate-100">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border px-3 py-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 font-bold text-blue-700">{schoolName.slice(0, 1)}</span>
            <strong className="hidden max-w-40 truncate text-sm md:block">{schoolName}</strong>
            <ChevronDown className="h-4 w-4" />
          </summary>
          <div className="absolute right-0 mt-2 w-60 rounded-2xl border bg-white p-2 shadow-xl">
            {[
              ["School Profile", "/school-dashboard/profile", School],
              ["Access & Permissions", "/school-dashboard/settings", Settings],
            ].map(([label, href, Icon]) => (
              <Link key={String(href)} href={String(href)} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-slate-50">
                <Icon className="h-4 w-4" />
                {String(label)}
              </Link>
            ))}
            <div className="mt-2 border-t pt-2">
              <span className="flex items-center gap-3 px-3 py-1 text-sm text-red-600">
                <LogOut className="h-4 w-4" />
                <LogoutButton />
              </span>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
