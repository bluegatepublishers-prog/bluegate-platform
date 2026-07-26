import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";
import {
  archiveFeatureDefinitionAction,
  attachFeatureAction,
  createFeatureAction,
  detachFeatureAction,
  updateFeatureAssignmentAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BookFeaturesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePublisherAdminBookOwnership(id);
  const [book, definitions] = await Promise.all([
    prisma.book.findUnique({
      where: { id },
      select: {
        title: true,
        features: true,
        featureAssignments: {
          where: { active: true },
          include: { feature: true },
          orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
    prisma.bookFeatureDefinition.findMany({
      where: { publisherId: actor.publisherId, active: true },
      orderBy: { title: "asc" },
    }),
  ]);
  if (!book) notFound();
  const attached = new Set(book.featureAssignments.map((item) => item.featureId));

  return (
    <main className="min-w-0 space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Book features</h2>
        <p className="mt-2 text-slate-600">Reusable publisher features with custom book-level text, highlighting, and order.</p>
      </header>

      {book.features.length ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-bold">Legacy feature text retained</h3>
          <p className="mt-1 text-sm text-slate-600">These existing values remain available and can be migrated gradually.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {book.features.map((feature) => <li key={feature} className="rounded-full bg-white px-3 py-1 text-sm">{feature}</li>)}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <form action={attachFeatureAction.bind(null, id)} className="grid gap-3 rounded-2xl border bg-white p-5">
          <h3 className="text-lg font-bold">Add reusable feature</h3>
          <label className="text-sm font-semibold">Feature
            <select name="featureId" required className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal">
              <option value="">Select feature</option>
              {definitions.filter((item) => !attached.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Custom description
            <textarea name="customText" maxLength={500} rows={3} className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" />
          </label>
          <label className="flex min-h-11 items-center gap-3 font-semibold"><input type="checkbox" name="highlighted" className="size-5" /> Highlight this feature</label>
          <button disabled={definitions.every((item) => attached.has(item.id))} className="min-h-11 rounded-xl bg-blue-700 px-5 font-semibold text-white disabled:opacity-50">Add feature</button>
        </form>

        <form action={createFeatureAction.bind(null, id)} className="grid gap-3 rounded-2xl border bg-white p-5">
          <h3 className="text-lg font-bold">Create custom or master feature</h3>
          <label className="text-sm font-semibold">Title<input name="title" required maxLength={160} className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal" /></label>
          <label className="text-sm font-semibold">Short description<textarea name="description" maxLength={500} rows={2} className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" /></label>
          <label className="text-sm font-semibold">Icon name or symbol<input name="icon" maxLength={80} className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal" /></label>
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="attach" defaultChecked className="size-5" /> Add to this book</label>
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="highlighted" className="size-5" /> Highlight</label>
          </div>
          <button className="min-h-11 rounded-xl bg-slate-900 px-5 font-semibold text-white">Create feature</button>
        </form>
      </section>

      <section>
        <h3 className="text-xl font-bold">Features on this book</h3>
        <div className="mt-3 divide-y rounded-2xl border bg-white">
          {book.featureAssignments.map((assignment) => (
            <article key={assignment.id} className="grid min-w-0 gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)] lg:items-end">
              <div className="min-w-0">
                <p className="break-words font-bold">{assignment.feature.icon ? `${assignment.feature.icon} ` : ""}{assignment.feature.title}</p>
                <p className="break-words text-sm text-slate-500">{assignment.customText ?? assignment.feature.description ?? "No description"}</p>
              </div>
              <form action={updateFeatureAssignmentAction.bind(null, id, assignment.id)} className="flex min-w-0 flex-wrap items-end gap-2">
                <label className="min-w-[12rem] flex-1 text-xs font-semibold">Custom text<input name="customText" defaultValue={assignment.customText ?? ""} className="mt-1 min-h-10 w-full rounded-lg border px-2 font-normal" /></label>
                <label className="flex min-h-10 items-center gap-2 text-sm font-semibold"><input type="checkbox" name="highlighted" defaultChecked={assignment.highlighted} className="size-5" /> Highlight</label>
                <button name="direction" value="-1" className="min-h-10 min-w-10 rounded-lg border">↑</button>
                <button name="direction" value="1" className="min-h-10 min-w-10 rounded-lg border">↓</button>
                <button className="min-h-10 rounded-lg border px-3 font-semibold">Save</button>
              </form>
              <form action={detachFeatureAction.bind(null, id, assignment.id)} className="lg:col-start-2">
                <button className="text-sm font-semibold text-rose-700">Remove from book</button>
              </form>
            </article>
          ))}
          {!book.featureAssignments.length ? <p className="p-8 text-center text-slate-500">No managed features yet.</p> : null}
        </div>
      </section>

      <details className="rounded-2xl border bg-white p-4">
        <summary className="cursor-pointer font-bold">Manage reusable feature catalogue</summary>
        <ul className="mt-3 divide-y">
          {definitions.map((feature) => (
            <li key={feature.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="font-semibold">{feature.title}</span>
              <form action={archiveFeatureDefinitionAction.bind(null, id, feature.id)}>
                <button disabled={attached.has(feature.id)} title={attached.has(feature.id) ? "Remove it from this book before archiving." : undefined} className="min-h-10 rounded-lg border px-3 text-sm font-semibold disabled:opacity-40">Archive master feature</button>
              </form>
            </li>
          ))}
        </ul>
      </details>
    </main>
  );
}
