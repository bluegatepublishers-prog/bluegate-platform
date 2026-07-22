"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import {
	BarChart3,
	BookOpen,
	BookOpenCheck,
	CalendarDays,
	GraduationCap,
	LayoutDashboard,
	Menu,
	School,
	User,
	UserRoundCheck,
	Users,
	X,
} from "lucide-react";
import LogoutButton from "@/components/dashboard/LogoutButton";

const items = [
	{ label: "Overview", href: "/school-dashboard", icon: LayoutDashboard },
	{ label: "Academic years", href: "/school-dashboard/academic-years", icon: CalendarDays },
	{ label: "Teachers", href: "/school-dashboard/teachers", icon: Users },
	{ label: "Teacher requests", href: "/school-dashboard/teacher-requests", icon: UserRoundCheck },
	{ label: "Teacher assignments", href: "/school-dashboard/teacher-assignments", icon: UserRoundCheck },
	{ label: "Classes", href: "/school-dashboard/classes", icon: School },
	{ label: "Students", href: "/school-dashboard/students", icon: GraduationCap },
	{ label: "Resources", href: "/school-dashboard/resources", icon: BookOpen, feature: "RESOURCES" },
	{ label: "Book adoptions", href: "/school-dashboard/book-adoptions", icon: BookOpenCheck, feature: "BOOK_APPROVALS" },
	{ label: "Reports", href: "/school-dashboard/reports", icon: BarChart3, feature: "REPORTS" },
	{ label: "School profile", href: "/school-dashboard/profile", icon: User },
];

type SchoolNavigationProps = {
	schoolName: string;
	logoUrl?: string | null;
	branding: { shortName: string };
	features: Record<string, boolean>;
};

export function getSchoolNavigation(features: Record<string, boolean>) {
	return items.filter((item) => !item.feature || features[item.feature]);
}

function initials(name: string) {
	return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "S";
}

function SchoolMark({ schoolName, logoUrl }: Pick<SchoolNavigationProps, "schoolName" | "logoUrl">) {
	return logoUrl
		? <Image src={logoUrl} alt={`${schoolName} logo`} width={44} height={44} className="h-11 w-11 rounded-lg bg-white object-contain p-1" />
		: <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">{initials(schoolName)}</span>;
}

function NavigationLinks({ features, onNavigate }: { features: Record<string, boolean>; onNavigate?: () => void }) {
	const pathname = usePathname();
	return <nav aria-label="School dashboard navigation"><ul className="space-y-1.5">{getSchoolNavigation(features).map((item) => {
		const Icon = item.icon;
		const active = item.href === "/school-dashboard" ? pathname === item.href : pathname.startsWith(item.href);
		return <li key={item.href}><Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${active ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"}`}><Icon className="h-5 w-5 shrink-0" aria-hidden="true" /><span>{item.label}</span></Link></li>;
	})}</ul></nav>;
}

export default function SchoolNavigation({ schoolName, logoUrl, branding, features }: SchoolNavigationProps) {
	return <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
		<div className="border-b border-slate-200 px-6 py-6"><Link href="/school-dashboard" className="flex items-center gap-3"><SchoolMark schoolName={schoolName} logoUrl={logoUrl} /><div className="min-w-0"><p className="truncate font-bold text-slate-900">{branding.shortName}</p><p className="text-sm text-slate-500">School dashboard</p></div></Link><p className="mt-4 truncate text-sm font-semibold text-slate-700">{schoolName}</p></div>
		<div className="flex-1 overflow-y-auto p-4"><NavigationLinks features={features} /></div>
	</aside>;
}

export function MobileSchoolNavigation({ schoolName, logoUrl, branding, features }: SchoolNavigationProps) {
	const dialogId = useId();
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!open) return;
		const previousOverflow = document.body.style.overflow;
		const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", closeOnEscape);
		return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
	}, [open]);

	return <div className="lg:hidden">
		<header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4"><button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls={dialogId} aria-label="Open navigation menu" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><Menu className="h-5 w-5" aria-hidden="true" /></button><p className="max-w-[14rem] truncate font-bold text-slate-900">School dashboard</p><Link href="/school-dashboard/profile" aria-label="Open school profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{initials(schoolName)}</Link></header>
		{open ? <div className="fixed inset-0 z-50" id={dialogId} role="dialog" aria-modal="true" aria-label="School dashboard navigation"><button type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/40" /><aside className="relative flex h-full w-[min(22rem,calc(100%-2rem))] flex-col bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><Link href="/school-dashboard" onClick={() => setOpen(false)} className="flex min-w-0 items-center gap-3"><SchoolMark schoolName={schoolName} logoUrl={logoUrl} /><div className="min-w-0"><p className="truncate font-bold text-slate-900">{branding.shortName}</p><p className="truncate text-sm text-slate-500">{schoolName}</p></div></Link><button type="button" onClick={() => setOpen(false)} aria-label="Close navigation menu" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><X className="h-5 w-5" aria-hidden="true" /></button></div><div className="flex-1 overflow-y-auto p-4"><NavigationLinks features={features} onNavigate={() => setOpen(false)} /></div><div className="border-t border-slate-200 p-4"><LogoutButton className="w-full" /></div></aside></div> : null}
	</div>;
}
