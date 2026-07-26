import Link from "next/link";
import { notFound } from "next/navigation";

import { getSchoolById } from "@/lib/schools";
import { SCHOOL_LIFECYCLE_TRANSITIONS, type SchoolLifecycleAction } from "@/lib/school-lifecycle";
import { changeSchoolLifecycleAction, updateSchoolProfileAction } from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "School Details | Bluegate Admin" };

const lifecycleLabels: Record<SchoolLifecycleAction, string> = {
  pause: "Pause",
  resume: "Resume",
  suspend: "Suspend",
  revoke: "Revoke",
  archive: "Archive",
  restore: "Restore",
};

export default async function AdminSchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const school = await getSchoolById(id);
  if (!school) notFound();
  const availableActions = Object.entries(SCHOOL_LIFECYCLE_TRANSITIONS)
    .filter(([, transition]) => (transition.from as readonly string[]).includes(school.status))
    .map(([action]) => action as SchoolLifecycleAction);

  return (
    <main className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/admin/schools" className="font-semibold text-blue-700">← Schools</Link>
          <h1 className="mt-3 break-words text-3xl font-bold">{school.schoolName}</h1>
          <p className="mt-2 text-slate-600">{school.city}, {school.state}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold">
          Status: {school.status}
        </span>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Teacher memberships", school._count.staffMemberships],
          ["Student enrollments", school._count.studentEnrollments],
          ["Subject assignments", school._count.teacherAssignments],
          ["Book adoption records", school._count.bookAdoptions],
        ].map(([label, count]) => (
          <div key={String(label)} className="rounded-2xl border bg-white p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{count}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Books assigned", school.contentEntitlements.books.assigned],
          ["Active books", school.contentEntitlements.books.active],
          ["Paused books", school.contentEntitlements.books.paused],
          ["Revoked books", school.contentEntitlements.books.revoked],
          ["Resources assigned", school.contentEntitlements.resources.assigned],
          ["Active resources", school.contentEntitlements.resources.active],
          ["Paused resources", school.contentEntitlements.resources.paused],
          ["Revoked resources", school.contentEntitlements.resources.revoked],
        ].map(([label, count]) => (
          <div key={String(label)} className="rounded-2xl border bg-white p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{count}</p>
          </div>
        ))}
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">School profile</h2>
            <form action={updateSchoolProfileAction.bind(null, school.id)} className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field name="schoolName" label="School name" value={school.schoolName} wide />
              <Field name="city" label="City" value={school.city} />
              <Field name="state" label="State" value={school.state} />
              <Field name="principalName" label="Principal display name" value={school.principalName ?? ""} />
              <Field name="pincode" label="Pincode" value={school.pincode ?? ""} />
              <label className="sm:col-span-2 text-sm font-semibold">Address
                <textarea name="address" defaultValue={school.address ?? ""} maxLength={300} className="mt-2 min-h-24 w-full rounded-xl border px-3 py-2 font-normal" />
              </label>
              <button className="min-h-12 rounded-xl bg-blue-700 px-5 font-semibold text-white sm:w-fit">Save school profile</button>
            </form>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Publisher content</h2>
            <p className="mt-2 text-sm text-slate-600">Control the publisher-owned books and resources this school may use. Class, section, and subject assignment remains with the school.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={`/admin/schools/${school.id}/books`} className="min-h-12 rounded-xl border px-4 py-3 font-semibold text-blue-700">Manage school books</Link>
              <Link href={`/admin/schools/${school.id}/resources`} className="min-h-12 rounded-xl border px-4 py-3 font-semibold text-blue-700">Manage school resources</Link>
              <Link href="/admin/book-adoptions" className="min-h-12 rounded-xl border px-4 py-3 font-semibold text-blue-700">Review class adoption requests</Link>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Recent lifecycle activity</h2>
            <ul className="mt-4 divide-y">
              {school.onboardingReviews.map((review) => (
                <li key={review.id} className="py-3 text-sm">
                  <p className="font-semibold">{review.fromStatus} → {review.toStatus}</p>
                  <p className="text-slate-500">{review.createdAt.toLocaleString("en-IN")}{review.reason ? ` · ${review.reason}` : ""}</p>
                </li>
              ))}
              {!school.onboardingReviews.length ? <li className="py-4 text-sm text-slate-500">No lifecycle changes recorded.</li> : null}
            </ul>
            <h3 className="mt-5 border-t pt-5 font-bold">Security audit</h3>
            <ul className="mt-2 divide-y">
              {school.recentAuditEvents.map((event) => (
                <li key={event.id} className="py-3 text-sm">
                  <p className="break-words font-semibold">{event.action}</p>
                  <p className="text-slate-500">{event.outcome} · {event.createdAt.toLocaleString("en-IN")}</p>
                </li>
              ))}
              {!school.recentAuditEvents.length ? <li className="py-4 text-sm text-slate-500">No safe audit events recorded.</li> : null}
            </ul>
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Lifecycle actions</h2>
            <p className="mt-2 text-sm text-slate-600">These actions retain identities and academic history. Permanent deletion is not available here.</p>
            <form action={changeSchoolLifecycleAction.bind(null, school.id)} className="mt-4 space-y-3">
              <label className="block text-sm font-semibold">Reason
                <textarea name="reason" maxLength={500} className="mt-2 min-h-20 w-full rounded-xl border px-3 py-2 font-normal" />
              </label>
              <div className="flex flex-wrap gap-2">
                {availableActions.map((action) => (
                  <button
                    key={action}
                    name="lifecycleAction"
                    value={action}
                    className="min-h-11 rounded-xl border px-4 font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    {lifecycleLabels[action]}
                  </button>
                ))}
              </div>
            </form>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="font-bold">Account and entitlement</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Account" value={school.user.active ? "Active" : "Inactive"} />
              <Row label="Email" value={school.user.email} />
              <Row label="Academic sessions" value={String(school._count.academicYears)} />
              <Row label="Classes" value={String(school._count.schoolClasses)} />
              <Row label="Active books" value={String(school.contentEntitlements.books.active)} />
              <Row label="Active resources" value={String(school.contentEntitlements.resources.active)} />
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Field({ name, label, value, wide = false }: { name: string; label: string; value: string; wide?: boolean }) {
  return <label className={`${wide ? "sm:col-span-2 " : ""}text-sm font-semibold`}>{label}
    <input name={name} defaultValue={value} required={["schoolName", "city", "state"].includes(name)} className="mt-2 block min-h-11 w-full rounded-xl border px-3 font-normal" />
  </label>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex min-w-0 justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="break-all text-right font-semibold">{value}</dd></div>;
}
