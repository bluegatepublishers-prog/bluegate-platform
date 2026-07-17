import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BookAdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const actor = await requireLivePublisherAdmin();
  const { id } = await params;
  if (!process.env.DATABASE_URL) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8">Database configuration required.</div>;
  const book = await prisma.book.findFirst({ where: { id, publisherId: actor.publisherId }, select: { title: true } });
  if (!book) notFound();
  const tabs = [["Details", `/admin/books/${id}/edit`], ["Chapters", `/admin/books/${id}/chapters`], ["Question Bank", `/admin/books/${id}/questions`], ["Learning Outcomes", `/admin/books/${id}/learning-outcomes`], ["Classroom Activities", `/admin/books/${id}/activities`], ["AI Knowledge", `/admin/books/${id}/knowledge`]];
  return <div className="space-y-6"><div><p className="text-sm font-bold uppercase tracking-wider text-blue-700">Book knowledge</p><h1 className="mt-1 text-2xl font-bold">{book.title}</h1></div><nav aria-label="Book management" className="flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2">{tabs.map(([label, href]) => <Link key={href} href={href} className="shrink-0 rounded-xl px-4 py-2.5 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700">{label}</Link>)}</nav>{children}</div>;
}
