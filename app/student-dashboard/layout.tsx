import type { ReactNode } from "react";
import StudentHeader from "@/components/student/StudentHeader";
import StudentNavigation, { type StudentFeatureFlags } from "@/components/student/StudentNavigation";
import { getPublisherBranding } from "@/lib/publisher-context";
import { requireStudent } from "@/lib/student-dashboard";
import { getPremiumFeatureEntitlementForAuthenticatedUser } from "@/lib/entitlements/features";

export const dynamic = "force-dynamic";

async function resolveFeatureFlags(identity: Awaited<ReturnType<typeof requireStudent>>): Promise<StudentFeatureFlags> {
  const [assessments, practice, ai, gaps, reports, remedials] = await Promise.all([
    getPremiumFeatureEntitlementForAuthenticatedUser({ id: identity.student.userId ?? identity.student.id, role: "STUDENT" }, { feature: "ASSESSMENTS", academicYearId: identity.academicYear.id }),
    getPremiumFeatureEntitlementForAuthenticatedUser({ id: identity.student.userId ?? identity.student.id, role: "STUDENT" }, { feature: "INTERACTIVE_QUIZZES", academicYearId: identity.academicYear.id }),
    getPremiumFeatureEntitlementForAuthenticatedUser({ id: identity.student.userId ?? identity.student.id, role: "STUDENT" }, { feature: "STUDENT_AI", academicYearId: identity.academicYear.id }),
    getPremiumFeatureEntitlementForAuthenticatedUser({ id: identity.student.userId ?? identity.student.id, role: "STUDENT" }, { feature: "GAP_ANALYSIS", academicYearId: identity.academicYear.id }),
    getPremiumFeatureEntitlementForAuthenticatedUser({ id: identity.student.userId ?? identity.student.id, role: "STUDENT" }, { feature: "PROGRESS_ANALYTICS", academicYearId: identity.academicYear.id }),
    getPremiumFeatureEntitlementForAuthenticatedUser({ id: identity.student.userId ?? identity.student.id, role: "STUDENT" }, { feature: "REMEDIALS", academicYearId: identity.academicYear.id }),
  ]);
  return {
    assessmentsEnabled: assessments.allowed,
    practiceEnabled: practice.allowed,
    aiEnabled: ai.allowed,
    gapsEnabled: gaps.allowed,
    reportsEnabled: reports.allowed,
    remedialsEnabled: remedials.allowed,
  };
}

export default async function StudentDashboardLayout({ children }: { children: ReactNode }) {
  const identity = await requireStudent();
  const [branding, featureFlags] = await Promise.all([getPublisherBranding(identity.publisher.id), resolveFeatureFlags(identity)]);
  return (
    <div className="flex min-h-screen bg-slate-100">
      <StudentNavigation branding={branding} schoolName={identity.school.schoolName} featureFlags={featureFlags} />
      <div className="min-w-0 flex-1">
        <StudentHeader name={identity.student.name} plan={identity.effectivePlan.plan} />
        <StudentNavigation mobile branding={branding} schoolName={identity.school.schoolName} featureFlags={featureFlags} />
        {children}
      </div>
    </div>
  );
}
