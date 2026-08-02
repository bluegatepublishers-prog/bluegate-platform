import Link from "next/link";
import { CheckCircle2, ShieldAlert } from "lucide-react";

import { effectiveSchoolAccessStatus } from "@/lib/school-access-policy";
import { resolveFeaturesForAuthenticatedUser } from "@/lib/publisher-features";
import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { getSchoolPortalPermissionsBySchoolId } from "@/lib/school-portal-permissions";
import { isSchoolFeatureEnabled } from "@/lib/school-feature-entitlements";

import { updateSchoolPortalPermissionsAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const toggleStyle = "h-4 w-4 rounded border-slate-300 text-blue-600";

export default async function SchoolSettingsPage() {
  const school = await requireSchool();
  const [permissions, features, subscription] = await Promise.all([
    getSchoolPortalPermissionsBySchoolId(school.id),
    resolveFeaturesForAuthenticatedUser(),
    prisma.schoolAccessSubscription.findUnique({ where: { schoolId: school.id }, select: { plan: true, status: true, startsAt: true, expiresAt: true, featureConfig: true } }),
  ]);

  const schoolAccess = subscription ? effectiveSchoolAccessStatus(subscription) : "NOT_STARTED";
  const parentPortalEnabledAtPublisher = Boolean(features.PARENT_PORTAL);
  const mentorPortalEnabledAtPublisher = Boolean(features.TUTOR_PLATFORM);
  const parentPortalEnabledAtSchool = isSchoolFeatureEnabled(subscription, "PARENT_PORTAL");
  const mentorPortalEnabledAtSchool = isSchoolFeatureEnabled(subscription, "MENTOR_PORTAL");

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Settings</p>
        <h1 className="mt-2 text-3xl font-bold">Access & Permissions</h1>
        <p className="mt-2 text-slate-600">
          School staff control parent and mentor operational access here.
          Publisher features and school access must already be available before these controls take effect.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <StatusCard
          icon={CheckCircle2}
          title="School entitlement"
          value={`${subscription?.plan ?? "FREE"} | ${schoolAccess}`}
          tone={schoolAccess === "ACTIVE" ? "emerald" : "amber"}
        />
        <StatusCard
          icon={ShieldAlert}
          title="Parent portal feature"
          value={parentPortalEnabledAtPublisher ? (parentPortalEnabledAtSchool ? "Enabled for this school" : "Disabled by this school") : "This feature has been disabled by your publisher."}
          tone={parentPortalEnabledAtPublisher ? (parentPortalEnabledAtSchool ? "emerald" : "amber") : "rose"}
        />
        <StatusCard
          icon={ShieldAlert}
          title="Mentor portal feature"
          value={mentorPortalEnabledAtPublisher ? (mentorPortalEnabledAtSchool ? "Enabled for this school" : "Disabled by this school") : "This feature has been disabled by your publisher."}
          tone={mentorPortalEnabledAtPublisher ? (mentorPortalEnabledAtSchool ? "emerald" : "amber") : "rose"}
        />
      </section>

      {(!parentPortalEnabledAtPublisher || !mentorPortalEnabledAtPublisher) ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <h2 className="font-bold">Publisher-controlled features are unavailable</h2>
          <p className="mt-2 text-sm">
            School permission changes can still be configured, but the corresponding portal will stay blocked until the publisher enables the feature.
          </p>
        </section>
      ) : null}

      <form action={updateSchoolPortalPermissionsAction} className="space-y-6 rounded-3xl border bg-white p-6 shadow-sm">
        <section>
          <h2 className="text-xl font-bold">Parent Portal</h2>
          <p className="mt-2 text-sm text-slate-600">These controls govern how parents can sign in and what they can see.</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <ToggleField name="parentLoginEnabled" label="Allow parent login" help="Lets approved parents sign in to the parent portal." checked={permissions.parentLoginEnabled} disabled={!parentPortalEnabledAtPublisher || !parentPortalEnabledAtSchool} reason={parentPortalEnabledAtPublisher ? (parentPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
            <ToggleField name="parentActivationAllowed" label="Allow parent activation" help="Lets the school create or activate parent accounts and invitations." checked={permissions.parentActivationAllowed} disabled={!parentPortalEnabledAtPublisher || !parentPortalEnabledAtSchool} reason={parentPortalEnabledAtPublisher ? (parentPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
            <ToggleField name="parentPlannerVisibility" label="Planner visibility" help="Shows school planner items to parents." checked={permissions.parentPlannerVisibility} disabled={!parentPortalEnabledAtPublisher || !parentPortalEnabledAtSchool} reason={parentPortalEnabledAtPublisher ? (parentPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
            <ToggleField name="parentAttendanceVisibility" label="Attendance visibility" help="Shows attendance information to parents." checked={permissions.parentAttendanceVisibility} disabled={!parentPortalEnabledAtPublisher || !parentPortalEnabledAtSchool} reason={parentPortalEnabledAtPublisher ? (parentPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
            <ToggleField name="parentHomeworkVisibility" label="Homework visibility" help="Shows classroom assignments to parents." checked={permissions.parentHomeworkVisibility} disabled={!parentPortalEnabledAtPublisher || !parentPortalEnabledAtSchool} reason={parentPortalEnabledAtPublisher ? (parentPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
            <ToggleField name="parentTeacherMaterialVisibility" label="Teacher material visibility" help="Shows shared teacher materials to parents." checked={permissions.parentTeacherMaterialVisibility} disabled={!parentPortalEnabledAtPublisher || !parentPortalEnabledAtSchool} reason={parentPortalEnabledAtPublisher ? (parentPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
            <ToggleField name="parentAssessmentVisibility" label="Assessment visibility" help="Shows assessment information to parents." checked={permissions.parentAssessmentVisibility} disabled={!parentPortalEnabledAtPublisher || !parentPortalEnabledAtSchool} reason={parentPortalEnabledAtPublisher ? (parentPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
            <ToggleField name="parentAnnouncementAcknowledgement" label="Announcement acknowledgement" help="Requires parents to acknowledge important school announcements." checked={permissions.parentAnnouncementAcknowledgement} disabled={!parentPortalEnabledAtPublisher || !parentPortalEnabledAtSchool} reason={parentPortalEnabledAtPublisher ? (parentPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold">Mentor Portal</h2>
          <p className="mt-2 text-sm text-slate-600">These controls govern how mentors can work with assigned students.</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <ToggleField name="mentorLoginEnabled" label="Allow mentor login" help="Lets approved mentors sign in to the mentor portal." checked={permissions.mentorLoginEnabled} disabled={!mentorPortalEnabledAtPublisher || !mentorPortalEnabledAtSchool} reason={mentorPortalEnabledAtPublisher ? (mentorPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
            <ToggleField name="mentorActivationAllowed" label="Allow mentor activation" help="Lets the school create or activate mentor accounts and invitations." checked={permissions.mentorActivationAllowed} disabled={!mentorPortalEnabledAtPublisher || !mentorPortalEnabledAtSchool} reason={mentorPortalEnabledAtPublisher ? (mentorPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
            <ToggleField name="mentorAssignedStudentVisibility" label="Assigned-student visibility" help="Shows assigned students to mentors." checked={permissions.mentorAssignedStudentVisibility} disabled={!mentorPortalEnabledAtPublisher || !mentorPortalEnabledAtSchool} reason={mentorPortalEnabledAtPublisher ? (mentorPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
            <ToggleField name="mentorPlannerVisibility" label="Planner visibility" help="Shows planning items to mentors." checked={permissions.mentorPlannerVisibility} disabled={!mentorPortalEnabledAtPublisher || !mentorPortalEnabledAtSchool} reason={mentorPortalEnabledAtPublisher ? (mentorPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
            <ToggleField name="mentorAttendanceVisibility" label="Attendance visibility" help="Shows attendance information to mentors." checked={permissions.mentorAttendanceVisibility} disabled={!mentorPortalEnabledAtPublisher || !mentorPortalEnabledAtSchool} reason={mentorPortalEnabledAtPublisher ? (mentorPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
            <ToggleField name="mentorAcademicProgressVisibility" label="Academic progress visibility" help="Shows learning progress and support indicators to mentors." checked={permissions.mentorAcademicProgressVisibility} disabled={!mentorPortalEnabledAtPublisher || !mentorPortalEnabledAtSchool} reason={mentorPortalEnabledAtPublisher ? (mentorPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
            <ToggleField name="mentorPlanCreation" label="Mentor-plan creation" help="Lets mentors create and manage learning support plans." checked={permissions.mentorPlanCreation} disabled={!mentorPortalEnabledAtPublisher || !mentorPortalEnabledAtSchool} reason={mentorPortalEnabledAtPublisher ? (mentorPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
            <ToggleField name="mentorParentVisibleUpdates" label="Parent-visible mentor updates" help="Lets mentors publish updates visible to parents." checked={permissions.mentorParentVisibleUpdates} disabled={!mentorPortalEnabledAtPublisher || !mentorPortalEnabledAtSchool} reason={mentorPortalEnabledAtPublisher ? (mentorPortalEnabledAtSchool ? "Managed by this school." : "Disabled by this school.") : "This feature has been disabled by your publisher."} />
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="confirmDisablingPortalAccess" className={toggleStyle} />
            <span>
              <strong className="block">Confirm before disabling portal login</strong>
              <span className="mt-1 block">Check this box if you are turning off either parent or mentor login.</span>
            </span>
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">Save permissions</button>
          <Link href="/school-dashboard/people?tab=parents" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700">Manage parents</Link>
          <Link href="/school-dashboard/people/mentors" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700">Manage mentors</Link>
        </div>
      </form>
    </main>
  );
}

function StatusCard({ icon: Icon, title, value, tone }: { icon: typeof CheckCircle2; title: string; value: string; tone: "emerald" | "amber" | "rose" }) {
  const toneClasses = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClasses}`}>
      <Icon className="h-6 w-6" />
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em]">{title}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ToggleField({ name, label, help, checked, disabled = false, reason }: { name: string; label: string; help: string; checked: boolean; disabled?: boolean; reason?: string }) {
  return (
    <label className={`flex items-start gap-3 rounded-2xl border p-4 ${disabled ? "bg-slate-100 opacity-80" : "bg-slate-50"}`}>
      <input type="checkbox" name={name} defaultChecked={checked} disabled={disabled} className={toggleStyle} />
      <input type="hidden" name={name} value={checked ? "on" : "off"} />
      <span>
        <span className="block font-semibold text-slate-900">{label}</span>
        <span className="mt-1 block text-sm text-slate-600">{help}</span>
        {reason ? <span className="mt-2 block text-xs font-semibold text-slate-500">{reason}</span> : null}
      </span>
    </label>
  );
}
