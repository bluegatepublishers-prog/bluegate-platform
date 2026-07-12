import type { ReactNode } from "react";

import { Header, Sidebar } from "@/components/dashboard";
import { requireTeacher } from "@/lib/teacher-dashboard";
import{getBrandingForAuthenticatedUser}from"@/lib/publisher-context";import{resolveFeaturesForAuthenticatedUser}from"@/lib/publisher-features";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const teacher = await requireTeacher();
  const[branding,features]=await Promise.all([getBrandingForAuthenticatedUser(),resolveFeaturesForAuthenticatedUser()]);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar teacherName={teacher.user.name} schoolName={teacher.school?.schoolName ?? teacher.schoolName} branding={branding} features={features}/>
      <div className="min-w-0 flex-1">
        <Header teacherName={teacher.user.name} />
        {children}
      </div>
    </div>
  );
}
