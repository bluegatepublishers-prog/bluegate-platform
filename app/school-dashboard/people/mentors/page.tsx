import Link from "next/link";
import { UserRoundPlus } from "lucide-react";
import { getSchoolMentors } from "@/lib/school-mentors";

export const dynamic = "force-dynamic";

export default async function SchoolMentorsPage() {
  const { mentors, featureEnabled } = await getSchoolMentors();
  return <main className="space-y-5 p-4 text-[15px] sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">People</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Mentors</h1><p className="mt-1 text-sm text-slate-600">Manage mentor accounts and student relationships.</p></div>{featureEnabled ? <Link href="/school-dashboard/people/mentors/new" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white">+ Add mentor</Link> : null}</header>
    {!featureEnabled ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Mentor onboarding is not enabled for this school.</p> : null}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">{mentors.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">Account</th><th className="px-4 py-2.5">Students</th><th className="px-4 py-2.5">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{mentors.map((mentor) => <tr key={mentor.id}><td className="px-4 py-3 font-semibold"><Link href={"/school-dashboard/people/mentors/" + mentor.id} className="text-blue-700 hover:underline">{mentor.name}</Link><span className="block text-xs font-normal text-slate-500">{mentor.designation}</span></td><td className="px-4 py-3 text-slate-600">{mentor.email}</td><td className="px-4 py-3 text-slate-600">{mentor.accountStatus}</td><td className="px-4 py-3">{mentor.assignedStudents}</td><td className="px-4 py-3"><span className={"rounded-full px-2 py-1 text-xs font-bold " + (mentor.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{mentor.active ? "Active" : "Inactive"}</span></td></tr>)}</tbody></table></div> : <p className="px-4 py-10 text-center text-sm text-slate-500">No mentors yet.</p>}</section>
  </main>;
}
