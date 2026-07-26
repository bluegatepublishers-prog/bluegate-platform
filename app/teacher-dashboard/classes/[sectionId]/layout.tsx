import type { ReactNode } from "react";
import Link from "next/link";

import ClassTabs from "@/components/classroom/ClassTabs";
import { requireTeacherClass } from "@/lib/classroom";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { PlatformFeatureKey } from "@prisma/client";

export default async function TeacherClassLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const scope = await requireTeacherClass(sectionId);
  const assignmentsEnabled = await isPublisherFeatureEnabled(scope.publisherId, PlatformFeatureKey.ASSIGNMENTS);
  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="min-w-0">
        <Link href="/teacher-dashboard/classes" className="text-sm font-bold text-blue-700">← My Classes</Link>
        <p className="mt-4 text-sm font-bold text-blue-700">{scope.academicYear.name}</p>
        <h1 className="mt-1 break-words text-3xl font-bold sm:text-4xl">{scope.schoolClass.name} · Section {scope.section.name}</h1>
        <p className="mt-2 text-slate-600">{scope.isClassTeacher ? "Class teacher access" : scope.sectionSubjects.map((item) => item.subject.name).join(", ")}</p>
      </header>
      <ClassTabs sectionId={sectionId} assignmentsEnabled={assignmentsEnabled} />
      {children}
    </main>
  );
}
