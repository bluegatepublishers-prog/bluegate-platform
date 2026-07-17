import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { adoptionInclude } from "@/lib/book-adoptions";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { reviewAdoption, revokeAdoption } from "../actions";

export const dynamic = "force-dynamic";

export default async function BookAdoptionPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireLivePublisherAdmin();
  const { id } = await params;
  const item = await prisma.schoolBookAdoption.findFirst({ where: { id, publisherId: actor.publisherId }, include: adoptionInclude });
  if (!item) notFound();
  const history = await prisma.schoolBookAdoption.findMany({ where: { publisherId: actor.publisherId, schoolId: item.schoolId, bookId: item.bookId, id: { not: id } }, include: { academicYear: true, section: true }, orderBy: { requestedAt: "desc" } });

  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold">Book Approval Request</h1><p className="mt-2 text-slate-600">Current status: <strong>{item.status}</strong></p></header>
    <section className="grid gap-6 rounded-3xl border bg-white p-6 lg:grid-cols-[180px_1fr]">{item.book.coverImage ? <Image src={item.book.coverImage} alt={item.book.title} width={180} height={250} className="rounded-xl object-cover" /> : <div className="rounded-xl bg-slate-100" />}<dl className="grid gap-4 sm:grid-cols-2">{[["School", item.school.schoolName], ["Academic year", item.academicYear.name], ["Class", item.schoolClass.name], ["Section", item.section.name], ["Subject", item.sectionSubject.subject.name], ["Book", item.book.title], ["Requested by", item.requestedBy?.name ?? "School"], ["Requested", item.requestedAt.toLocaleString("en-IN")]].map(([key, value]) => <div key={key} className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-bold uppercase text-slate-500">{key}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl></section>
    {item.requestNote && <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Request note</h2><p className="mt-2 whitespace-pre-wrap">{item.requestNote}</p></section>}
    {item.status === "PENDING" && <section className="rounded-2xl border bg-white p-5"><form className="space-y-4"><textarea name="reviewNote" placeholder="Optional review note" className="w-full rounded-xl border p-4" /><div className="flex gap-3"><button formAction={reviewAdoption.bind(null, id, "APPROVED")} className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white">Approve</button><button formAction={reviewAdoption.bind(null, id, "REJECTED")} className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white">Reject</button></div></form></section>}
    {item.status === "APPROVED" && <form action={revokeAdoption.bind(null, id)} className="rounded-2xl border bg-white p-5"><textarea required name="reviewNote" placeholder="Reason for revocation" className="w-full rounded-xl border p-4" /><button className="mt-3 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white">Revoke access</button></form>}
    <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Previous adoption history</h2>{history.length ? <ul className="mt-3 space-y-2">{history.map((entry) => <li key={entry.id}>{entry.academicYear.name} · Section {entry.section.name} · {entry.status}</li>)}</ul> : <p className="mt-2 text-slate-500">No previous adoption history.</p>}</section>
  </div>;
}
