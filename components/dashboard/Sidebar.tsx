"use client";

import Link from "next/link";
import { CircleHelp, GraduationCap, Home, MessageCircle, School, CalendarDays } from "lucide-react";
import { usePathname } from "next/navigation";

export const teacherNavigation = [
  { name: "Home", href: "/teacher-dashboard", icon: Home },
  { name: "My Classes", href: "/teacher-dashboard/classes", icon: School },
  { name: "Planner", href: "/teacher-dashboard/planner", icon: CalendarDays },
  { name: "Messages", href: "/teacher-dashboard/messages", icon: MessageCircle },
] as const;

type SidebarProps = { teacherName: string; schoolName: string; branding: { shortName: string; portalTitle: string; primaryColor: string }; features: Record<string, boolean>; attendanceVisible?: boolean };

export default function Sidebar({ teacherName, schoolName, branding, features }: SidebarProps) {
  const pathname = usePathname();
  const navigationItems = teacherNavigation.filter((item) => item.name !== "Planner" || features.PLANNER !== false);
  return <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-100 bg-white p-5 lg:flex">
    <Link href="/teacher-dashboard" className="flex items-center gap-3 px-3 py-2"><span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ backgroundColor: branding.primaryColor }}><GraduationCap className="h-7 w-7" /></span><span className="min-w-0"><strong className="block truncate text-xl" style={{ color: branding.primaryColor }}>{branding.shortName}</strong><span className="block truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">{branding.portalTitle || "Teacher Portal"}</span></span></Link>
    <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"><p className="truncate text-sm font-bold text-slate-800">{teacherName}</p><p className="mt-1 truncate text-xs text-slate-500">{schoolName}</p></div>
    <nav aria-label="Teacher navigation" className="mt-8 space-y-3">{navigationItems.map(({ name, href, icon: Icon }) => { const active = href === "/teacher-dashboard" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`flex min-h-14 items-center gap-4 rounded-2xl px-4 font-semibold transition ${active ? "bg-teal-50 text-teal-700" : "text-slate-700 hover:bg-slate-50"}`}><Icon className="h-6 w-6" />{name}</Link>; })}</nav>
    <div className="mt-auto rounded-3xl bg-gradient-to-br from-teal-50 to-violet-50 p-5"><p className="font-semibold leading-6 text-slate-700">Plan clearly. Teach confidently. Keep every class moving.</p><div className="mt-4 text-center text-4xl" aria-hidden="true">✦</div></div>
    <Link href="/teacher-dashboard/settings" className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 font-semibold text-teal-700"><CircleHelp className="h-5 w-5" />Need Help?</Link>
  </aside>;
}