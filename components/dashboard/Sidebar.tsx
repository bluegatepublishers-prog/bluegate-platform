"use client";

import Link from "next/link";
import { CalendarDays, Home, Library, MessageCircle, School, GraduationCap, CircleHelp } from "lucide-react";
import { usePathname } from "next/navigation";

export const teacherNavigation = [
  { name: "Home", href: "/teacher-dashboard", icon: Home },
  { name: "My Classes", href: "/teacher-dashboard/classes", icon: School },
  { name: "Planner", href: "/teacher-dashboard/planner", icon: CalendarDays },
  { name: "Messages", href: "/teacher-dashboard/messages", icon: MessageCircle },
  { name: "Resources", href: "/teacher-dashboard/resources", icon: Library },
] as const;

export default function Sidebar({ branding }: { teacherName: string; schoolName: string; branding: { shortName: string; portalTitle: string; primaryColor: string }; features: Record<string, boolean> }) {
  const pathname = usePathname();
  return <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-100 bg-white p-5 lg:flex"><Link href="/teacher-dashboard" className="flex items-center gap-3 px-3 py-2"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white"><GraduationCap className="h-7 w-7" /></span><span><strong className="block text-xl text-blue-700">{branding.shortName}</strong><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Teacher Portal</span></span></Link><nav aria-label="Teacher navigation" className="mt-12 space-y-3">{teacherNavigation.map(({ name, href, icon: Icon }) => { const active = href === "/teacher-dashboard" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`flex min-h-14 items-center gap-4 rounded-2xl px-4 font-semibold transition ${active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}><Icon className="h-6 w-6" />{name}</Link>; })}</nav><div className="mt-auto rounded-3xl bg-gradient-to-br from-blue-50 to-violet-50 p-5"><p className="font-semibold leading-6 text-slate-700">Great teachers inspire, empower and build futures.</p><div className="mt-4 text-center text-5xl" aria-hidden>👩‍🏫📚🌱</div></div><Link href="/teacher-dashboard/settings" className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 font-semibold text-blue-700"><CircleHelp className="h-5 w-5" />Need Help?</Link></aside>;
}
