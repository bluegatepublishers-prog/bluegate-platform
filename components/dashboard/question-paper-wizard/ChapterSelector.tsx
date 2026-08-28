import AIReadyBadge from "./AIReadyBadge";
import type {
  WizardChapter,
} from "./types";

export default function ChapterSelector({
  chapters,
  selected,
  onToggle,
}: {
  chapters: WizardChapter[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {chapters.map((chapter) => {
        const ready = chapter.releaseReady;

        return (
          <label
            key={chapter.id}
            className={`flex gap-4 rounded-2xl border p-5 ${
              ready
                ? "cursor-pointer"
                : "cursor-not-allowed bg-slate-50 opacity-75"
            }`}
          >
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-blue-600"
              disabled={!ready}
              checked={selected.includes(
                chapter.id,
              )}
              onChange={() =>
                onToggle(chapter.id)
              }
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-bold">
                  {chapter.chapterNumber > 0
                    ? `Chapter ${chapter.chapterNumber}: `
                    : ""}
                  {chapter.title}
                </h3>

                <AIReadyBadge
                  ready={ready}
                />
              </div>

              <p className="mt-3 text-sm text-slate-500">
                Published Smart Book V2 chapter
                {chapter.startPage !== null &&
                chapter.endPage !== null
                  ? ` - pages ${chapter.startPage}-${chapter.endPage}`
                  : ""}
              </p>

              {!ready && (
                <p className="mt-2 text-sm font-semibold text-amber-800">
                  Not available in the published
                  Smart Book release
                </p>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
