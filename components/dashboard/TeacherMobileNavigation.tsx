"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { teacherNavigation } from "@/components/dashboard/Sidebar";

type TeacherMobileNavigationProps = { features: Record<string, boolean>; attendanceVisible?: boolean };

export default function TeacherMobileNavigation({ features }: TeacherMobileNavigationProps) {
  const pathname = usePathname();
  const visible = teacherNavigation.filter((item) => item.name !== "Planner" || features.PLANNER !== false);
  return <nav aria-label="Teacher mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white px-2 py-2 lg:hidden"><div className="grid grid-cols-4 gap-1">{visible.map(({ name, href, icon: Icon }) => { const active = href === "/teacher-dashboard" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold ${active ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"}`}><Icon className="h-5 w-5" /><span className="max-w-full truncate">{name}</span></Link>; })}</div></nav>;
}