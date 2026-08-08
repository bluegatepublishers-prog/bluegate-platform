"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, CalendarDays, ChevronDown, GraduationCap, Home, Menu, School, UserRoundCheck, Users, UsersRound } from "lucide-react";

const people = [
  ["Students", "/school-dashboard/people?tab=students", GraduationCap],
  ["Teachers", "/school-dashboard/people?tab=teachers", UserRoundCheck],
  ["Parents", "/school-dashboard/people?tab=parents", Users],
  ["Mentors", "/school-dashboard/people/mentors", UsersRound],
  ["Staff", "/school-dashboard/people?tab=staff", Users],
] as const;
// Legacy compatibility route: ["Attendance", "/school-dashboard/academics?tab=attendance"].
const academics = [
  ["Academic Year", "/school-dashboard/academics?tab=years", CalendarDays],
  ["Classes & Sections", "/school-dashboard/academics?tab=classes", School],
  ["Subjects", "/school-dashboard/academics?tab=subjects", BookOpen],
  ["Teacher Assignments", "/school-dashboard/academics?tab=assignments", UserRoundCheck],
  ["Books & Resources", "/school-dashboard/academics?tab=content", BookOpen],
] as const;
type Props = { mobile?: boolean; schoolName: string; logoUrl?: string | null; branding: { shortName: string }; features: Record<string, boolean> };
export default function SchoolNavigation({ mobile = false, schoolName, logoUrl, branding, features }: Props) {
  const pathname = usePathname();
  const visiblePeople = people.filter(([label]) => (label !== "Parents" || features.PARENT_PORTAL) && (label !== "Mentors" || features.MENTOR_PORTAL));
  const link = (label: string, href: string, Icon: typeof Home, nested = false) => {
    const base = href.split("?")[0];
    const active = base === "/school-dashboard" ? pathname === base : pathname.startsWith(base);
    return <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 ${nested ? "py-1.5 text-sm" : "min-h-10 py-2 text-sm font-semibold"} ${active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}><Icon className="h-4 w-4 shrink-0"/><span>{label}</span></Link>;
  };
  const links = <>
    {link("Home", "/school-dashboard", Home)}
    <details open={pathname.startsWith("/school-dashboard/people")} className="group"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"><Users className="h-4 w-4"/><span className="flex-1">People</span><ChevronDown className="h-4 w-4 group-open:rotate-180"/></summary><div className="ml-4 space-y-0.5 border-l border-slate-200 pl-2">{visiblePeople.map(([label, href, Icon]) => link(label, href, Icon, true))}</div></details>
    <details open={pathname.startsWith("/school-dashboard/academics")} className="group"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"><GraduationCap className="h-4 w-4"/><span className="flex-1">Academics</span><ChevronDown className="h-4 w-4 group-open:rotate-180"/></summary><div className="ml-4 space-y-0.5 border-l border-slate-200 pl-2">{academics.map(([label, href, Icon]) => link(label, href, Icon, true))}</div></details>
    {features.PLANNER ? link("Planner", "/school-dashboard/planner", CalendarDays) : null}
    {features.ATTENDANCE ? link("Attendance", "/school-dashboard/attendance", CalendarDays) : null}
    {features.REPORTS ? link("Reports", "/school-dashboard/reports", BarChart3) : null}
  </>;
  if (mobile) return <details className="border-b bg-white lg:hidden"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-3 px-3 text-sm font-bold"><Menu className="h-4 w-4"/>School menu</summary><nav className="max-h-[70vh] space-y-1 overflow-y-auto p-2">{links}</nav></details>;
  return <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex"><div className="p-4"><div className="flex items-center gap-2">{logoUrl ? <Image src={logoUrl} alt="School logo" width={36} height={36} className="rounded-lg object-contain"/> : <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">{schoolName.slice(0,2).toUpperCase()}</span>}<div><p className="text-lg font-bold text-blue-700">{branding.shortName}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">School portal</p></div></div></div><nav className="flex-1 space-y-1 overflow-y-auto px-2">{links}</nav><div className="m-3 rounded-xl bg-blue-50 p-3 text-xs"><strong className="text-blue-700">Need Help?</strong><p className="mt-1 text-[11px] text-slate-500">Contact your publisher administrator.</p></div></aside>;
}
