import Link from "next/link";
import { BookAdoptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BookAdoptionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireLivePublisherAdmin();
  const params = await searchParams;
  const status = Object.values(BookAdoptionStatus).find((value) => value === params.status);
  const rows = await prisma.schoolBookAdoption.findMany({
    where: { publisherId: actor.publisherId, status },
    include: { school: true, academicYear: true, schoolClass: true, section: true, sectionSubject: { include: { subject: true } }, book: true },
    orderBy: { requestedAt: "desc" },
  });

  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold">Book Approvals</h1><p className="mt-2 text-slate-600">Review annual school book-adoption requests.</p></header>
    <form className="rounded-2xl border bg-white p-4"><select name="status" defaultValue={status ?? ""} className="rounded-xl border px-4 py-3"><option value="">All statuses</option>{Object.values(BookAdoptionStatus).map((value) => <option key={value}>{value}</option>)}</select><button className="ml-3 rounded-xl bg-slate-900 px-5 py-3 text-white">Filter</button></form>
    {rows.length ? <div className="overflow-x-auto rounded-3xl border bg-white"><table className="w-full min-w-[1000px]"><thead className="bg-slate-50 text-left"><tr><th className="p-4">School</th><th>Academic year</th><th>Class / section</th><th>Subject</th><th>Book</th><th>Status</th><th>Requested</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="p-4 font-semibold">{row.school.schoolName}</td><td>{row.academicYear.name}</td><td>{row.schoolClass.name} / {row.section.name}</td><td>{row.sectionSubject.subject.name}</td><td>{row.book.title}</td><td>{row.status}</td><td>{row.requestedAt.toLocaleDateString("en-IN")}</td><td><Link className="font-semibold text-blue-700" href={`/admin/book-adoptions/${row.id}`}>Review</Link></td></tr>)}</tbody></table></div> : <div className="rounded-3xl border bg-white p-14 text-center text-slate-500">No matching book-approval requests.</div>}
  </div>;
}
