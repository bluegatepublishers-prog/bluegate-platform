"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { teacherNavigation } from "./Sidebar";

export default function TeacherMobileNavigation(props: { features: Record<string, boolean> }) { void props.features; const pathname = usePathname(); return <nav aria-label="Teacher navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-white/95 p-2 backdrop-blur lg:hidden">{teacherNavigation.map(({ name, href, icon: Icon }) => { const active = href === "/teacher-dashboard" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl p-2 text-[10px] font-semibold ${active ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}><Icon className="h-5 w-5" /><span className="truncate">{name}</span></Link>; })}</nav>; }
