"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BrainCircuit,
  Download,
  Bookmark,
  Video,
  Bell,
  User,
  Settings,
  GraduationCap,
  Sparkles,
  ChartNoAxesCombined,
  ScanSearch,
  Menu,
  X,
} from "lucide-react";
import LogoutButton from "./LogoutButton";

const navigation = [
  {
    name: "Overview",
    href: "/teacher-dashboard",
    icon: GraduationCap,
  },
  {
    name: "Teaching resources",
    href: "/teacher-dashboard/resources",
    icon: BookOpen,
    feature: "RESOURCES",
  },
  {
    name: "AI teaching studio",
    href: "/teacher-dashboard/ai",
    icon: Sparkles,
    feature: "AI_STUDIO",
  },
  {
    name: "Downloads",
    href: "/teacher-dashboard/downloads",
    icon: Download,
    feature: "RESOURCES",
  },
  {
    name: "Bookmarks",
    href: "/teacher-dashboard/bookmarks",
    icon: Bookmark,
    feature: "RESOURCES",
  },
  {
    name: "Student insights",
    href: "/teacher-dashboard/reports",
    icon: ChartNoAxesCombined,
    feature: "REPORTS",
  },
  {
    name: "Learning gaps",
    href: "/teacher-dashboard/gaps",
    icon: ScanSearch,
    feature: "GAP_ANALYSIS",
  },
  {
    name: "Remedial support",
    href: "/teacher-dashboard/remedials",
    icon: BrainCircuit,
    feature: "REMEDIALS",
  },
  {
    name: "Training",
    href: "/teacher-dashboard/training",
    icon: Video,
  },
  {
    name: "Notifications",
    href: "/teacher-dashboard/notifications",
    icon: Bell,
    feature: "NOTIFICATIONS",
  },
  {
    name: "Profile",
    href: "/teacher-dashboard/profile",
    icon: User,
  },
  {
    name: "Settings",
    href: "/teacher-dashboard/settings",
    icon: Settings,
  },
];

type SidebarProps = {
  teacherName: string;
  schoolName: string;
  branding: { shortName: string; portalTitle: string; primaryColor: string };
  features: Record<string, boolean>;
};

export function getTeacherNavigation(features: Record<string, boolean>) {
  return navigation.filter((item) => !item.feature || features[item.feature]);
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "T";
}

function NavigationLinks({ features, onNavigate }: { features: Record<string, boolean>; onNavigate?: () => void }) {
  const pathname = usePathname();

  return <nav aria-label="Teacher dashboard navigation"><ul className="space-y-1.5">{getTeacherNavigation(features).map((item) => {
    const Icon = item.icon;
    const active = item.href === "/teacher-dashboard" ? pathname === item.href : pathname.startsWith(item.href);
    return <li key={item.href}><Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${active ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"}`}><Icon className="h-5 w-5 shrink-0" aria-hidden="true" /><span>{item.name}</span></Link></li>;
  })}</ul></nav>;
}

export default function Sidebar({ teacherName, schoolName, branding, features }: SidebarProps) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-200 px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-700">
            <GraduationCap className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{branding.shortName}</h2>
            <p className="text-sm text-slate-500">Teacher dashboard</p>
          </div>
        </Link>
      </div>

      <div className="border-b border-slate-200 px-6 py-5">
        <Link href="/teacher-dashboard/profile" className="flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{initials(teacherName)}</div>
          <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{teacherName}</p><p className="truncate text-sm text-slate-500">{schoolName}</p></div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4"><NavigationLinks features={features} /></div>

      <div className="border-t border-slate-200 p-4">
        <LogoutButton className="w-full" />
        <p className="mt-4 text-center text-xs text-slate-400">{branding.portalTitle}</p>
      </div>
    </aside>
  );
}

export function MobileTeacherNavigation({ teacherName, schoolName, branding, features }: SidebarProps) {
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls={dialogId} aria-label="Open navigation menu" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><Menu className="h-5 w-5" aria-hidden="true" /></button>
      <p className="font-bold text-slate-900">Teacher dashboard</p>
      <Link href="/teacher-dashboard/profile" aria-label="Open my profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{initials(teacherName)}</Link>
    </header>
    {open ? <div className="fixed inset-0 z-50" id={dialogId} role="dialog" aria-modal="true" aria-label="Teacher dashboard navigation">
      <button type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/40" />
      <aside className="relative flex h-full w-[min(22rem,calc(100%-2rem))] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700"><GraduationCap className="h-5 w-5 text-white" aria-hidden="true" /></div><div><p className="font-bold text-slate-900">{branding.shortName}</p><p className="text-sm text-slate-500">Teacher dashboard</p></div></Link><button type="button" onClick={() => setOpen(false)} aria-label="Close navigation menu" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><X className="h-5 w-5" aria-hidden="true" /></button></div>
        <Link href="/teacher-dashboard/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{initials(teacherName)}</div><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{teacherName}</p><p className="truncate text-sm text-slate-500">{schoolName}</p></div></Link>
        <div className="flex-1 overflow-y-auto p-4"><NavigationLinks features={features} onNavigate={() => setOpen(false)} /></div>
        <div className="border-t border-slate-200 p-4"><LogoutButton className="w-full" /></div>
      </aside>
    </div> : null}
  </div>;
}
