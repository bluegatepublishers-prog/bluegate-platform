import { FolderOpen } from "lucide-react";

import { getStudentClassMaterials } from "@/lib/student-class-materials";

export default async function StudentClassMaterialsPage() {
  const { materials } = await getStudentClassMaterials();
  const subjects = new Map<string, { name: string; items: typeof materials }>();
  for (const material of materials) {
    const group = subjects.get(material.subjectId) ?? { name: material.subject.name, items: [] };
    group.items.push(material);
    subjects.set(material.subjectId, group);
  }
  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header><p className="font-bold text-blue-700">Shared by your teachers</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Class Materials</h1><p className="mt-2 text-slate-600">Lesson plans, worksheets, presentations, videos, and other material for your current class.</p></header>
      {materials.length ? [...subjects.entries()].map(([subjectId, group]) => (
        <section key={subjectId} className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-2xl font-bold">{group.name}</h2>
          <div className="mt-5 space-y-3">
            {group.items.map((material) => (
              <article key={material.id} className="grid min-w-0 gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{label(material.kind)}</span>{material.chapter ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">Chapter {material.chapter.chapterNumber}</span> : null}</div><h3 className="mt-3 break-words text-lg font-bold">{material.title}</h3>{material.description ? <p className="mt-1 break-words text-sm text-slate-600">{material.description}</p> : null}<p className="mt-2 text-xs text-slate-500">Shared by {material.teacher.user.name}</p></div>
                <a href={`/api/class-materials/${material.id}/open`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Open</a>
              </article>
            ))}
          </div>
        </section>
      )) : (
        <section className="rounded-2xl border bg-white p-10 text-center shadow-sm"><FolderOpen className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-xl font-bold">No shared materials yet</h2><p className="mt-2 text-slate-600">Materials shared by your teachers will appear here.</p></section>
      )}
    </main>
  );
}
function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }
