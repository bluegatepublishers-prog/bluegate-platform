import { BookContentTargetType, ResourceAudience } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";
import {
  attachResourceAction,
  detachResourceAction,
  moveResourceAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BookDigitalContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePublisherAdminBookOwnership(id);
  const [book, resources, links] = await Promise.all([
    prisma.book.findUnique({
      where: { id },
      select: {
        title: true,
        parts: { where: { archived: false }, select: { id: true, title: true }, orderBy: { displayOrder: "asc" } },
        units: { where: { archived: false }, select: { id: true, title: true }, orderBy: { displayOrder: "asc" } },
        chapters: { where: { archived: false }, select: { id: true, title: true, chapterNumber: true }, orderBy: { sortOrder: "asc" } },
        modules: { where: { archived: false }, select: { id: true, title: true }, orderBy: { displayOrder: "asc" } },
        topics: { where: { archived: false }, select: { id: true, title: true }, orderBy: { displayOrder: "asc" } },
      },
    }),
    prisma.resource.findMany({
      where: { publisherId: actor.publisherId, archived: false },
      select: { id: true, title: true, type: true, audience: true, published: true },
      orderBy: [{ type: "asc" }, { title: "asc" }],
    }),
    prisma.bookResourceLink.findMany({
      where: { bookId: id, publisherId: actor.publisherId, active: true },
      include: {
        resource: { select: { title: true, type: true, audience: true, published: true } },
        part: { select: { title: true } },
        unit: { select: { title: true } },
        chapter: { select: { title: true, chapterNumber: true } },
        module: { select: { title: true } },
        topic: { select: { title: true } },
      },
      orderBy: [{ targetKey: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  if (!book) notFound();

  return (
    <main className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Chapter resources and digital content</h2>
          <p className="mt-2 text-slate-600">Link an existing publisher file to multiple book targets without duplicating storage.</p>
        </div>
        <Link href="/admin/resources/new" className="min-h-11 rounded-xl border px-4 py-2.5 font-semibold text-blue-700">Upload a new publisher resource</Link>
      </header>

      <form action={attachResourceAction.bind(null, id)} className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
        <h3 className="text-lg font-bold sm:col-span-2 lg:col-span-3">Attach existing resource</h3>
        <label className="text-sm font-semibold sm:col-span-2">Resource
          <select name="resourceId" required className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal">
            <option value="">Select resource</option>
            {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.type} · {resource.title} · {resource.audience}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Target type
          <select name="targetType" defaultValue="CHAPTER" className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal">
            {Object.values(BookContentTargetType).map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <Target name="partId" label="Part / top-level module" options={book.parts} />
        <Target name="unitId" label="Unit" options={book.units} />
        <Target name="chapterId" label="Chapter" options={book.chapters.map((item) => ({ id: item.id, title: `${item.chapterNumber}. ${item.title}` }))} />
        <Target name="moduleId" label="Chapter section / lesson group" options={book.modules} />
        <Target name="topicId" label="Topic / lesson" options={book.topics} />
        <label className="text-sm font-semibold">Audience override
          <select name="audienceOverride" className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal">
            <option value="">Use resource audience</option>
            {Object.values(ResourceAudience).map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <div className="sm:col-span-2 lg:col-span-3">
          <button className="min-h-12 rounded-xl bg-blue-700 px-6 font-semibold text-white">Attach resource</button>
        </div>
      </form>

      <section>
        <h3 className="text-xl font-bold">Linked resources</h3>
        <div className="mt-3 divide-y rounded-2xl border bg-white">
          {links.map((link) => (
            <article key={link.id} className="grid min-w-0 gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <p className="break-words font-bold">{link.resource.title}</p>
                <p className="text-sm text-slate-600">
                  {link.resource.type} · {link.audienceOverride ?? link.resource.audience} · {link.resource.published ? "Published" : "Draft"}
                </p>
                <p className="mt-1 break-words text-xs text-slate-500">
                  {link.targetType}: {targetLabel(link)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={moveResourceAction.bind(null, id, link.id, -1)}><button className="min-h-10 min-w-10 rounded-lg border">↑</button></form>
                <form action={moveResourceAction.bind(null, id, link.id, 1)}><button className="min-h-10 min-w-10 rounded-lg border">↓</button></form>
                <form action={detachResourceAction.bind(null, id, link.id)}><button className="min-h-10 rounded-lg border px-3 font-semibold text-rose-700">Detach</button></form>
              </div>
            </article>
          ))}
          {!links.length ? <p className="p-10 text-center text-slate-500">No linked digital content yet.</p> : null}
        </div>
      </section>


    </main>
  );
}

function Target({ name, label, options }: { name: string; label: string; options: Array<{ id: string; title: string }> }) {
  return (
    <label className="text-sm font-semibold">{label}
      <select name={name} className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal">
        <option value="">Not selected</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
      </select>
    </label>
  );
}

function targetLabel(link: {
  bookId: string;
  part: { title: string } | null;
  unit: { title: string } | null;
  chapter: { title: string; chapterNumber: number } | null;
  module: { title: string } | null;
  topic: { title: string } | null;
}) {
  return link.part?.title
    ?? link.unit?.title
    ?? (link.chapter ? `${link.chapter.chapterNumber}. ${link.chapter.title}` : null)
    ?? link.module?.title
    ?? link.topic?.title
    ?? "Book";
}
