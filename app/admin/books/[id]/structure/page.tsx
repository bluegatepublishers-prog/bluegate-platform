import Link from "next/link";
import { notFound } from "next/navigation";

import StructureReorderList from "@/components/admin/StructureReorderList";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";
import type { BookStructureNodeType } from "@/lib/book-structure-management";
import {
  duplicateStructureNodeAction,
  moveStructureNodeAction,
  reorderStructureAction,
  saveStructureNodeAction,
  setStructureArchivedAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BookStructurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePublisherAdminBookOwnership(id);
  const book = await prisma.book.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      parts: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] },
      units: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] },
      chapters: { orderBy: [{ sortOrder: "asc" }, { chapterNumber: "asc" }] },
      modules: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] },
      topics: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!book) notFound();

  const reorderGroups: Array<{
    type: BookStructureNodeType;
    label: string;
    items: Array<{ id: string; label: string; meta: string }>;
  }> = [
    {
      type: "PART",
      label: "Parts and top-level modules",
      items: book.parts.map((item) => ({ id: item.id, label: item.title, meta: `${item.kind} · ${item.published ? "Published" : "Draft"}` })),
    },
    {
      type: "UNIT",
      label: "Units",
      items: book.units.map((item) => ({ id: item.id, label: item.title, meta: item.number ?? "Unit" })),
    },
    {
      type: "CHAPTER",
      label: "Chapters",
      items: book.chapters.map((item) => ({ id: item.id, label: `${item.chapterNumber}. ${item.title}`, meta: item.published ? "Published" : "Draft" })),
    },
    {
      type: "MODULE",
      label: "Chapter sections and lesson groups",
      items: book.modules.map((item) => ({ id: item.id, label: item.title, meta: item.number ?? "Lesson group" })),
    },
    {
      type: "TOPIC",
      label: "Topics and lessons",
      items: book.topics.map((item) => ({ id: item.id, label: item.title, meta: item.number ?? "Topic" })),
    },
  ];

  return (
    <main className="min-w-0 space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Flexible textbook structure</p>
        <h2 className="mt-1 break-words text-2xl font-bold">{book.title}</h2>
        <p className="mt-2 text-slate-600">
          Use only the levels this book needs. Existing chapter-only books remain valid.
        </p>
      </header>

      <details className="rounded-2xl border bg-white p-5" open={!book.chapters.length}>
        <summary className="cursor-pointer text-lg font-bold">Add structure item</summary>
        <StructureForm
          bookId={id}
          parts={book.parts}
          units={book.units}
          chapters={book.chapters}
          modules={book.modules}
        />
      </details>

      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">Structure outline</h3>
            <p className="text-sm text-slate-500">Archive preserves dependencies. Duplicate copies metadata without child records.</p>
          </div>
          <Link href={`/admin/books/${id}/chapters`} className="font-semibold text-blue-700">Open detailed chapter editor</Link>
        </div>
        <div className="mt-5 space-y-3">
          {book.parts.map((part) => (
            <div key={part.id} className="rounded-xl border bg-slate-50 p-4">
              <NodeLine bookId={id} type="PART" item={part} />
              <div className="mt-3 space-y-2 border-l-2 border-slate-200 pl-4">
                {book.units.filter((unit) => unit.partId === part.id).map((unit) => (
                  <div key={unit.id}>
                    <NodeLine bookId={id} type="UNIT" item={unit} parts={book.parts} />
                    <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                      {book.chapters.filter((chapter) => chapter.unitId === unit.id).map((chapter) => (
                        <ChapterBranch key={chapter.id} bookId={id} chapter={chapter} parts={book.parts} units={book.units} modules={book.modules} topics={book.topics} />
                      ))}
                    </div>
                  </div>
                ))}
                {book.chapters.filter((chapter) => chapter.partId === part.id && !chapter.unitId).map((chapter) => (
                  <ChapterBranch key={chapter.id} bookId={id} chapter={chapter} parts={book.parts} units={book.units} modules={book.modules} topics={book.topics} />
                ))}
              </div>
            </div>
          ))}
          {book.units.filter((unit) => !unit.partId).map((unit) => (
            <div key={unit.id} className="rounded-xl border p-4">
              <NodeLine bookId={id} type="UNIT" item={unit} parts={book.parts} />
              <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                {book.chapters.filter((chapter) => chapter.unitId === unit.id).map((chapter) => (
                  <ChapterBranch key={chapter.id} bookId={id} chapter={chapter} parts={book.parts} units={book.units} modules={book.modules} topics={book.topics} />
                ))}
              </div>
            </div>
          ))}
          {book.chapters.filter((chapter) => !chapter.unitId && !chapter.partId).map((chapter) => (
            <div key={chapter.id} className="rounded-xl border p-4">
              <ChapterBranch bookId={id} chapter={chapter} parts={book.parts} units={book.units} modules={book.modules} topics={book.topics} />
            </div>
          ))}
          {!book.parts.length && !book.units.length && !book.chapters.length ? (
            <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">No structure items yet.</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-bold">Drag to reorder</h3>
        <p className="text-sm text-slate-500">Drag rows or use the accessible arrow controls. Each change persists immediately.</p>
        {reorderGroups.filter((group) => group.items.length > 1).map((group) => (
          <details key={group.type} className="rounded-2xl border bg-white p-4">
            <summary className="cursor-pointer font-bold">{group.label}</summary>
            <div className="mt-3">
              <StructureReorderList
                items={group.items}
                action={reorderStructureAction.bind(null, id, group.type)}
              />
            </div>
          </details>
        ))}
      </section>
    </main>
  );
}

type Part = { id: string; title: string; archived: boolean };
type Unit = { id: string; title: string; partId: string | null; archived: boolean };
type Chapter = { id: string; title: string; chapterNumber: number; archived: boolean; published: boolean; unitId: string | null; partId: string | null };
type Module = { id: string; title: string; chapterId: string; archived: boolean; published: boolean };
type Topic = { id: string; title: string; chapterId: string; moduleId: string | null; archived: boolean; published: boolean };

function ChapterBranch({ bookId, chapter, parts, units, modules, topics }: { bookId: string; chapter: Chapter; parts: Part[]; units: Unit[]; modules: Module[]; topics: Topic[] }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <NodeLine bookId={bookId} type="CHAPTER" item={{ ...chapter, title: `${chapter.chapterNumber}. ${chapter.title}` }} parts={parts} units={units} />
      <div className="mt-2 space-y-2 border-l-2 border-slate-100 pl-4">
        {modules.filter((moduleNode) => moduleNode.chapterId === chapter.id).map((moduleNode) => (
          <div key={moduleNode.id}>
            <NodeLine bookId={bookId} type="MODULE" item={moduleNode} chapters={[chapter]} />
            <div className="mt-2 space-y-1 pl-4">
              {topics.filter((topic) => topic.moduleId === moduleNode.id).map((topic) => (
                <NodeLine key={topic.id} bookId={bookId} type="TOPIC" item={topic} chapters={[chapter]} modules={modules.filter((item) => item.chapterId === chapter.id)} />
              ))}
            </div>
          </div>
        ))}
        {topics.filter((topic) => topic.chapterId === chapter.id && !topic.moduleId).map((topic) => (
          <NodeLine key={topic.id} bookId={bookId} type="TOPIC" item={topic} chapters={[chapter]} modules={modules.filter((item) => item.chapterId === chapter.id)} />
        ))}
      </div>
    </div>
  );
}

function NodeLine({
  bookId,
  type,
  item,
  parts = [],
  units = [],
  chapters = [],
  modules = [],
}: {
  bookId: string;
  type: BookStructureNodeType;
  item: { id: string; title: string; archived: boolean; published?: boolean };
  parts?: Part[];
  units?: Unit[];
  chapters?: Chapter[];
  modules?: Module[];
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="break-words font-semibold">{item.title}</p>
        <p className="text-xs text-slate-500">{type} · {item.archived ? "Archived" : item.published ? "Published" : "Draft"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {type !== "PART" ? (
          <details className="relative">
            <summary className="min-h-10 cursor-pointer list-none rounded-lg border px-3 py-2 text-sm font-semibold">Move</summary>
            <form action={moveStructureNodeAction.bind(null, bookId, type, item.id)} className="absolute right-0 z-10 mt-2 grid w-72 gap-2 rounded-xl border bg-white p-3 shadow-xl">
              {type === "UNIT" ? <ParentSelect name="partId" label="Part / module" options={parts} allowEmpty /> : null}
              {type === "CHAPTER" ? <>
                <ParentSelect name="partId" label="Part / module" options={parts} allowEmpty />
                <ParentSelect name="unitId" label="Unit" options={units} allowEmpty />
              </> : null}
              {type === "MODULE" ? <ParentSelect name="chapterId" label="Chapter" options={chapters} /> : null}
              {type === "TOPIC" ? <>
                <ParentSelect name="chapterId" label="Chapter" options={chapters} />
                <ParentSelect name="moduleId" label="Lesson group (optional)" options={modules} allowEmpty />
              </> : null}
              <button className="min-h-10 rounded-lg bg-slate-900 px-3 font-semibold text-white">Move item</button>
            </form>
          </details>
        ) : null}
        <form action={duplicateStructureNodeAction.bind(null, bookId, type, item.id)}>
          <button className="min-h-10 rounded-lg border px-3 text-sm font-semibold">Duplicate</button>
        </form>
        <form action={setStructureArchivedAction.bind(null, bookId, type, item.id, !item.archived)}>
          <button className="min-h-10 rounded-lg border px-3 text-sm font-semibold">{item.archived ? "Restore" : "Archive"}</button>
        </form>
      </div>
    </div>
  );
}

function ParentSelect({ name, label, options, allowEmpty = false }: { name: string; label: string; options: Array<{ id: string; title: string }>; allowEmpty?: boolean }) {
  return (
    <label className="text-xs font-semibold">{label}
      <select name={name} required={!allowEmpty} className="mt-1 min-h-10 w-full rounded-lg border px-2 font-normal">
        {allowEmpty ? <option value="">None</option> : <option value="">Select</option>}
        {options.filter((item) => !("archived" in item) || !item.archived).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
    </label>
  );
}

function StructureForm({ bookId, parts, units, chapters, modules }: { bookId: string; parts: Part[]; units: Unit[]; chapters: Chapter[]; modules: Module[] }) {
  const field = "mt-1 min-h-11 w-full rounded-xl border px-3 font-normal";
  return (
    <form action={saveStructureNodeAction.bind(null, bookId)} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Item type
        <select name="type" className={field} defaultValue="CHAPTER">
          <option value="PART">Part or top-level module</option>
          <option value="UNIT">Unit</option>
          <option value="CHAPTER">Chapter</option>
          <option value="MODULE">Chapter section or lesson group</option>
          <option value="TOPIC">Topic or lesson</option>
        </select>
      </label>
      <label className="text-sm font-semibold">Part display type
        <select name="partKind" className={field}><option value="MODULE">Module</option><option value="PART">Part</option></select>
      </label>
      <label className="text-sm font-semibold sm:col-span-2">Title
        <input name="title" required maxLength={200} className={field} />
      </label>
      <label className="text-sm font-semibold">Subtitle<input name="subtitle" className={field} /></label>
      <label className="text-sm font-semibold">Short title<input name="shortTitle" className={field} /></label>
      <label className="text-sm font-semibold">Display label / number<input name="label" placeholder="Module 1, Unit 2, Chapter number" className={field} /></label>
      <label className="text-sm font-semibold">Stable slug<input name="slug" placeholder="Generated from title" className={field} /></label>
      <label className="text-sm font-semibold">Code<input name="code" className={field} /></label>
      <label className="text-sm font-semibold">Estimated minutes<input name="estimatedMinutes" type="number" min="0" className={field} /></label>
      <ParentSelect name="partId" label="Part / top-level module (when applicable)" options={parts} allowEmpty />
      <ParentSelect name="unitId" label="Unit (for a chapter)" options={units} allowEmpty />
      <ParentSelect name="chapterId" label="Chapter (for a lesson group/topic)" options={chapters} allowEmpty />
      <ParentSelect name="moduleId" label="Lesson group (optional for a topic)" options={modules} allowEmpty />
      <label className="text-sm font-semibold">Page start<input name="pageStart" type="number" min="1" className={field} /></label>
      <label className="text-sm font-semibold">Page end<input name="pageEnd" type="number" min="1" className={field} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Thumbnail or image<input name="imageUrl" className={field} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Description<textarea name="description" rows={3} className={field} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Learning objectives (one per line)<textarea name="learningObjectives" rows={4} className={field} /></label>
      <label className="text-sm font-semibold">Learning outcomes<textarea name="learningOutcomes" rows={4} className={field} /></label>
      <label className="text-sm font-semibold">Key concepts<textarea name="keyConcepts" rows={4} className={field} /></label>
      <label className="text-sm font-semibold">Keywords<textarea name="keywords" rows={4} className={field} /></label>
      <label className="text-sm font-semibold">Chapter overview<textarea name="overview" rows={4} className={field} /></label>
      <details className="sm:col-span-2 rounded-xl border p-4">
        <summary className="cursor-pointer font-bold">Optional curriculum and teaching content</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            ["prerequisiteKnowledge", "Prerequisite knowledge"],
            ["competencyCodes", "Competency codes"],
            ["curriculumMapping", "Curriculum mapping"],
            ["alignment", "NEP / NCF alignment"],
            ["assessmentObjectives", "Assessment objectives"],
            ["teachingNotes", "Teaching notes"],
            ["teacherGuidance", "Teacher guidance"],
            ["studentInstructions", "Student instructions"],
            ["activitySuggestions", "Activity suggestions"],
            ["projectSuggestions", "Project suggestions"],
            ["labActivities", "Lab activities"],
            ["realLifeApplication", "Real-life application"],
            ["caseStudies", "Case studies"],
            ["contentSummary", "Summary"],
            ["glossary", "Glossary"],
            ["references", "References"],
          ].map(([name, label]) => (
            <label key={name} className="text-sm font-semibold">{label}<textarea name={name} rows={3} className={field} /></label>
          ))}
        </div>
      </details>
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" name="published" className="size-5" /> Publish now</label>
      <div className="sm:col-span-2">
        <button className="min-h-12 rounded-xl bg-blue-700 px-6 font-semibold text-white">Add structure item</button>
      </div>
    </form>
  );
}
