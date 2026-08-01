import Link from "next/link";
import { notFound } from "next/navigation";

import { effectiveSchoolAccessStatus } from "@/lib/school-access-policy";
import { SCHOOL_LIFECYCLE_TRANSITIONS, type SchoolLifecycleAction } from "@/lib/school-lifecycle";
import { getSchoolById } from "@/lib/schools";
import { changeSchoolLifecycleAction, updateSchoolAccessAction } from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "School Details | Bluegate Admin" };

const lifecycleLabels: Record<SchoolLifecycleAction, string> = {
  approve: "Approve",
  reject: "Reject",
  pause: "Pause",
  resume: "Activate",
  suspend: "Suspend",
  revoke: "Revoke",
  archive: "Archive",
  restore: "Restore",
};

export default async function AdminSchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const school = await getSchoolById(id);
  if (!school) notFound();
  const subscription = school.accessSubscription ?? { plan: "FREE" as const, status: "SUSPENDED" as const, startsAt: null, expiresAt: null, notes: null };
  const accessStatus = effectiveSchoolAccessStatus(subscription);
  const availableActions = Object.entries(SCHOOL_LIFECYCLE_TRANSITIONS).filter(([, transition]) => (transition.from as readonly string[]).includes(school.status)).map(([action]) => action as SchoolLifecycleAction);

  return <main className="min-w-0 space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><Link href="/admin/schools" className="font-semibold text-blue-700">← Schools</Link><h1 className="mt-3 break-words text-3xl font-bold">{school.schoolName}</h1><p className="mt-2 text-slate-600">{school.status} · {subscription.plan} · {accessStatus === "NOT_STARTED" ? "NOT STARTED" : accessStatus}</p></div>
      <div className="flex flex-wrap gap-2"><a href="#access-plan" className="rounded-xl border bg-white px-4 py-2 font-semibold">Change Plan</a>{availableActions.filter((action) => ["approve", "resume", "suspend", "pause"].includes(action)).map((action) => <form key={action} action={changeSchoolLifecycleAction.bind(null, school.id)}><button name="lifecycleAction" value={action} className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">{lifecycleLabels[action]} Access</button></form>)}</div>
    </header>

    <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">1. School Information</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><Row label="School" value={school.schoolName}/><Row label="Location" value={`${school.city}, ${school.state}`}/><Row label="Principal" value={school.principalName ?? "Not provided"}/><Row label="Email" value={school.user.email}/><Row label="Address" value={school.address ?? "Not provided"}/><Row label="Pincode" value={school.pincode ?? "Not provided"}/></dl><p className="mt-4 text-sm text-slate-500">Publisher Admin access is read-only for operational school records. Permanent deletion is not available here.</p></section>

    <section id="access-plan" className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">2. Access Plan</h2><p className="mt-2 text-sm text-slate-600">Plan controls platform features. Books and Resources still require explicit assignment.</p><form action={updateSchoolAccessAction.bind(null, school.id)} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Select label="Plan" name="plan" value={subscription.plan} options={["FREE", "PAID"]}/><Select label="Access status" name="accessStatus" value={subscription.status} options={["ACTIVE", "SUSPENDED", "EXPIRED"]}/><DateField label="Starts" name="startsAt" value={subscription.startsAt}/><DateField label="Expires" name="expiresAt" value={subscription.expiresAt}/><label className="text-sm font-semibold sm:col-span-2 xl:col-span-4">Internal notes<textarea name="notes" defaultValue={subscription.notes ?? ""} maxLength={500} className="mt-2 min-h-20 w-full rounded-xl border px-3 py-2 font-normal"/></label><button className="min-h-12 rounded-xl bg-blue-700 px-5 font-semibold text-white sm:w-fit">Save access</button>
    </form></section>

    <section className="grid gap-6 lg:grid-cols-2">
      <AccessCard number="3" title="Assigned Books" count={school.contentEntitlements.books.active} href={`/admin/schools/${school.id}/books`} label="Manage assigned Books" details={`${school.contentEntitlements.books.assigned} total · ${school.contentEntitlements.books.paused} paused · ${school.contentEntitlements.books.revoked} revoked`}/>
      <AccessCard number="4" title="Assigned Resources" count={school.contentEntitlements.resources.active} href={`/admin/schools/${school.id}/resources`} label="Manage assigned Resources" details={`${school.contentEntitlements.resources.assigned} total · ${school.contentEntitlements.resources.paused} paused · ${school.contentEntitlements.resources.revoked} revoked`}/>
    </section>

    <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">5. Read-only Usage Summary</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Teachers" value={school._count.staffMemberships}/><Metric label="Students" value={school._count.studentEnrollments}/><Metric label="Classes" value={school._count.schoolClasses}/><Metric label="Academic sessions" value={school._count.academicYears}/></div></section>

    {availableActions.some((action) => !["approve", "resume", "suspend", "pause"].includes(action)) ? <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Other lifecycle actions</h2><form action={changeSchoolLifecycleAction.bind(null, school.id)} className="mt-4 flex flex-wrap gap-2"><input name="reason" placeholder="Reason" className="min-h-11 flex-1 rounded-xl border px-3"/>{availableActions.filter((action) => !["approve", "resume", "suspend", "pause"].includes(action)).map((action) => <button key={action} name="lifecycleAction" value={action} className="rounded-xl border px-4 font-semibold">{lifecycleLabels[action]}</button>)}</form></section> : null}
  </main>;
}

function Row({ label, value }: { label: string; value: string }) { return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>; }
function Select({ label, name, value, options }: { label: string; name: string; value: string; options: string[] }) { return <label className="text-sm font-semibold">{label}<select name={name} defaultValue={value} className="mt-2 min-h-11 w-full rounded-xl border px-3 font-normal">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function DateField({ label, name, value }: { label: string; name: string; value: Date | null }) { return <label className="text-sm font-semibold">{label}<input type="date" name={name} defaultValue={value?.toISOString().slice(0, 10) ?? ""} className="mt-2 min-h-11 w-full rounded-xl border px-3 font-normal"/></label>; }
function AccessCard({ number, title, count, details, href, label }: { number: string; title: string; count: number; details: string; href: string; label: string }) { return <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">{number}. {title}</h2><p className="mt-4 text-3xl font-bold">{count} <span className="text-base font-normal text-slate-500">active</span></p><p className="mt-2 text-sm text-slate-500">{details}</p><Link href={href} className="mt-5 inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold text-blue-700">{label}</Link></section>; }
