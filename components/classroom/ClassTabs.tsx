"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  ["Overview", ""],
  ["Students", "/students"],
  ["Class Materials", "/materials"],
  ["Assignments", "/assignments"],
  ["Announcements", "/announcements"],
  ["Attendance", "/attendance"],
  ["Analytics", "/analytics"],
] as const;

export default function ClassTabs({ sectionId }: { sectionId: string }) {
  const pathname = usePathname();
  const base = `/teacher-dashboard/classes/${sectionId}`;
  return (
    <nav aria-label="Classroom sections" className="grid gap-2 rounded-2xl border bg-white p-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
      {tabs.map(([label, suffix]) => {
        const href = `${base}${suffix}`;
        const active = suffix ? pathname.startsWith(href) : pathname === base;
        return <Link key={label} href={href} className={`flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-center text-sm font-bold ${active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}>{label}</Link>;
      })}
    </nav>
  );
}
