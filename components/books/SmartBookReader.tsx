"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  BookOpen,
  Library,
  Volume2,
  X,
} from "lucide-react";

import SmartBookContentsPanel from "@/components/books/SmartBookContentsPanel";
import SmartBookViewer from "@/components/books/SmartBookViewer";
import V2ContentDocumentRenderer from "@/components/content/V2ContentDocumentRenderer";
import V2ReadAloudPlayer from "@/components/content/V2ReadAloudPlayer";
import { useTeachModeClassroom } from "@/components/teacher/TeachModeShell";

import type { ContentDocument } from "@/lib/content-document";
import { getContentLayoutVersion } from "@/lib/content-layout-v2";
import type {
  ContentSectionDefinitionSummary,
  ResolvedLinkedAsset,
} from "@/lib/content-linked-asset-types";
import type { ResolvedMediaBlock } from "@/lib/content-media-types";
import type { ResolvedActivityBlock } from "@/lib/activity-studio-types";
import type { ResolvedWorksheetBlock } from "@/lib/worksheet-studio-types";
import type { KnowledgeDefinitionSummary } from "@/lib/content-knowledge-types";
import type { SmartBookContentsNode } from "@/lib/smart-book-contents";
import type { BookNarrationManifest } from "@/lib/content-narration";

type TeacherResource = {
  id: string;
  title: string;
  fileName: string;
  category: string;
  openPath: string;
};

type ReaderViewMode =
  | "SINGLE"
  | "DOUBLE";

type Props = {
  role: "TEACHER" | "STUDENT";

  bookId: string;

  title: string;

  subjectPath?: string;

  backHref?: string;

  backLabel?: string;

  showBackLink?: boolean;

  initialPage?: number;

  initialTotalPages?: number | null;

  initialBookmarks?: number[];

  contents: SmartBookContentsNode[];

  document?: ContentDocument | null;

  linkedAssets?: Record<
    string,
    ResolvedLinkedAsset | null
  >;

  activities?: Record<
    string,
    ResolvedActivityBlock
  >;

  worksheets?: Record<
    string,
    ResolvedWorksheetBlock
  >;

  media?: Record<
    string,
    ResolvedMediaBlock | null
  >;

  sections?: ContentSectionDefinitionSummary[];

  knowledgeDefinitions?: Record<
    string,
    KnowledgeDefinitionSummary | null
  >;

  resourceUrls?: Record<string, string>;

  pdfUrl?: string;

  immutableRelease?: boolean;

  teacherResources?: TeacherResource[];

  /*
   * Optional restricted reading range.
   *
   * Normal My Books does not pass these,
   * therefore the whole book remains available.
   *
   * Later the Academic Planner can open the same
   * reader with a Module/Exercise page range.
   */
  minPage?: number;

  maxPage?: number;
};

function clampToRange(
  value: number,
  minPage: number,
  maxPage: number | null,
) {
  const minimum =
    Math.max(1, minPage);

  const maximum =
    maxPage !== null
      ? Math.max(minimum, maxPage)
      : Math.max(minimum, value);

  return Math.max(
    minimum,
    Math.min(maximum, value),
  );
}

export default function SmartBookReader({
  role,
  bookId,
  title,
  backHref,
  backLabel,
  showBackLink = true,
  initialPage = 1,
  initialTotalPages = null,
  contents,
  document,
  linkedAssets = {},
  activities = {},
  worksheets = {},
  media = {},
  sections = [],
  knowledgeDefinitions = {},
  resourceUrls = {},
  pdfUrl,
  immutableRelease = false,
  teacherResources = [],
  minPage = 1,
  maxPage,
}: Props) {
  const rangeMinimum =
    Math.max(1, minPage);

  const initialMaximum =
    typeof maxPage === "number" &&
    Number.isInteger(maxPage) &&
    maxPage >= rangeMinimum
      ? maxPage
      : null;

  const [page, setPage] =
    useState(() =>
      clampToRange(
        Math.max(
          rangeMinimum,
          initialPage,
        ),
        rangeMinimum,
        initialMaximum,
      ),
    );

  const classroom = useTeachModeClassroom();

  useEffect(() => {
    if (classroom) classroom.setCurrentPage(page);
  }, [classroom, page]);

  const [totalPages, setTotalPages] =
    useState<number | null>(
      initialTotalPages,
    );

  const [contentsOpen, setContentsOpen] =
    useState(false);

  const [resourcesOpen, setResourcesOpen] =
    useState(false);

  const [readAloudOpen, setReadAloudOpen] =
    useState(false);

  const [viewMode, setViewMode] =
    useState<ReaderViewMode>(
      "DOUBLE",
    );

  const hasV2 = Boolean(
    document &&
      getContentLayoutVersion(document) === 2,
  );

  /*
   * Final effective page range after the PDF
   * has reported its real page count.
   */
  const effectiveMaximum =
    useMemo(() => {
      if (!totalPages) {
        return initialMaximum;
      }

      if (initialMaximum === null) {
        return totalPages;
      }

      return Math.min(
        totalPages,
        initialMaximum,
      );
    }, [
      initialMaximum,
      totalPages,
    ]);

  /*
   * Student reading position remains
   * best-effort and invisible to the reader UI.
   */
  useEffect(() => {
    if (
      role !== "STUDENT" ||
      !totalPages
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        async () => {
          try {
            await fetch(
              `/api/student/books/${encodeURIComponent(
                bookId,
              )}/progress`,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    currentPage: page,
                    totalPages,
                  }),
              },
            );
          } catch {
            // Reading-position persistence is
            // best-effort only.
          }
        },
        900,
      );

    return () =>
      window.clearTimeout(timer);
  }, [
    bookId,
    page,
    role,
    totalPages,
  ]);

  /*
   * Stop/close the Read Aloud panel whenever
   * the user moves to a different page.
   *
   * V2ReadAloudPlayer cleans up speech/audio
   * when it unmounts.
   */
  useEffect(() => {
    setReadAloudOpen(false);
  }, [page]);

  /*
   * V2 overlay for each visible PDF page.
   */
  const renderPageOverlay =
    useCallback(
      (pageNumber: number) => {
        if (
          !hasV2 ||
          !document
        ) {
          return null;
        }

        return (
          <V2ContentDocumentRenderer
            document={document}
            immutableRelease={immutableRelease}
            mode={role}
            linkedAssets={linkedAssets}
            activities={activities}
            worksheets={worksheets}
            media={media}
            sectionDefinitions={
              sections
            }
            knowledgeDefinitions={
              knowledgeDefinitions
            }
            resourceUrls={
              resourceUrls
            }
            pageNumber={
              pageNumber
            }
            overlayOnly
          />
        );
      },
      [
        activities,
        document,
        hasV2,
        knowledgeDefinitions,
        linkedAssets,
        media,
        resourceUrls,
        role,
        sections,
        worksheets,
      ],
    );

  /*
   * Find the V2 page whose PDF background
   * corresponds to the currently selected
   * absolute PDF page.
   *
   * prepareOwnedBookReadAloud() stores the
   * extracted/manual page text in:
   *
   * page.readAloud.text
   */
  const currentReadAloudText =
    useMemo(() => {
      if (!document?.pageLayout) {
        return "";
      }

      const matchingPage =
        document.pageLayout.pages.find(
          (candidate) =>
            candidate.pdfBackground
              ?.source ===
              "BOOK_FULL_PDF" &&
            candidate.pdfBackground
              .pageNumber === page,
        );

      return (
        matchingPage?.readAloud
          ?.text ?? ""
      );
    }, [
      document,
      page,
    ]);

  /*
   * V2ReadAloudPlayer requires a manifest even
   * when pageText is supplied.
   *
   * In pageText mode the existing player reads
   * exactly the prepared current-page text.
   */
  const pageNarrationManifest =
    useMemo<BookNarrationManifest>(
      () => ({
        version: 1,

        audience: role,

        sourceHash:
          `smart-book-page-${page}`,

        pages: [],

        segments: [],
      }),
      [
        page,
        role,
      ],
    );

  const backPath = backHref ?? (role === "TEACHER" ? "/teacher-dashboard/books" : "/student-dashboard/books");
  const resolvedBackLabel = backLabel ?? "My Books";
  const resolvedPdfUrl = pdfUrl ?? `/api/books/${encodeURIComponent(bookId)}/full-pdf`;

  const setSafePage =
    useCallback(
      (nextPage: number) => {
        setPage(
          clampToRange(
            nextPage,
            rangeMinimum,
            effectiveMaximum,
          ),
        );
      },
      [
        effectiveMaximum,
        rangeMinimum,
      ],
    );

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col overflow-hidden bg-slate-950">
      {/* Main Smart Book toolbar */}
      <header className="relative z-20 flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-slate-950 px-2 py-2 text-white sm:px-4">
        {showBackLink ? (
          <Link
            href={backPath}
            aria-label={"Close book and return to " + resolvedBackLabel}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />

            <span className="hidden sm:inline">
              {resolvedBackLabel}
            </span>
          </Link>
        ) : null}

        <div className="min-w-[120px] flex-1 px-1 sm:px-3">
          <h1 className="truncate text-sm font-bold text-white sm:text-base">
            {title}
          </h1>
        </div>

        {/* 1 page / 2 page switch */}
        <div
          className="flex h-10 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white/5"
          role="group"
          aria-label="Book page view"
        >
          <button
            type="button"
            onClick={() =>
              setViewMode(
                "SINGLE",
              )
            }
            aria-pressed={
              viewMode ===
              "SINGLE"
            }
            className={`px-3 text-xs font-bold transition sm:text-sm ${
              viewMode ===
              "SINGLE"
                ? "bg-white text-slate-950"
                : "text-white hover:bg-white/10"
            }`}
          >
            1 Page
          </button>

          <button
            type="button"
            onClick={() =>
              setViewMode(
                "DOUBLE",
              )
            }
            aria-pressed={
              viewMode ===
              "DOUBLE"
            }
            className={`border-l border-white/15 px-3 text-xs font-bold transition sm:text-sm ${
              viewMode ===
              "DOUBLE"
                ? "bg-white text-slate-950"
                : "text-white hover:bg-white/10"
            }`}
          >
            2 Pages
          </button>
        </div>

        {/* Read Aloud */}
        <button
          type="button"
          onClick={() =>
            setReadAloudOpen(
              (value) =>
                !value,
            )
          }
          aria-expanded={
            readAloudOpen
          }
          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${
            readAloudOpen
              ? "border-blue-300 bg-blue-500 text-white"
              : "border-blue-400/30 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20"
          }`}
        >
          <Volume2 className="h-4 w-4" />

          <span className="hidden lg:inline">
            Read Page
          </span>
        </button>

        {/* Contents */}
        <button
          type="button"
          onClick={() =>
            setContentsOpen(true)
          }
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700 sm:px-4"
        >
          <Library className="h-4 w-4" />

          <span className="hidden sm:inline">
            Contents
          </span>
        </button>

        {/* Teacher-only resources */}
        {role === "TEACHER" ? (
          <button
            type="button"
            onClick={() =>
              setResourcesOpen(true)
            }
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-teal-400/30 bg-teal-500/10 px-3 text-sm font-bold text-teal-100 transition hover:bg-teal-500/20 sm:px-4"
          >
            <BookOpen className="h-4 w-4" />

            <span className="hidden xl:inline">
              Teacher Resources
            </span>

            <span className="xl:hidden">
              Resources
            </span>
          </button>
        ) : null}
      </header>

      {/* Read Aloud panel */}
      {readAloudOpen ? (
        <div className="relative z-30 shrink-0 border-b border-blue-200 bg-slate-100 px-2 py-2 sm:px-4">
          <div className="mx-auto flex max-w-7xl items-start gap-2">
            <div className="min-w-0 flex-1">
              <V2ReadAloudPlayer
                key={`reader-page-${page}`}
                manifest={
                  pageNarrationManifest
                }
                audioUrls={
                  resourceUrls
                }
                pageText={
                  currentReadAloudText
                }
                pageContext={`Page ${page}`}
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setReadAloudOpen(
                  false,
                )
              }
              aria-label="Close Read Aloud"
              className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Book */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <SmartBookViewer
          pdfUrl={resolvedPdfUrl}
          initialPage={
            clampToRange(
              initialPage,
              rangeMinimum,
              effectiveMaximum,
            )
          }
          currentPage={page}
          onPageChange={
            setSafePage
          }
          onDocumentLoad={({
            totalPages: count,
          }) => {
            setTotalPages(
              count,
            );

            const finalMaximum =
              initialMaximum ===
              null
                ? count
                : Math.min(
                    count,
                    initialMaximum,
                  );

            setPage(
              (current) =>
                clampToRange(
                  current,
                  rangeMinimum,
                  finalMaximum,
                ),
            );
          }}
          minimalControls
          showFullscreen={false}
          spreadMode={
            viewMode
          }
          minPage={
            rangeMinimum
          }
          maxPage={
            effectiveMaximum ??
            undefined
          }
          renderPageOverlay={
            renderPageOverlay
          }
          className="h-full"
        />
      </main>

      {contentsOpen ? (
        <SmartBookContentsPanel
          nodes={contents}
          onClose={() =>
            setContentsOpen(false)
          }
          onNavigate={(
            requestedPage,
          ) => {
            setSafePage(
              requestedPage,
            );

            setContentsOpen(
              false,
            );
          }}
        />
      ) : null}

      {resourcesOpen &&
      role === "TEACHER" ? (
        <ResourcePanel
          resources={
            teacherResources
          }
          onClose={() =>
            setResourcesOpen(
              false,
            )
          }
        />
      ) : null}
    </div>
  );
}

function ResourcePanel({
  resources,
  onClose,
}: {
  resources: TeacherResource[];
  onClose: () => void;
}) {
  const groups = new Map<
    string,
    TeacherResource[]
  >();

  resources.forEach(
    (resource) => {
      groups.set(
        resource.category,
        [
          ...(groups.get(
            resource.category,
          ) ?? []),

          resource,
        ],
      );
    },
  );

  return (
    <div
      className="fixed inset-0 z-[120]"
      role="dialog"
      aria-modal="true"
      aria-label="Teacher Resources"
    >
      <button
        type="button"
        aria-label="Close Teacher Resources"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60"
      />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex min-h-16 items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-bold text-slate-950">
            Teacher Resources
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Teacher Resources"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {groups.size ? (
            [...groups.entries()].map(
              ([
                category,
                items,
              ]) => (
                <section
                  key={category}
                  className="mb-6"
                >
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-teal-700">
                    {category}
                  </h3>

                  <div className="space-y-2">
                    {items.map(
                      (item) => (
                        <a
                          key={
                            item.id
                          }
                          href={
                            item.openPath
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:border-teal-300 hover:bg-teal-50/40"
                        >
                          <span className="min-w-0 truncate">
                            {
                              item.title
                            }
                          </span>

                          <span className="ml-3 shrink-0 text-teal-700">
                            Open
                          </span>
                        </a>
                      ),
                    )}
                  </div>
                </section>
              ),
            )
          ) : (
            <p className="text-sm text-slate-500">
              No Teacher Resources are
              available for this book.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}