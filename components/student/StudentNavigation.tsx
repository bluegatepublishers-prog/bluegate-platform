"use client";

import Link from "next/link";
import { CalendarDays, Home, Megaphone, School } from "lucide-react";
import { usePathname } from "next/navigation";

export const STUDENT_NAV_ITEMS = [
  { label: "Home", href: "/student-dashboard", icon: Home },
  { label: "My Class", href: "/student-dashboard/my-class", icon: School },
  { label: "Notices", href: "/student-dashboard/notices", icon: Megaphone },
  { label: "Planner", href: "/student-dashboard/planner", icon: CalendarDays },
] as const;

export default function StudentNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const links = STUDENT_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
    const active = href === "/student-dashboard" ? pathname === href : pathname.startsWith(href);
    return <Link key={href} href={href} className={`flex items-center justify-center gap-3 rounded-2xl px-4 py-3 font-semibold transition ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}><Icon className="h-5 w-5" /><span>{label}</span></Link>;
  });
  if (mobile) return <nav aria-label="Student navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-white/95 p-2 backdrop-blur lg:hidden">{links}</nav>;
  return <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-100 bg-white p-5 lg:flex"><nav aria-label="Student navigation" className="space-y-2 pt-8">{links}</nav><div className="mt-auto rounded-3xl bg-gradient-to-br from-blue-50 to-emerald-50 p-5 text-center"><div className="text-4xl" aria-hidden>📚🌱</div><p className="mt-3 text-sm font-medium leading-6 text-slate-600">Every day is a new chance to learn something amazing.</p></div></aside>;
}
