import type { ReactNode } from "react";

import { Header, Sidebar } from "@/components/dashboard";
import TeacherMobileNavigation from "@/components/dashboard/TeacherMobileNavigation";
import { getTeacherAttendanceAccessState } from "@/lib/attendance";
import { requireTeacher, TeacherAccessError } from "@/lib/teacher-dashboard";
import { getBrandingForAuthenticatedUser } from "@/lib/publisher-context";
import { getSchoolFeatureAccessMap } from "@/lib/school-feature-access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardLayout({ children }: { children: ReactNode }) {
  let teacher;
  try {
    teacher = await requireTeacher();
  } catch (error) {
    if (error instanceof TeacherAccessError) {
      return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><section className="max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8"><h1 className="text-2xl font-bold text-amber-950">Teacher access unavailable</h1><p className="mt-3 text-amber-800">{error.message}</p></section></main>;
    }
    throw error;
  }
  const [branding, features, attendanceAccess, academicYear] = await Promise.all([
    getBrandingForAuthenticatedUser(),
    getSchoolFeatureAccessMap(teacher.school!),
    getTeacherAttendanceAccessState(),
    prisma.academicYear.findFirst({ where: { schoolId: teacher.schoolId!, current: true, active: true }, select: { name: true } }),
  ]);
  const attendanceVisible = attendanceAccess.status === "READY" || attendanceAccess.status === "NO_ASSIGNMENTS";

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar teacherName={teacher.user.name} schoolName={teacher.school?.schoolName ?? teacher.schoolName} branding={branding} features={features} attendanceVisible={attendanceVisible}/>
      <div className="min-w-0 flex-1">
        <Header teacherName={teacher.user.name} schoolName={teacher.school?.schoolName ?? teacher.schoolName} academicYear={academicYear?.name} designation={teacher.subject || teacher.designation} />
        <TeacherMobileNavigation features={features} attendanceVisible={attendanceVisible} />
        <div className="pb-20 lg:pb-0">{children}</div>
      </div>
    </div>
  );
}