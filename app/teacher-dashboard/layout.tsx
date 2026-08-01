import type { ReactNode } from "react";

import { Header, Sidebar } from "@/components/dashboard";
import TeacherMobileNavigation from "@/components/dashboard/TeacherMobileNavigation";
import { requireTeacher, TeacherAccessError } from "@/lib/teacher-dashboard";
import{getBrandingForAuthenticatedUser}from"@/lib/publisher-context";import{resolveFeaturesForAuthenticatedUser}from"@/lib/publisher-features";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  let teacher;
  try { teacher = await requireTeacher(); } catch (error) { if (error instanceof TeacherAccessError) return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><section className="max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8"><h1 className="text-2xl font-bold text-amber-950">Teacher access unavailable</h1><p className="mt-3 text-amber-800">{error.message}</p></section></main>; throw error; }
  const[branding,features]=await Promise.all([getBrandingForAuthenticatedUser(),resolveFeaturesForAuthenticatedUser()]);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar teacherName={teacher.user.name} schoolName={teacher.school?.schoolName ?? teacher.schoolName} branding={branding} features={features}/>
      <div className="min-w-0 flex-1">
        <Header teacherName={teacher.user.name} designation={teacher.subject || teacher.designation} />
        <TeacherMobileNavigation features={features} />
        <div className="pb-20 lg:pb-0">{children}</div>
      </div>
    </div>
  );
}
