import type { ReactNode } from "react";
import StudentHeader from "@/components/student/StudentHeader";
import StudentNavigation from "@/components/student/StudentNavigation";
import { getPublisherBranding } from "@/lib/publisher-context";
import { requireStudent } from "@/lib/student-dashboard";

export const dynamic = "force-dynamic";

export default async function StudentDashboardLayout({ children }: { children: ReactNode }) {
  const identity = await requireStudent();
  const branding = await getPublisherBranding(identity.publisher.id);
  return (
    <div className="flex min-h-screen bg-slate-100">
      <StudentNavigation branding={branding} schoolName={identity.school.schoolName} />
      <div className="min-w-0 flex-1">
        <StudentHeader name={identity.student.name} plan={identity.effectivePlan.plan} />
        <StudentNavigation mobile branding={branding} schoolName={identity.school.schoolName} />
        {children}
      </div>
    </div>
  );
}
