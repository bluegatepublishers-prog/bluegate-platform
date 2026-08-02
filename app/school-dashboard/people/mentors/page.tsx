import Link from "next/link";
import { UserRoundPlus, UsersRound } from "lucide-react";
import { getSchoolMentors } from "@/lib/school-mentors";

export const dynamic = "force-dynamic";

export default async function SchoolMentorsPage() {
  const { mentors, featureEnabled } = await getSchoolMentors();
  return <main className="space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-bold text-blue-700">People</p><h1 className="mt-2 text-3xl font-bold">Mentors</h1><p className="mt-2 text-slate-600">Invite school mentors, manage account readiness, and control student assignments.</p></div><Link href="/school-dashboard/people/mentors/new" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"><UserRoundPlus className="h-5 w-5"/>Add Mentor</Link></header>
    {!featureEnabled?<p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">Mentor onboarding is not enabled for this school. Contact your publisher administrator.</p>:null}
    <section className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-700"><UsersRound/></span><div><h2 className="text-xl font-bold">School Mentors</h2><p className="text-sm text-slate-500">{mentors.length} mentor account{mentors.length===1?"":"s"}</p></div></div>
      {mentors.length?<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{mentors.map((mentor)=><Link key={mentor.id} href={`/school-dashboard/people/mentors/${mentor.id}`} className="rounded-2xl border p-5 transition hover:border-blue-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{mentor.name}</h3><p className="mt-1 text-sm text-slate-500">{mentor.designation}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${mentor.active?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-600"}`}>{mentor.active?"Active":"Inactive"}</span></div><p className="mt-4 text-sm text-slate-600">{mentor.email}</p><p className="mt-1 text-sm text-slate-500">{mentor.phone||"No phone added"}</p><div className="mt-4 flex items-center justify-between border-t pt-4 text-xs font-semibold text-slate-600"><span>{mentor.accountStatus}</span><span>{mentor.assignedStudents} assigned</span></div></Link>)}</div>:<div className="py-16 text-center"><UsersRound className="mx-auto h-12 w-12 text-slate-300"/><h3 className="mt-4 text-lg font-bold">No mentors yet</h3><p className="mt-2 text-sm text-slate-500">Add a mentor and send a secure account activation invitation.</p></div>}
    </section>
  </main>;
}
