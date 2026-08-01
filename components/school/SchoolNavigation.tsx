"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, CalendarDays, ChevronDown, GraduationCap, Home, Menu, School, UserRoundCheck, Users } from "lucide-react";

const people = [
  ["Students", "/school-dashboard/people?tab=students", GraduationCap],
  ["Teachers", "/school-dashboard/people?tab=teachers", UserRoundCheck],
  ["Parents", "/school-dashboard/people?tab=parents", Users],
  ["Staff", "/school-dashboard/people?tab=staff", Users],
] as const;
const academics = [
  ["Academic Year", "/school-dashboard/academics?tab=years", CalendarDays],
  ["Classes & Sections", "/school-dashboard/academics?tab=classes", School],
  ["Subjects", "/school-dashboard/academics?tab=subjects", BookOpen],
  ["Teacher Assignments", "/school-dashboard/academics?tab=assignments", UserRoundCheck],
  ["Attendance", "/school-dashboard/academics?tab=attendance", CalendarDays],
  ["Books & Resources", "/school-dashboard/academics?tab=content", BookOpen],
] as const;

type Props = { mobile?: boolean; schoolName: string; logoUrl?: string | null; branding: { shortName: string }; features: Record<string, boolean> };

export default function SchoolNavigation({ mobile = false, schoolName, logoUrl, branding }: Props) {
  const pathname = usePathname();
  const link = (label: string, href: string, Icon: typeof Home, nested = false) => {
    const base = href.split("?")[0];
    const active = base === "/school-dashboard" ? pathname === base : pathname.startsWith(base);
    return <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-4 ${nested ? "py-2 text-sm" : "min-h-12 py-3 font-semibold"} ${active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}><Icon className="h-5 w-5 shrink-0"/><span>{label}</span></Link>;
  };
  const links = <>
    {link("Home", "/school-dashboard", Home)}
    <details open={pathname.startsWith("/school-dashboard/people")} className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 font-semibold text-slate-700 hover:bg-blue-50"><Users className="h-5 w-5"/><span className="flex-1">People</span><ChevronDown className="h-4 w-4 group-open:rotate-180"/></summary>
      <div className="ml-5 space-y-1 border-l border-slate-200 pl-3">{people.map(([label, href, Icon]) => link(label, href, Icon, true))}</div>
    </details>
    <details open={pathname.startsWith("/school-dashboard/academics")} className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 font-semibold text-slate-700 hover:bg-blue-50"><GraduationCap className="h-5 w-5"/><span className="flex-1">Academics</span><ChevronDown className="h-4 w-4 group-open:rotate-180"/></summary>
      <div className="ml-5 space-y-1 border-l border-slate-200 pl-3">{academics.map(([label, href, Icon]) => link(label, href, Icon, true))}</div>
    </details>
    {link("Planner", "/school-dashboard/planner", CalendarDays)}
    {link("Reports", "/school-dashboard/reports", BarChart3)}
  </>;
  if (mobile) return <details className="border-b bg-white lg:hidden"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 font-bold"><Menu className="h-5 w-5"/>School menu</summary><nav className="max-h-[70vh] space-y-2 overflow-y-auto p-3">{links}</nav></details>;
  return <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex"><div className="p-6"><div className="flex items-center gap-3">{logoUrl ? <Image src={logoUrl} alt="School logo" width={48} height={48} className="rounded-xl object-contain"/> : <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-600 font-bold text-white">{schoolName.slice(0,2).toUpperCase()}</span>}<div><p className="text-xl font-bold text-blue-700">{branding.shortName}</p><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">School portal</p></div></div></div><nav className="flex-1 space-y-2 overflow-y-auto px-3">{links}</nav><div className="m-5 rounded-2xl bg-blue-50 p-4 text-sm"><strong className="text-blue-700">Need Help?</strong><p className="mt-1 text-xs text-slate-500">Contact your publisher administrator.</p></div></aside>;
}
