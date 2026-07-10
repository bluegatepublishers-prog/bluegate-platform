import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import BookTable from "@/components/admin/books/BookTable";
import type { BookTableItem } from "@/types/admin-book";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Books | Bluegate Admin" };
const PAGE_SIZE = 15;

export default async function BooksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] : "";
  const q = value("q").trim();
  const classId = value("classId");
  const subjectId = value("subjectId");
  const seriesId = value("seriesId");
  const status = value("status");
  const featured = value("featured");
  const page = Math.max(1, Number(value("page")) || 1);

  if (!process.env.DATABASE_URL) return <State title="Database configuration required" message="DATABASE_URL is not configured." />;

  const where: Prisma.BookWhereInput = {
    ...(q ? { OR: ["title", "subtitle", "isbn", "author", "publisher"].map((field) => ({ [field]: { contains: q, mode: "insensitive" } })) } : {}),
    ...(classId ? { classId } : {}), ...(subjectId ? { subjectId } : {}), ...(seriesId ? { seriesId } : {}),
    ...(status === "published" ? { published: true } : status === "draft" ? { published: false } : {}),
    ...(featured === "yes" ? { featured: true } : featured === "no" ? { featured: false } : {}),
  };

  try {
    const [books, total, allCount, publishedCount, featuredCount, classes, subjects, series] = await Promise.all([
      prisma.book.findMany({ where, include: { class: true, subject: true, series: true }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      prisma.book.count({ where }), prisma.book.count(), prisma.book.count({ where: { published: true } }), prisma.book.count({ where: { featured: true } }),
      prisma.class.findMany({ orderBy: { name: "asc" } }), prisma.subject.findMany({ orderBy: { name: "asc" } }), prisma.bookSeries.findMany({ orderBy: { name: "asc" } }),
    ]);
    const items: BookTableItem[] = books.map((book) => ({ id: book.id, title: book.title, slug: book.slug, subtitle: book.subtitle, author: book.author, isbn: book.isbn, edition: book.edition, price: book.price?.toString() ?? null, coverImage: book.coverImage, featured: book.featured, published: book.published, class: { name: book.class.name }, subject: { name: book.subject.name }, series: book.series ? { name: book.series.name } : null, createdAt: book.createdAt.toISOString(), updatedAt: book.updatedAt.toISOString() }));
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const pageHref = (next: number) => { const query = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => { if (typeof v === "string" && k !== "page" && v) query.set(k, v); }); query.set("page", String(next)); return `/admin/books?${query}`; };
    return <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold text-slate-900">Book Management</h1><p className="mt-2 text-slate-600">Manage Bluegate’s publication catalogue and visibility.</p></div><Link href="/admin/books/new" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"><Plus className="mr-2 h-5 w-5" />Add Book</Link></div>
      <div className="grid gap-4 sm:grid-cols-3"><Stat label="Total books" value={allCount}/><Stat label="Published" value={publishedCount}/><Stat label="Featured" value={featuredCount}/></div>
      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3 xl:grid-cols-7">
        <label className="relative md:col-span-3 xl:col-span-2"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input name="q" defaultValue={q} placeholder="Title, ISBN, author, publisher" className="w-full rounded-lg border py-3 pl-10 pr-3"/></label>
        <Filter name="classId" value={classId} label="All classes" options={classes}/><Filter name="subjectId" value={subjectId} label="All subjects" options={subjects}/><Filter name="seriesId" value={seriesId} label="All series" options={series}/>
        <select name="status" defaultValue={status} className="rounded-lg border px-3 py-3"><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select>
        <div className="flex gap-2"><button className="flex-1 rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white">Filter</button><Link href="/admin/books" className="rounded-lg border px-4 py-3">Clear</Link></div>
      </form>
      <BookTable books={items} filtered={Boolean(q || classId || subjectId || seriesId || status || featured)} />
      {total > 0 && <div className="flex items-center justify-between text-sm text-slate-600"><span>Page {page} of {pageCount} · {total} result{total === 1 ? "" : "s"}</span><div className="flex gap-2">{page > 1 && <Link className="rounded-lg border bg-white px-4 py-2" href={pageHref(page - 1)}>Previous</Link>}{page < pageCount && <Link className="rounded-lg border bg-white px-4 py-2" href={pageHref(page + 1)}>Next</Link>}</div></div>}
    </div>;
  } catch { return <State title="Unable to load books" message="The database is currently unavailable. Try again shortly." />; }
}

function Filter({ name, value, label, options }: { name: string; value: string; label: string; options: Array<{ id: string; name: string }> }) { return <select name={name} defaultValue={value} className="rounded-lg border px-3 py-3"><option value="">{label}</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold text-slate-900">{value}</p></div>; }
function State({ title, message }: { title: string; message: string }) { return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 text-slate-700">{message}</p></div>; }
