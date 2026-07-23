import { prisma } from "@/lib/prisma";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";
import KnowledgeActionButton from "@/components/admin/KnowledgeActionButton";
import {
  deleteOutcome,
  moveOutcome,
  saveOutcome,
} from "../knowledge-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const inputClass = "rounded-xl border px-3 py-2";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePublisherAdminBookOwnership(id);
  const chapters = await prisma.bookChapter.findMany({
    where: { bookId: id },
    include: { learningOutcomes: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
    orderBy: { sortOrder: "asc" },
  });
  const action = saveOutcome.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Learning Outcomes (Topics)</h2>
        <p className="mt-1 text-slate-600">Ordered outcomes are part of chapter readiness rules.</p>
      </div>
      <form action={action} className="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-5">
        <select required name="chapterId" className={inputClass}>
          <option value="">Select chapter</option>
          {chapters.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.chapterNumber}. {chapter.title}
            </option>
          ))}
        </select>
        <input required name="outcome" placeholder="Learning outcome" className={`${inputClass} md:col-span-2`} />
        <input name="bloomLevel" placeholder="Bloom level" className={inputClass} />
        <input name="competency" placeholder="Competency" className={inputClass} />
        <input type="number" min="0" name="sortOrder" placeholder="Order" className={inputClass} />
        <button className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white">Add topic</button>
      </form>

      {chapters.some((chapter) => chapter.learningOutcomes.length) ? (
        <div className="space-y-5">
          {chapters.filter((chapter) => chapter.learningOutcomes.length).map((chapter) => (
            <section key={chapter.id} className="rounded-3xl border bg-white p-6">
              <h3 className="font-bold">{chapter.chapterNumber}. {chapter.title}</h3>
              <div className="mt-4 space-y-3">
                {chapter.learningOutcomes.map((outcome) => (
                  <form key={outcome.id} action={action} className="grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-[1fr_140px_140px_90px_auto]">
                    <input type="hidden" name="id" value={outcome.id} />
                    <input type="hidden" name="chapterId" value={chapter.id} />
                    <input name="outcome" defaultValue={outcome.outcome} className={inputClass} />
                    <input name="bloomLevel" defaultValue={outcome.bloomLevel ?? ""} className={inputClass} />
                    <input name="competency" defaultValue={outcome.competency ?? ""} className={inputClass} />
                    <input type="number" min="0" name="sortOrder" defaultValue={outcome.sortOrder} className={inputClass} />
                    <div className="flex items-center gap-3">
                      <button className="font-semibold text-blue-700">Save</button>
                      <KnowledgeActionButton action={moveOutcome.bind(null, id, outcome.id, -1)} label="↑" className="text-slate-700" />
                      <KnowledgeActionButton action={moveOutcome.bind(null, id, outcome.id, 1)} label="↓" className="text-slate-700" />
                      <KnowledgeActionButton action={deleteOutcome.bind(null, id, outcome.id)} label="Delete" confirmMessage="Delete this topic?" />
                    </div>
                  </form>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border bg-white p-14 text-center text-slate-500">No learning outcomes yet.</div>
      )}
    </div>
  );
}
