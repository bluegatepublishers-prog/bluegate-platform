"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveBookPageMapping } from "@/app/admin/books/[id]/structure/mapping-actions";

type MappingType =
  | "PART"
  | "UNIT"
  | "CHAPTER"
  | "MODULE"
  | "EXERCISE"
  | "FRONT_MATTER";

type Props = {
  bookId: string;
  type: MappingType;
  nodeId: string;
  chapterId?: string;
  title: string;
  startPage: number | null;
  endPage: number | null;
  totalPages: number | null;
  currentPage?: number | null;
  mappingMode?: boolean;
};

const labels: Record<MappingType, string> = {
  PART: "Part / Term",
  UNIT: "Unit",
  CHAPTER: "Chapter",
  MODULE: "Module",
  EXERCISE: "Exercise",
  FRONT_MATTER: "Front Matter",
};

export default function BookPageRangeInspector({
  bookId,
  type,
  nodeId,
  chapterId,
  title,
  startPage,
  endPage,
  totalPages,
  currentPage = null,
  mappingMode = false,
}: Props) {
  const [start, setStart] = useState(
    startPage == null ? "" : String(startPage),
  );
  const [end, setEnd] = useState(
    endPage == null ? "" : String(endPage),
  );
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function setCurrent(
    setter: (value: string) => void,
  ) {
    if (currentPage != null) {
      setter(String(currentPage));
    } else {
      setMessage(
        "Open Book Editor to use the current absolute page.",
      );
    }
  }

  function save(clear = false) {
    const nextStart: number | null =
      clear
        ? null
        : start.trim()
          ? Number(start)
          : null;

    const nextEnd: number | null =
      clear
        ? null
        : end.trim()
          ? Number(end)
          : null;

    if (
      !clear &&
      (nextStart === null ||
        nextEnd === null)
    ) {
      setMessage(
        "Set both a start and an end page, or clear the range.",
      );
      return;
    }

    if (
      !clear &&
      (nextStart === null ||
        nextEnd === null ||
        !Number.isInteger(nextStart) ||
        !Number.isInteger(nextEnd) ||
        nextStart < 1 ||
        nextEnd < nextStart ||
        (totalPages != null &&
          nextEnd > totalPages))
    ) {
      setMessage(
        "Enter a valid absolute page range within the book.",
      );
      return;
    }

    startTransition(async () => {
      try {
        await saveBookPageMapping(
          bookId,
          type,
          nodeId,
          chapterId ?? null,
          nextStart,
          nextEnd,
        );

        setStart(
          nextStart == null
            ? ""
            : String(nextStart),
        );

        setEnd(
          nextEnd == null
            ? ""
            : String(nextEnd),
        );

        setMessage(
          clear
            ? "Range cleared."
            : "Range saved.",
        );

        if (
          !clear &&
          mappingMode &&
          nextStart != null
        ) {
          router.replace(
            `/admin/books/${bookId}/content?selected=${encodeURIComponent(
              `${
                type === "FRONT_MATTER"
                  ? "FRONT_MATTER_ITEM"
                  : type
              }:${nodeId}`,
            )}&page=${nextStart}`,
            { scroll: false },
          );
        }
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to save page range.",
        );
      }
    });
  }

  return (
    <section
      data-page-range-inspector
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
      aria-label="Page range"
    >
      <div className="flex min-w-0 items-baseline gap-2">
        <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
          Page Range
        </p>

        <p className="truncate text-sm font-semibold text-slate-900">
          {title}
        </p>

        <p className="shrink-0 text-xs text-slate-500">
          {startPage != null &&
          endPage != null
            ? startPage === endPage
              ? `Page ${startPage}`
              : `Pages ${startPage}–${endPage}`
            : "Unmapped"}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-slate-600">
          Start
          <input
            aria-label="Start page"
            value={start}
            onChange={(event) =>
              setStart(event.target.value)
            }
            inputMode="numeric"
            type="number"
            min={1}
            max={totalPages ?? undefined}
            className="ml-1 w-24 max-w-full rounded border border-slate-200 px-2 py-1 text-sm"
          />
        </label>

        <label className="text-xs font-semibold text-slate-600">
          End
          <input
            aria-label="End page"
            value={end}
            onChange={(event) =>
              setEnd(event.target.value)
            }
            inputMode="numeric"
            type="number"
            min={1}
            max={totalPages ?? undefined}
            className="ml-1 w-24 max-w-full rounded border border-slate-200 px-2 py-1 text-sm"
          />
        </label>

        <p className="text-xs text-slate-500">
          Current Book Page:{" "}
          {currentPage ?? "Not available"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCurrent(setStart)}
          className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
        >
          Set Start
        </button>

        <button
          type="button"
          onClick={() => setCurrent(setEnd)}
          className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
        >
          Set End
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => save(false)}
          className="rounded bg-slate-950 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          Save Range
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => save(true)}
          className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          Clear Range
        </button>

        <Link
          href={`/admin/books/${bookId}/content?bookEditor=1&selected=${encodeURIComponent(
            `${
              type === "FRONT_MATTER"
                ? "FRONT_MATTER_ITEM"
                : type
            }:${nodeId}`,
          )}`}
          className="rounded border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700"
        >
          Map in Book
        </Link>
      </div>

      {message ? (
        <p
          aria-live="polite"
          className="basis-full text-xs text-slate-600"
        >
          {message}
        </p>
      ) : null}

      <span className="sr-only">
        {labels[type]}
      </span>
    </section>
  );
}