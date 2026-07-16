"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartNoAxesCombined, Gauge, UsersRound } from "lucide-react";

const items = [
  { href: "/mentor-dashboard", label: "Dashboard", icon: Gauge },
  { href: "/mentor-dashboard/students", label: "Assigned Students", icon: UsersRound },
  { href: "/mentor-dashboard/reports", label: "Reports", icon: ChartNoAxesCombined },
  { href: "/mentor-dashboard/sessions", label: "Sessions", icon: CalendarDays },
] as const;

export function MentorNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const links = items.map(({ href, label, icon: Icon }) => {
    const active = href === "/mentor-dashboard" ? pathname === href : pathname.startsWith(href);
    return <Link key={href} href={href} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 font-semibold ${active ? "bg-indigo-700 text-white" : "text-slate-700 hover:bg-slate-100"}`}><Icon className="h-5 w-5"/>{label}</Link>;
  });
  if (mobile) return <nav aria-label="Mentor navigation" className="flex gap-2 overflow-x-auto border-b bg-white p-3 lg:hidden">{links}</nav>;
  return <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r bg-white lg:flex"><div className="border-b p-7"><p className="text-xl font-bold text-indigo-800">Bluegate Mentor</p><p className="mt-1 text-sm text-slate-500">Assigned learners only</p></div><nav aria-label="Mentor navigation" className="flex-1 space-y-2 p-5">{links}</nav></aside>;
}
