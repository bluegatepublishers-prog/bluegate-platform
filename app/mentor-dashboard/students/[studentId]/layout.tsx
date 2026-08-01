import type { ReactNode } from "react";
import Link from "next/link";

import { MentorAccessError, getMentorStudentScope } from "@/lib/mentor-dashboard";

const tabs = [
  { label: "Overview", href: "" },
  { label: "Learning", href: "/learning" },
  { label: "Assignments", href: "/assignments" },
  { label: "Assessments", href: "/assessments" },
  { label: "Support Plan", href: "/support-plan" },
  { label: "Sessions", href: "/sessions" },
  { label: "Notes", href: "/notes" },
  { label: "Reports", href: "/reports" },
] as const;

export default async function MentorStudentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ studentId: string }>;
}) {
  let scope;
  try {
    const { studentId } = await params;
    scope = await getMentorStudentScope(studentId);
  } catch (error) {
    if (error instanceof MentorAccessError) {
      return <main className="rounded-3xl border border-amber-200 bg-amber-50 p-8"><h1 className="text-2xl font-bold text-amber-950">Student workspace unavailable</h1><p className="mt-3 text-amber-900">{error.message}</p></main>;
    }
    throw error;
  }

  const { studentId } = await params;

  return (
    <main className="space-y-6">
      <header className="rounded-[2rem] bg-white p-6 shadow-sm">
        <Link href="/mentor-dashboard/students" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
          <span aria-hidden>←</span>
          Back to My Students
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">{scope.assignment.student.name}</h1>
        <p className="mt-2 text-slate-600">{scope.enrollment.schoolClass.name} · Section {scope.enrollment.section.name} · {scope.assignment.student.school.schoolName}</p>
        <p className="mt-2 text-sm font-semibold text-indigo-700">Mentor assignment: {scope.assignment.status.toLowerCase()} · {scope.assignment.role.toLowerCase()}</p>
      </header>

      <nav aria-label="Student workspace tabs" className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => (
            <Link key={tab.label} href={`/mentor-dashboard/students/${studentId}${tab.href}`} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-indigo-700">
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      {children}
    </main>
  );
}
