import Link from "next/link";
import { createSchoolMentorAction } from "../actions";

const input = "mt-2 w-full rounded-xl border px-4 py-3";

export default async function NewSchoolMentorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8"><header><Link href="/school-dashboard/people/mentors" className="font-semibold text-blue-700">← Back to Mentors</Link><h1 className="mt-4 text-3xl font-bold">Add Mentor</h1><p className="mt-2 text-slate-600">A new mentor receives a secure activation link and sets their own password. Existing Bluegate mentor accounts are linked without exposing credentials.</p></header>
    {error?<p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">{error}</p>:null}
    <form action={createSchoolMentorAction} className="grid gap-5 rounded-3xl border bg-white p-6 shadow-sm sm:grid-cols-2">
      <label className="font-semibold">Name<input name="name" required minLength={2} maxLength={120} className={input}/></label>
      <label className="font-semibold">Email<input name="email" type="email" required maxLength={254} className={input}/></label>
      <label className="font-semibold">Phone<input name="phone" maxLength={30} className={input}/></label>
      <label className="font-semibold">Designation<input name="designation" required maxLength={100} placeholder="Academic Mentor" className={input}/></label>
      <div className="sm:col-span-2 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">The school cannot see or set the mentor&apos;s password. Activation is completed by the mentor through the secure emailed link.</div>
      <button className="sm:col-span-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Create or invite account</button>
    </form>
  </main>;
}
