"use client";

import Link from "next/link";
import { Bell, ChevronDown, CircleHelp, Settings, User } from "lucide-react";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

const headings: Array<[string, string, string]> = [
  ["/teacher-dashboard/classes", "My Classes", "Manage your classes, lessons and students in one place."],
  ["/teacher-dashboard/planner", "Planner", "Plan lessons and keep your academic year on track."],
  ["/teacher-dashboard/messages", "Messages", "Stay connected with your assigned classes."],
  ["/teacher-dashboard/resources", "Resources", "Find entitled teaching materials for your classes."],
  ["/teacher-dashboard/attendance", "Attendance", "Mark and review attendance for your assigned classes."],
  ["/teacher-dashboard/question-bank", "Question Bank", "Create and reuse your private teacher questions."],
  ["/teacher-dashboard/reports", "Results & Reports", "Review persisted learning analytics for assigned learners."],
  ["/teacher-dashboard", "Home", "Everything you need to teach today."],
];

export default function Header({ teacherName, schoolName, academicYear, designation }: { teacherName: string; schoolName?: string; academicYear?: string | null; designation?: string }) {
  const pathname = usePathname(); const heading = headings.find(([path]) => path === "/teacher-dashboard" ? pathname === path : pathname.startsWith(path)) ?? headings[7]; const initials = teacherName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <header className="sticky top-0 z-30 flex min-h-24 items-center justify-between gap-4 border-b border-slate-100 bg-white/95 px-4 backdrop-blur sm:px-8"><div className="min-w-0"><p className="hidden text-[0.68rem] font-bold uppercase tracking-[0.18em] text-teal-700 sm:block">Teacher Dashboard</p><h1 className="truncate text-2xl font-bold text-slate-950">{heading[1]}</h1><p className="mt-1 hidden text-sm text-slate-500 sm:block">{heading[2]}</p><p className="mt-1 truncate text-xs text-slate-500">{schoolName ?? "School workspace"}{academicYear ? ` · ${academicYear}` : " · Academic year not selected"}</p></div><div className="flex items-center gap-3"><Link href="/teacher-dashboard/notifications" aria-label="Notifications" className="relative rounded-full p-3 text-slate-600 hover:bg-slate-100"><Bell className="h-5 w-5" /></Link><details className="group relative"><summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl p-2 hover:bg-slate-50"><span className="grid h-11 w-11 place-items-center rounded-full bg-amber-100 font-bold text-amber-800">{initials}</span><span className="hidden text-left md:block"><strong className="block text-sm">{teacherName}</strong><span className="text-xs text-slate-500">{designation ?? "Teacher"}</span></span><ChevronDown className="h-4 w-4 text-slate-400" /></summary><div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-white p-2 shadow-xl"><Link href="/teacher-dashboard/profile" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-slate-50"><User className="h-4 w-4" />My Profile</Link><Link href="/teacher-dashboard/settings" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-slate-50"><Settings className="h-4 w-4" />Settings</Link><span className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500"><CircleHelp className="h-4 w-4" />Help</span><div className="mt-1 border-t pt-1"><LogoutButton /></div></div></details></div></header>;
}