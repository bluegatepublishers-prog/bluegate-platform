"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, ClipboardCheck, GraduationCap, LayoutDashboard, School, User, UserRoundCheck, Users } from "lucide-react";

const items=[
  {label:"Dashboard",href:"/school-dashboard",icon:LayoutDashboard},
  {label:"Academic Years",href:"/school-dashboard/academic-years",icon:CalendarDays},
  {label:"Classes & Sections",href:"/school-dashboard/classes",icon:School},
  {label:"Students",href:"/school-dashboard/students",icon:GraduationCap},
  {label:"Teacher Assignments",href:"/school-dashboard/teacher-assignments",icon:UserRoundCheck},
  {label:"Resources",href:"/school-dashboard/resources",icon:BookOpen},
  {label:"Inspection Requests",href:"/school-dashboard/inspection-requests",icon:ClipboardCheck},
  {label:"Profile",href:"/school-dashboard/profile",icon:User},
];
export default function SchoolNavigation({mobile=false,schoolName}:{mobile?:boolean;schoolName:string}) { const pathname=usePathname(); const links=<>{items.map(({label,href,icon:Icon})=>{const active=href==="/school-dashboard"?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 font-semibold ${active?"bg-blue-600 text-white":"text-slate-700 hover:bg-slate-100"}`}><Icon className="h-5 w-5"/>{label}</Link>;})}</>; if(mobile)return <nav className="flex gap-2 overflow-x-auto border-b bg-white p-3 lg:hidden" aria-label="School navigation">{links}</nav>; return <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r bg-white lg:flex"><div className="border-b p-7"><div className="flex items-center gap-3"><span className="rounded-xl bg-blue-600 p-3 text-white"><School className="h-6 w-6"/></span><div><p className="font-bold">Bluegate</p><p className="text-xs text-slate-500">School Portal</p></div></div><p className="mt-5 truncate text-sm font-semibold text-slate-700">{schoolName}</p></div><nav className="flex-1 space-y-2 overflow-y-auto p-5">{links}</nav></aside>; }
