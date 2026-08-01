import Link from "next/link";

export default function ParentSettingsPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">Settings</h2>
        <p className="mt-2 text-slate-600">Manage the account options available to parents. Notification settings are kept intentionally simple in this phase.</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-slate-950">Password and security</h3>
          <p className="mt-3 text-slate-600">Use the secure reset flow to change your password.</p>
          <Link href="/forgot-password" className="mt-4 inline-flex rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white">Change password</Link>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-slate-950">Notifications</h3>
          <p className="mt-3 text-slate-600">School notices, planner updates and published results are shown in the portal. Additional preferences are managed by the school.</p>
          <Link href="/parent-dashboard/notices" className="mt-4 inline-flex rounded-2xl border border-blue-200 px-4 py-3 font-semibold text-blue-700">Review notices</Link>
        </article>
      </section>
    </main>
  );
}