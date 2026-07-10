import type { ReactNode } from "react";

import { Header, Sidebar } from "@/components/dashboard";
import { requireTeacher } from "@/lib/teacher-dashboard";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const teacher = await requireTeacher();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar teacherName={teacher.user.name} schoolName={teacher.schoolName} />
      <div className="min-w-0 flex-1">
        <Header teacherName={teacher.user.name} />
        {children}
      </div>
    </div>
  );
}
