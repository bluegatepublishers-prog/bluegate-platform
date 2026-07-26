import type { ReactNode } from "react";
import StudentHeader from "@/components/student/StudentHeader";
import StudentNavigation from "@/components/student/StudentNavigation";
import { getPublisherBranding } from "@/lib/publisher-context";
import { requireStudentDashboardAccess } from "@/lib/student-dashboard";
import { getPublisherFeatures } from "@/lib/publisher-features";

export const dynamic = "force-dynamic";

export default async function StudentDashboardLayout({ children }: { children: ReactNode }) {
  const access = await requireStudentDashboardAccess();
  const isReadyIdentity =
    access.status === "READY" ||
    access.status === "FEATURE_DISABLED" ||
    access.status === "NO_ENTITLEMENTS";
  const publisherId = isReadyIdentity
    ? access.identity.publisher.id
    : access.shell.publisherId;
  const schoolName = isReadyIdentity
    ? access.identity.school.schoolName
    : access.shell.schoolName;
  const studentName = isReadyIdentity
    ? access.identity.student.name
    : access.shell.studentName;
  const plan = isReadyIdentity
    ? access.identity.effectivePlan.plan
    : undefined;
  const branding = await getPublisherBranding(publisherId);
  const features = await getPublisherFeatures(publisherId);
  return (
    <div className="flex min-h-screen bg-slate-100">
      <StudentNavigation branding={branding} schoolName={schoolName} assignmentsEnabled={features.ASSIGNMENTS} />
      <div className="min-w-0 flex-1">
        <StudentHeader name={studentName} plan={plan} />
        <StudentNavigation mobile branding={branding} schoolName={schoolName} assignmentsEnabled={features.ASSIGNMENTS} />
        {children}
      </div>
    </div>
  );
}
