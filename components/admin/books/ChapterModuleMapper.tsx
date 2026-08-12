"use client";

import { useState } from "react";

import {
  saveChapterPageMapping,
  saveModulePageMapping,
} from "@/app/admin/books/[id]/structure/mapping-actions";
import SmartBookViewer from "@/components/books/SmartBookViewer";

type Module = {
  id: string;
  chapterId: string;
  title: string;
  startPage: number | null;
  endPage: number | null;
};

type Chapter = {
  id: string;
  title: string;
  chapterNumber: number;
  startPage: number | null;
  endPage: number | null;
};

type Selection = {
  type: "chapter" | "module";
  id: string;
};

type Props = {
  bookId: string;
  title: string;
  chapters: Chapter[];
  modules: Module[];
};

function formatRange(
  startPage: number | null,
  endPage: number | null,
) {
  if (startPage === null && endPage === null) {
    return "Unmapped";
  }

  if (startPage !== null && endPage !== null) {
    return `${startPage}–${endPage}`;
  }

  return "Incomplete";
}

export default function ChapterModuleMapper({
  bookId,
  title,
  chapters,
  modules,
}: Props) {
  const [page, setPage] = useState(1);

  const [selected, setSelected] =
    useState<Selection | null>(null);

  const [start, setStart] =
    useState<number | null>(null);

  const [end, setEnd] =
    useState<number | null>(null);

  const [message, setMessage] =
    useState("");

  const selectedNode =
    selected?.type === "chapter"
      ? chapters.find(
          (chapter) =>
            chapter.id === selected.id,
        )
      : modules.find(
          (bookModule) =>
            bookModule.id === selected?.id,
        );

  function choose(
    type: "chapter" | "module",
    id: string,
  ) {
    const item =
      type === "chapter"
        ? chapters.find(
            (chapter) =>
              chapter.id === id,
          )
        : modules.find(
            (bookModule) =>
              bookModule.id === id,
          );

    if (!item) {
      return;
    }

    setSelected({
      type,
      id,
    });

    setStart(item.startPage);
    setEnd(item.endPage);
    setMessage("");

    if (item.startPage !== null) {
      setPage(item.startPage);
    }
  }

  async function save() {
    if (!selected || !selectedNode) {
      return;
    }

    try {
      setMessage("Saving...");

      if (selected.type === "chapter") {
        await saveChapterPageMapping(
          bookId,
          selectedNode.id,
          start,
          end,
        );
      } else {
        const bookModule =
          selectedNode as Module;

        await saveModulePageMapping(
          bookId,
          bookModule.chapterId,
          bookModule.id,
          start,
          end,
        );
      }

      setMessage("Saved.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save mapping.",
      );
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="space-y-3 rounded-2xl border bg-white p-4">
        <h1 className="text-xl font-bold">
          {title}
        </h1>

        {chapters.map((chapter) => (
          <div key={chapter.id}>
            <button
              type="button"
              className="w-full rounded p-3 text-left hover:bg-slate-100"
              onClick={() =>
                choose(
                  "chapter",
                  chapter.id,
                )
              }
            >
              Chapter {chapter.chapterNumber}:{" "}
              {chapter.title}

              <span className="block text-sm text-slate-500">
                Pages{" "}
                {formatRange(
                  chapter.startPage,
                  chapter.endPage,
                )}
              </span>
            </button>

            {modules
              .filter(
                (bookModule) =>
                  bookModule.chapterId ===
                  chapter.id,
              )
              .map((bookModule) => (
                <button
                  key={bookModule.id}
                  type="button"
                  className="ml-4 w-[calc(100%-1rem)] rounded p-2 text-left text-sm hover:bg-slate-100"
                  onClick={() =>
                    choose(
                      "module",
                      bookModule.id,
                    )
                  }
                >
                  {bookModule.title}

                  <span className="block text-slate-500">
                    Pages{" "}
                    {formatRange(
                      bookModule.startPage,
                      bookModule.endPage,
                    )}
                  </span>
                </button>
              ))}
          </div>
        ))}

        {selectedNode ? (
          <section className="space-y-2 border-t pt-3">
            <b>
              {selected?.type ===
              "chapter"
                ? "Chapter"
                : "Module"}{" "}
              mapping
            </b>

            <p className="text-sm text-slate-600">
              Pending:{" "}
              {formatRange(
                start,
                end,
              )}
            </p>

            <button
              type="button"
              className="btn"
              onClick={() =>
                setStart(page)
              }
            >
              Set current page as start
            </button>

            <button
              type="button"
              className="btn"
              onClick={() =>
                setEnd(page)
              }
            >
              Set current page as end
            </button>

            <button
              type="button"
              className="btn bg-blue-700 text-white"
              onClick={() =>
                void save()
              }
            >
              Save range
            </button>

            <p
              aria-live="polite"
              className="text-sm"
            >
              {message}
            </p>
          </section>
        ) : null}
      </aside>

      <SmartBookViewer
        pdfUrl={`/api/books/${bookId}/full-pdf`}
        currentPage={page}
        onPageChange={setPage}
      />
    </div>
  );
}