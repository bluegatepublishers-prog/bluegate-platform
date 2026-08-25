"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const tabs = [
  ["Overview", "overview"],
  ["Teach", "teach"],
  ["Students", "students"],
  ["Attendance", "attendance"],
  ["Assignments", "assignments"],
  ["Assessments", "assessments"],
  ["My Questions", "questions"],
  ["Class Resources", "resources"],
  ["Progress", "progress"],
  ["Class Chat", "chat"],
] as const;

export default function ClassTabs({ sectionId, assignmentsEnabled }: { sectionId: string; assignmentsEnabled: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const subject = search.get("subject");
  const base = "/teacher-dashboard/classes/" + sectionId;
  const subjectQuery = subject ? "?subject=" + encodeURIComponent(subject) : "";

  return (
    <nav aria-label="Classroom sections" className="flex gap-1 overflow-x-auto border-b bg-white px-2">
      {tabs.filter(([, key]) => key !== "assignments" || assignmentsEnabled).map(([label, key]) => {
        const href = key === "overview"
          ? base + subjectQuery
          : key === "questions"
            ? "/teacher-dashboard/question-bank?sectionId=" + encodeURIComponent(sectionId) + (subject ? "&subject=" + encodeURIComponent(subject) : "")
            : base + (key === "resources" ? "/materials" : "/" + key) + subjectQuery;
        const active = key === "overview"
          ? pathname === base
          : key === "questions"
            ? pathname.startsWith("/teacher-dashboard/question-bank")
            : pathname.startsWith(base + (key === "resources" ? "/materials" : "/" + key));
        return <Link key={label} href={href} className={"shrink-0 border-b-2 px-3 py-3 text-sm font-semibold " + (active ? "border-teal-600 text-teal-700" : "border-transparent text-slate-600 hover:text-teal-700")}>{label}</Link>;
      })}
    </nav>
  );
}