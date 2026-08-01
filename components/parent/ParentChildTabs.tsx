"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "", label: "Overview" },
  { href: "/attendance", label: "Attendance" },
  { href: "/learning", label: "Learning" },
  { href: "/assignments", label: "Assignments" },
  { href: "/assessments", label: "Assessments" },
  { href: "/reports", label: "Reports" },
] as const;

export default function ParentChildTabs({ studentId }: { studentId: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-sm" aria-label="Child tabs">
      {tabs.map(({ href, label }) => {
        const target = `/parent-dashboard/children/${studentId}${href}`;
        const active = href === "" ? pathname === target : pathname.startsWith(target);
        return (
          <Link
            key={target}
            href={target}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${active ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}