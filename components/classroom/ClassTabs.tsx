"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const tabs = [["Overview", ""], ["Teaching Plan", "/plan"], ["Students", "/students"], ["Attendance", "/attendance"], ["Assignments", "/assignments"], ["Assessments", "/assessments"], ["Materials", "/materials"], ["Progress", "/progress"], ["Class Chat", "/chat"]] as const;

export default function ClassTabs({ sectionId, assignmentsEnabled }: { sectionId: string; assignmentsEnabled: boolean }) { const pathname = usePathname(); const search = useSearchParams(); const subject = search.get("subject"); const base = `/teacher-dashboard/classes/${sectionId}`; return <nav aria-label="Classroom sections" className="flex gap-1 overflow-x-auto border-b bg-white px-2">{tabs.filter(([label]) => label !== "Assignments" || assignmentsEnabled).map(([label, suffix]) => { const href = `${base}${suffix}${subject ? `?subject=${subject}` : ""}`; const active = suffix ? pathname.startsWith(`${base}${suffix}`) : pathname === base; return <Link key={label} href={href} className={`shrink-0 border-b-2 px-4 py-4 text-sm font-semibold ${active ? "border-blue-600 text-blue-700" : "border-transparent text-slate-600 hover:text-blue-700"}`}>{label}</Link>; })}</nav>; }
