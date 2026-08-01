import Link from "next/link";
import { Plus, Search } from "lucide-react";

import BookTable from "@/components/admin/books/BookTable";
import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { bookCoverPath } from "@/lib/storage/book-asset-path";
import type { BookTableItem } from "@/types/admin-book";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Books | Bluegate Admin" };

type Filters = { q?:string; classId?:string; subjectId?:string; boardId?:string; seriesId?:string; status?:string };

export default async function BooksPage({ searchParams }:{ searchParams:Promise<Filters> }) {
  const actor=await requireLivePublisherAdmin(); const filters=await searchParams;
  const where={
    publisherId:actor.publisherId,
    ...(filters.q?.trim()?{OR:[{title:{contains:filters.q.trim(),mode:"insensitive" as const}},{author:{contains:filters.q.trim(),mode:"insensitive" as const}},{isbn:{contains:filters.q.trim(),mode:"insensitive" as const}}]}:{}),
    ...(filters.classId?{classId:filters.classId}:{}), ...(filters.subjectId?{subjectId:filters.subjectId}:{}),
    ...(filters.boardId?{boardId:filters.boardId}:{}), ...(filters.seriesId?{seriesId:filters.seriesId}:{}),
    ...(filters.status==="published"?{published:true,archived:false}:filters.status==="draft"?{published:false,archived:false}:filters.status==="archived"?{archived:true}:{}),
  };
  const [books,classes,subjects,boards,series]=await Promise.all([
    prisma.book.findMany({where,include:{class:true,subject:true,series:true,boardRecord:true},orderBy:[{updatedAt:"desc"},{title:"asc"}]}),
    prisma.class.findMany({where:{active:true},select:{id:true,name:true},orderBy:{sortOrder:"asc"}}),
    prisma.subject.findMany({where:{active:true},select:{id:true,name:true},orderBy:{sortOrder:"asc"}}),
    prisma.board.findMany({where:{publisherId:actor.publisherId,active:true},select:{id:true,name:true},orderBy:[{displayOrder:"asc"},{name:"asc"}]}),
    prisma.bookSeries.findMany({where:{publisherId:actor.publisherId,active:true},select:{id:true,name:true},orderBy:{name:"asc"}}),
  ]);
  const rows:BookTableItem[]=books.map(book=>({id:book.id,title:book.title,slug:book.slug,author:book.author,isbn:book.isbn,edition:book.edition,price:book.price?.toString()??null,subtitle:book.subtitle,coverImage:bookCoverPath(book.id,book.coverImage),featured:book.featured,featuredOrder:book.featuredOrder,published:book.published,archived:book.archived,board:book.boardRecord?.name??book.board,publicPreviewAvailable:Boolean(book.publicPreviewPdf||book.samplePdf),fullBookAvailable:Boolean(book.fullBookPdf),class:book.class,subject:book.subject,series:book.series,createdAt:book.createdAt.toISOString(),updatedAt:book.updatedAt.toISOString()}));
  return <main className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Content</p><h1 className="mt-1 text-3xl font-bold">Books</h1><p className="mt-1 text-slate-600">Choose a Book, then open its Content Studio.</p></div><Link href="/admin/books/new" className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"><Plus className="mr-2 h-5 w-5"/>Add Book</Link></header>
    <form className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-3 xl:grid-cols-6"><label className="relative md:col-span-3 xl:col-span-1"><span className="sr-only">Search books</span><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input name="q" defaultValue={filters.q} placeholder="Search books" className="w-full rounded-xl border py-3 pl-10 pr-3"/></label><Filter name="classId" label="All classes" value={filters.classId} options={classes}/><Filter name="subjectId" label="All subjects" value={filters.subjectId} options={subjects}/><Filter name="boardId" label="All boards" value={filters.boardId} options={boards}/><Filter name="seriesId" label="All series" value={filters.seriesId} options={series}/><div className="flex gap-2"><select name="status" defaultValue={filters.status??""} aria-label="Status" className="min-w-0 flex-1 rounded-xl border px-3"><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select><button className="rounded-xl bg-slate-900 px-4 font-semibold text-white">Apply</button></div></form>
    <div className="flex items-center justify-between text-sm text-slate-500"><span>{rows.length} {rows.length===1?"Book":"Books"}</span>{Object.values(filters).some(Boolean)?<Link href="/admin/books" className="font-semibold text-blue-700">Clear filters</Link>:null}</div><BookTable books={rows} filtered={Object.values(filters).some(Boolean)}/></main>;
}

function Filter({name,label,value,options}:{name:string;label:string;value?:string;options:Array<{id:string;name:string}>}){return <select name={name} defaultValue={value??""} aria-label={label} className="rounded-xl border px-3"><option value="">{label}</option>{options.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}</select>}
