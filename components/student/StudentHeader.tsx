"use client";

import Link from "next/link";
import { Bell, ChevronDown, CircleHelp, Settings, UserRound } from "lucide-react";
import LogoutButton from "@/components/dashboard/LogoutButton";

export default function StudentHeader({ name, classSection }: { name: string; classSection: string }) {
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <header className="sticky top-0 z-30 flex min-h-20 items-center justify-end gap-3 border-b border-slate-100 bg-white/90 px-4 backdrop-blur sm:px-8"><button aria-label="Notifications" className="relative rounded-full p-3 text-slate-600 hover:bg-slate-100"><Bell className="h-5 w-5" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500" /></button><details className="group relative"><summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl p-2 hover:bg-slate-50"><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-blue-700">{initials}</span><span className="hidden text-left sm:block"><strong className="block text-sm text-slate-900">{name}</strong><span className="text-xs text-slate-500">{classSection}</span></span><ChevronDown className="h-4 w-4 text-slate-400" /></summary><div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-white p-2 shadow-xl"><Link href="/student-dashboard/profile" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-slate-50"><UserRound className="h-4 w-4" />My Profile</Link><span className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-400"><Settings className="h-4 w-4" />Settings</span><span className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-400"><CircleHelp className="h-4 w-4" />Help</span><div className="mt-1 border-t pt-1"><LogoutButton /></div></div></details></header>;
}
