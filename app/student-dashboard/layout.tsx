import type { ReactNode } from "react";
import StudentDashboardShell from "@/components/student/StudentDashboardShell";
import { requireStudentDashboardAccess } from "@/lib/student-dashboard";

export const dynamic = "force-dynamic";

export default async function StudentDashboardLayout({ children }: { children: ReactNode }) {
  const access = await requireStudentDashboardAccess();
  const hasIdentity = "identity" in access;
  const name = hasIdentity ? access.identity.student.name : access.shell.studentName;
  const classSection = hasIdentity ? `${access.identity.enrollment.schoolClass.name}-${access.identity.enrollment.section.name}` : [access.shell.className, access.shell.sectionName].filter(Boolean).join("-") || "Class pending";
  return <StudentDashboardShell name={name} classSection={classSection}>{children}</StudentDashboardShell>;
}
