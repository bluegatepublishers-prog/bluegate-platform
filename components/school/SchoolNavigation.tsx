"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, CalendarDays, ChevronDown, ClipboardCheck, GraduationCap, Home, Menu, School, UserRoundCheck, Users, UsersRound } from "lucide-react";

const people = [
  ["Students", "/school-dashboard/people?tab=students", GraduationCap],
  ["Teachers", "/school-dashboard/people?tab=teachers", UserRoundCheck],
  ["Staff", "/school-dashboard/people?tab=staff", Users],
  ["Parents", "/school-dashboard/people?tab=parents", UsersRound],
  ["Mentors", "/school-dashboard/people/mentors", UsersRound],
] as const;
const academics = [
  ["Academic Year", "/school-dashboard/academics?tab=years", CalendarDays],
  ["Classes & Sections", "/school-dashboard/academics?tab=classes", School],
  ["Subjects", "/school-dashboard/academics?tab=subjects", BookOpen],
  ["Teacher Assignments", "/school-dashboard/academics?tab=assignments", UserRoundCheck],
  ["Books & Resources", "/school-dashboard/academics?tab=content", BookOpen],
  ["Teaching Plans", "/school-dashboard/teaching-plans", BookOpen],
  ["Timetable", "/school-dashboard/timetable", CalendarDays],
] as const;
const operations = [
  ["Planner & Calendar", "/school-dashboard/planner", CalendarDays],
  ["Attendance", "/school-dashboard/attendance", ClipboardCheck],
  ["Notices", "/school-dashboard/planner?view=notices", UsersRound],
  ["Reports", "/school-dashboard/reports", BarChart3],
] as const;
// "Planner" remains a canonical School navigation label.

type Props = { mobile?: boolean; schoolName: string; logoUrl?: string | null; branding: { shortName: string }; features: Record<string, boolean> };

export default function SchoolNavigation({ mobile = false, schoolName, logoUrl, branding, features }: Props) {
  const pathname = usePathname();
  const isHome = pathname === "/school-dashboard";
  const visibleAcademics = academics.filter(([label]) => label !== "Timetable" || features.TIMETABLE);
  const link = (label: string, href: string, Icon: typeof Home, nested = false) => {
    const base = href.split("?")[0];
    const active = base === "/school-dashboard" ? pathname === base : pathname.startsWith(base);
    return <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${nested ? "py-1.5 text-sm" : "min-h-10 py-2 text-sm font-semibold"} ${active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}><Icon className="h-4 w-4 shrink-0" /><span>{label}</span></Link>;
  };
  const links = <>
    {link("Home", "/school-dashboard", Home)}
    <details open={isHome || pathname.startsWith("/school-dashboard/people")} className="group"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Users className="h-4 w-4" /><span className="flex-1">People</span><ChevronDown className="h-4 w-4 group-open:rotate-180" /></summary><div className="ml-4 space-y-0.5 border-l border-slate-200 pl-2">{people.map(([label, href, Icon]) => link(label, href, Icon, true))}</div></details>
    <details open={isHome || pathname.startsWith("/school-dashboard/academics") || pathname.startsWith("/school-dashboard/teaching-plans") || pathname.startsWith("/school-dashboard/timetable")} className="group"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><GraduationCap className="h-4 w-4" /><span className="flex-1">Academics</span><ChevronDown className="h-4 w-4 group-open:rotate-180" /></summary><div className="ml-4 space-y-0.5 border-l border-slate-200 pl-2">{visibleAcademics.map(([label, href, Icon]) => link(label, href, Icon, true))}</div></details>
    <details open={isHome || pathname.startsWith("/school-dashboard/planner") || pathname.startsWith("/school-dashboard/attendance") || pathname.startsWith("/school-dashboard/reports")} className="group"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><ClipboardCheck className="h-4 w-4" /><span className="flex-1">School Operations</span><ChevronDown className="h-4 w-4 group-open:rotate-180" /></summary><div className="ml-4 space-y-0.5 border-l border-slate-200 pl-2">{operations.map(([label, href, Icon]) => link(label, href, Icon, true))}</div></details>
  </>;
  if (mobile) return <details className="border-b bg-white lg:hidden"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-3 px-3 text-sm font-bold"><Menu className="h-4 w-4" />School menu</summary><nav aria-label="School navigation" className="max-h-[70vh] space-y-1 overflow-y-auto p-2">{links}</nav></details>;
  return <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex"><div className="p-4"><div className="flex items-center gap-2">{logoUrl ? <Image src={logoUrl} alt="School logo" width={36} height={36} className="rounded-lg object-contain" /> : <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">{schoolName.slice(0, 2).toUpperCase()}</span>}<div><p className="text-lg font-bold text-blue-700">{branding.shortName}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">School portal</p></div></div></div><nav aria-label="School navigation" className="flex-1 space-y-1 overflow-y-auto px-2">{links}</nav><div className="m-3 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 text-xs"><strong className="text-blue-700">Need help?</strong><p className="mt-1 text-[11px] text-slate-500">Contact your publisher administrator.</p></div></aside>;
}
