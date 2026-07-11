import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminBookPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id }, select: { id:true,title:true,published:true,coverImage:true,subtitle:true,author:true,isbn:true,edition:true,publisher:true,price:true,description:true,aboutBook:true,publicPreviewPdf:true,samplePdf:true,fullBookPdf:true,class:{select:{name:true}},subject:{select:{name:true}},series:{select:{name:true}} } });
  if (!book) notFound();
  const details = [["Author", book.author], ["Class", book.class.name], ["Subject", book.subject.name], ["Series", book.series?.name], ["ISBN", book.isbn], ["Edition", book.edition], ["Publisher", book.publisher], ["Price", book.price ? `₹${book.price}` : null]];
  const preview=book.publicPreviewPdf||book.samplePdf;return <div className="space-y-6"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Admin preview · {book.published ? "Published" : "Draft"}</p><h1 className="mt-1 text-3xl font-bold">{book.title}</h1></div><Link href={`/admin/books/${book.id}/edit`} className="rounded-xl border bg-white px-4 py-2">Edit book</Link></div><div className="grid gap-8 rounded-2xl border bg-white p-6 shadow-sm lg:grid-cols-[260px_1fr]">{book.coverImage ? <Image src={book.coverImage} alt={book.title} width={260} height={360} className="w-full rounded-xl object-cover"/> : <div className="flex min-h-80 items-center justify-center rounded-xl bg-slate-100"><FileText className="h-12 w-12 text-slate-300"/></div>}<div><p className="text-lg text-slate-500">{book.subtitle}</p><dl className="mt-6 grid gap-4 sm:grid-cols-2">{details.map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="mt-1 font-medium">{value || "—"}</dd></div>)}</dl><p className="mt-6 leading-7 text-slate-700">{book.description || book.aboutBook || "No description supplied."}</p><div className="mt-6 flex flex-wrap gap-3">{preview&&<a href={preview} target="_blank" rel="noreferrer" className="inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">Open Public Preview</a>}{book.fullBookPdf&&<a href={`/api/books/${book.id}/full-pdf`} target="_blank" rel="noreferrer" className="inline-flex rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">Open Full Book</a>}</div><p className="mt-4 text-sm font-semibold text-slate-600">Public Preview: {preview?"Available":"Missing"} · Full Book: {book.fullBookPdf?"Available":"Missing"}</p></div></div><Link href="/admin/books" className="inline-flex items-center text-sm font-semibold text-slate-600"><ArrowLeft className="mr-2 h-4 w-4"/>Back to books</Link></div>;
}
