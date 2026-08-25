import Link from "next/link";

import { saveMentorProfileAction } from "@/app/mentor-dashboard/mentor-actions";
import { getMentorDashboard } from "@/lib/mentor-dashboard";

export default async function MentorProfilePage() {
  const dashboard = await getMentorDashboard();
  const mentor = dashboard.mentor;

  return (
    <main className="space-y-6">
      <header className="rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Mentor Account</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">My Profile</h1>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={saveMentorProfileAction} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Name
            <input name="name" defaultValue={mentor.user.name} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Email
            <input name="email" type="email" defaultValue={mentor.user.email ?? ""} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Phone
            <input name="phone" defaultValue={mentor.user.phone ?? ""} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <button type="submit" className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white md:col-span-2">Save Profile</button>
        </form>

        <p className="mt-4 text-sm text-slate-600">School membership, assigned students, role, and permissions are managed by school or publisher admins.</p>
        <Link href="/forgot-password" className="mt-2 inline-block text-sm font-semibold text-indigo-700">Change Password</Link>
      </section>
    </main>
  );
}
