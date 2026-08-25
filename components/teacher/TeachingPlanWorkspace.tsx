"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { TeachingPeriodStatus } from "@prisma/client";

import V2ContentDocumentRenderer from "@/components/content/V2ContentDocumentRenderer";
import TeachingPeriodComposer, { type TeachingPeriodComposerSaveInput } from "@/components/teacher/TeachingPeriodComposer";
import {
  addTeachingPeriodPagesAction,
  createTeachingPlanAction,
  deleteTeachingPeriodAction,
  getTeachingPeriodComposerDataAction,
  getTeachingPlanPageAvailabilityAction,
  getTeachingPlanPagePreviewAction,
  moveTeachingPeriodAction,
  removeTeachingPeriodPageAction,
  reorderTeachingPeriodPagesAction,
  getTeachingPlanAction,
  getTeachingPlanTimetableOccurrencesAction,
  saveTeachingPeriodComposerAction,
  updateTeachingPeriodAction,
} from "@/app/teacher-dashboard/classes/[sectionId]/plan/teaching-actions";

type Plan = Awaited<ReturnType<typeof createTeachingPlanAction>>;
type Period = Plan["periods"][number];
type PageReference = Period["pageRefs"][number];
type PageAvailability = Awaited<ReturnType<typeof getTeachingPlanPageAvailabilityAction>>;
type AvailablePage = PageAvailability["pages"][number];
type PagePreview = Awaited<ReturnType<typeof getTeachingPlanPagePreviewAction>>;
type Chapter = { id: string; chapterNumber: number; title: string };
type TimetableOccurrence = Awaited<ReturnType<typeof getTeachingPlanTimetableOccurrencesAction>>[number];

type WorkspaceProps = {
  sectionId: string;
  sectionSubjectId: string;
  className: string;
  sectionName: string;
  subjectName: string;
  academicYearName: string;
  books: Array<{ id: string; title: string }>;
  selectedBook: { id: string; title: string } | null;
  chapters: Chapter[];
  initialPlan: Plan | null;
  pageAvailability: PageAvailability;
  occurrences: TimetableOccurrence[];
  initialOccurrence?: { date: string; timetableEntryId: string } | null;
};

const STATUS_LABELS: Record<TeachingPeriodStatus, string> = {
  PLANNED: "Planned",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
  RESCHEDULED: "Rescheduled",
};

export default function TeachingPlanWorkspace({
  sectionId,
  sectionSubjectId,
  className,
  sectionName,
  subjectName,
  academicYearName,
  books,
  selectedBook,
  chapters,
  initialPlan,
  pageAvailability,
  occurrences,
  initialOccurrence,
}: WorkspaceProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(initialPlan);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDate, setEditingDate] = useState("");
  const [editingChapterId, setEditingChapterId] = useState("");
  const [editingStatus, setEditingStatus] = useState<TeachingPeriodStatus>("PLANNED");
  const [pageManagerPeriodId, setPageManagerPeriodId] = useState<string | null>(null);
  const [pickerPeriodId, setPickerPeriodId] = useState<string | null>(null);
  const [availablePages, setAvailablePages] = useState<AvailablePage[]>(pageAvailability.pages);
  const [availabilityState, setAvailabilityState] = useState<PageAvailability["state"]>(pageAvailability.state);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [pageSearch, setPageSearch] = useState("");
  const [selectedPageKeys, setSelectedPageKeys] = useState<string[]>([]);
  const [preview, setPreview] = useState<PagePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [composerOccurrence, setComposerOccurrence] = useState<TimetableOccurrence | null>(null);
  const [composerData, setComposerData] = useState<Awaited<ReturnType<typeof getTeachingPeriodComposerDataAction>> | null>(null);
  const [composerLoading, setComposerLoading] = useState(false);
  const initialComposerOpened = useRef(false);

  const canMapPages = availabilityState === "V2_AVAILABLE" && availablePages.length > 0;
  const modules = useMemo(() => {
    const entries = new Map<string, string>();
    availablePages.forEach((page) => entries.set(page.moduleId, page.moduleTitle));
    return [...entries.entries()].map(([id, title]) => ({ id, title }));
  }, [availablePages]);
  const visiblePages = useMemo(() => {
    const search = pageSearch.trim().toLowerCase();
    return availablePages.filter((page) => {
      const matchesModule = moduleFilter === "all" || page.moduleId === moduleFilter;
      const matchesSearch = !search || ("page " + page.displayPageNumber + " " + page.title).toLowerCase().includes(search);
      return matchesModule && matchesSearch;
    });
  }, [availablePages, moduleFilter, pageSearch]);
  const selectedPages = useMemo(
    () => availablePages.filter((page) => selectedPageKeys.includes(pageKey(page))),
    [availablePages, selectedPageKeys],
  );

  function runMutation<T>(label: string, operation: () => Promise<T>, apply: (result: T) => void) {
    setError(null);
    setBusy(label);
    startTransition(() => {
      void operation()
        .then((result) => {
          apply(result);
          router.refresh();
        })
        .catch((caught) => setError(toTeacherMessage(caught)))
        .finally(() => setBusy(null));
    });
  }

  function replacePeriod(next: Period) {
    setPlan((current) => current ? {
      ...current,
      periods: current.periods.map((period) => period.id === next.id ? next : period),
    } : current);
  }

  function openComposer(occurrence: TimetableOccurrence) {
    const book = selectedBook ?? occurrence.book;
    if (!book || occurrence.closed) return;
    setError(null);
    setComposerOccurrence(occurrence);
    setComposerData(null);
    setComposerLoading(true);
    void getTeachingPeriodComposerDataAction({ sectionSubjectId, bookId: book.id })
      .then(setComposerData)
      .catch((caught) => setError(toTeacherMessage(caught)))
      .finally(() => setComposerLoading(false));
  }

  useEffect(() => {
    if (!initialOccurrence || initialComposerOpened.current) return;
    const occurrence = occurrences.find((item) => item.date === initialOccurrence.date && item.entry.id === initialOccurrence.timetableEntryId);
    if (!occurrence) return;
    initialComposerOpened.current = true;
    openComposer(occurrence);
  }, [initialOccurrence, occurrences]);

  function closeComposer() {
    setComposerOccurrence(null);
    setComposerData(null);
    setComposerLoading(false);
  }

  function saveComposer(input: TeachingPeriodComposerSaveInput) {
    runMutation("save-composer", () => saveTeachingPeriodComposerAction(input), (period) => {
      if (plan) {
        setPlan((current) => current ? {
          ...current,
          periods: current.periods.some((entry) => entry.id === period.id)
            ? current.periods.map((entry) => entry.id === period.id ? period : entry)
            : [...current.periods, period].sort((left, right) => left.sequence - right.sequence),
        } : current);
      } else {
        void getTeachingPlanAction({ planId: period.planId }).then(setPlan).catch((caught) => setError(toTeacherMessage(caught)));
      }
      closeComposer();
    });
  }

  function startEdit(period: Period) {
    const occurrence = occurrences.find((item) => item.period?.id === period.id);
    if (occurrence) {
      openComposer(occurrence);
      return;
    }
    setEditingPeriodId(period.id);
    setEditingTitle(period.title);
    setEditingDate(dateInputValue(period.plannedDate));
    setEditingChapterId(period.chapterId ?? "");
    setEditingStatus(period.status);
  }

  function closeEdit() {
    setEditingPeriodId(null);
    setEditingTitle("");
    setEditingDate("");
    setEditingChapterId("");
    setEditingStatus("PLANNED");
  }

  function completePeriod(period: Period) {
    runMutation("complete-period", () => updateTeachingPeriodAction({ periodId: period.id, title: period.title, plannedDate: dateInputValue(period.plannedDate) || null, status: "COMPLETED", chapterId: period.chapterId }), replacePeriod);
  }

  function savePeriod() {
    if (!editingPeriodId || !editingTitle.trim()) return;
    runMutation("edit-period", () => updateTeachingPeriodAction({
      periodId: editingPeriodId,
      title: editingTitle,
      plannedDate: editingDate || null,
      status: editingStatus,
      chapterId: editingChapterId || null,
    }), (period) => {
      replacePeriod(period);
      closeEdit();
    });
  }

  function deletePeriod(period: Period) {
    const message = period.pageRefs.length
      ? "Delete Period " + period.sequence + "? Its page mapping will be removed. The Publisher book is unchanged."
      : "Delete Period " + period.sequence + "?";
    if (!window.confirm(message)) return;
    runMutation("delete-period", () => deleteTeachingPeriodAction({ periodId: period.id }), ({ deletedPeriodId }) => {
      setPlan((current) => current ? { ...current, periods: current.periods.filter((entry) => entry.id !== deletedPeriodId) } : current);
      if (pageManagerPeriodId === deletedPeriodId) setPageManagerPeriodId(null);
    });
  }

  function movePeriod(period: Period, direction: "EARLIER" | "LATER") {
    runMutation("move-period-" + direction, () => moveTeachingPeriodAction({ periodId: period.id, direction }), setPlan);
  }

  function openPagePicker(periodId: string) {
    if (!selectedBook) return;
    setPickerPeriodId(periodId);
    setPageManagerPeriodId(null);
    setPagesLoading(true);
    setPreview(null);
    setSelectedPageKeys([]);
    setModuleFilter("all");
    setPageSearch("");
    void getTeachingPlanPageAvailabilityAction({ sectionSubjectId, bookId: selectedBook.id })
      .then((result) => {
        setAvailablePages(result.pages);
        setAvailabilityState(result.state);
      })
      .catch((caught) => setError(toTeacherMessage(caught)))
      .finally(() => setPagesLoading(false));
  }

  function togglePage(page: AvailablePage) {
    const key = pageKey(page);
    setSelectedPageKeys((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);
  }

  function previewPage(page: AvailablePage) {
    if (!selectedBook) return;
    setPreviewLoading(true);
    setError(null);
    void getTeachingPlanPagePreviewAction({
      sectionSubjectId,
      bookId: selectedBook.id,
      moduleId: page.moduleId,
      pageId: page.pageId,
    })
      .then(setPreview)
      .catch((caught) => setError(toTeacherMessage(caught)))
      .finally(() => setPreviewLoading(false));
  }

  function addSelectedPages() {
    if (!pickerPeriodId || !selectedPages.length) return;
    runMutation("add-pages", () => addTeachingPeriodPagesAction({
      periodId: pickerPeriodId,
      pages: selectedPages.map((page) => ({ moduleId: page.moduleId, pageId: page.pageId })),
    }), (period) => {
      replacePeriod(period);
      setPickerPeriodId(null);
      setPreview(null);
    });
  }

  function removePage(periodId: string, refId: string) {
    runMutation("remove-page", () => removeTeachingPeriodPageAction({ periodId, pageRefId: refId }), replacePeriod);
  }

  function movePage(period: Period, ref: PageReference, direction: "EARLIER" | "LATER") {
    const index = period.pageRefs.findIndex((entry) => entry.refId === ref.refId);
    const nextIndex = direction === "EARLIER" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= period.pageRefs.length) return;
    const orderedPageRefIds = period.pageRefs.map((entry) => entry.refId);
    const moved = orderedPageRefIds.splice(index, 1)[0];
    orderedPageRefIds.splice(nextIndex, 0, moved);
    runMutation("move-page-" + direction, () => reorderTeachingPeriodPagesAction({ periodId: period.id, orderedPageRefIds }), replacePeriod);
  }

  function selectBook(bookId: string) {
    if (!bookId) return;
    const params = new URLSearchParams({ subject: sectionSubjectId, bookId });
    router.replace("/teacher-dashboard/classes/" + sectionId + "/plan?" + params.toString());
  }

  const editingPeriod = plan?.periods.find((period) => period.id === editingPeriodId) ?? null;
  const pageManagerPeriod = plan?.periods.find((period) => period.id === pageManagerPeriodId) ?? null;

  return (
    <main className="mx-auto max-w-6xl space-y-3 px-3 py-3 sm:px-4">
      <header className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-teal-700">Subject Planner</p>
            <h1 className="mt-0.5 text-[1.35rem] font-bold leading-tight text-slate-950">Teaching Plan</h1>
            <p className="mt-1 text-xs text-slate-500">{className} · {sectionName} · {subjectName} · {academicYearName}</p>
          </div>
          <label className="w-full text-[0.7rem] font-bold text-slate-500 sm:w-auto">
            Assigned book
            <select aria-label="Select assigned book" value={selectedBook?.id ?? ""} onChange={(event) => selectBook(event.target.value)} disabled={!books.length || Boolean(busy)} className="mt-1 h-8 w-full min-w-[220px] rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 sm:w-auto">
              {!books.length ? <option value="">No eligible book assigned</option> : null}
              {books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
            </select>
          </label>
        </div>
      </header>

      {error ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p> : null}
      {!selectedBook ? <EmptyBookState /> : null}
      <section className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold text-slate-900">Upcoming timetable classes</h2><p className="text-[0.7rem] text-slate-500">Plan only the real classes assigned in the School timetable.</p></div><span className="text-[0.7rem] font-semibold text-slate-500">{occurrences.length} occurrence{occurrences.length === 1 ? "" : "s"}</span></div>
        <div className="mt-3 space-y-2">
          {occurrences.length ? occurrences.map((occurrence) => <article key={occurrence.date + ":" + occurrence.entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2"><div className="min-w-0"><p className="text-[0.68rem] font-bold uppercase tracking-wide text-teal-700">{formatOccurrenceDate(occurrence.date)} - {occurrence.entry.periodSlot.label}</p><p className="truncate text-xs font-bold text-slate-900">{occurrence.entry.section.schoolClass.name}-{occurrence.entry.section.name} - {occurrence.entry.sectionSubject.subject.name}</p><p className="text-[0.68rem] text-slate-500">{clockLabel(occurrence.entry.periodSlot.startMinute)}-{clockLabel(occurrence.entry.periodSlot.endMinute)}{occurrence.period ? " - " + occurrence.period.title : ""}</p></div>{occurrence.closed ? <span className="rounded-lg bg-amber-100 px-2 py-1 text-[0.68rem] font-bold text-amber-800">School closed</span> : occurrence.period && (occurrence.period?.meaningfullyPlanned || occurrence.period?.status !== "PLANNED") ? <div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[0.68rem] font-bold text-slate-700">{occurrenceStateLabel(occurrence.period)}</span>{occurrence.period.meaningfullyPlanned && selectedBook ? <Link href={teacherTeachHref(sectionId, sectionSubjectId, selectedBook.id, occurrence.period.id)} className="h-8 rounded-md bg-slate-900 px-3 py-2 text-[0.7rem] font-bold text-white">Teach</Link> : null}<button type="button" onClick={() => openComposer(occurrence)} disabled={Boolean(busy)} className="h-8 rounded-md border border-teal-200 bg-white px-3 py-2 text-[0.7rem] font-bold text-teal-800">Edit plan</button>{occurrence.period.status === "PLANNED" ? <button type="button" onClick={() => completePeriod(occurrence.period!)} disabled={Boolean(busy)} className="h-8 rounded-md border border-emerald-200 px-3 py-2 text-[0.7rem] font-bold text-emerald-700">Mark complete</button> : null}</div> : !occurrence.eligibleBooks.length ? <span className="rounded-md bg-amber-50 px-2 py-2 text-[0.68rem] font-semibold text-amber-800">No eligible book for this class and subject.</span> : <button type="button" onClick={() => openComposer(occurrence)} disabled={!selectedBook || Boolean(busy)} className="h-8 rounded-md bg-teal-700 px-3 py-2 text-[0.7rem] font-bold text-white disabled:opacity-50">{busy === "save-composer" ? "Saving..." : "Plan period"}</button>}</article>) : <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">No upcoming timetable classes are scheduled for this subject.</p>}
        </div>
      </section>
      {plan ? (
        <>
          <SummaryStrip periods={plan.periods} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="text-sm font-bold text-slate-900">Teaching periods</h2><p className="text-[0.7rem] text-slate-500">{selectedBook?.title}</p></div>
          </div>
          {contentNotice(pageAvailability.state)}
          {!plan.periods.length ? (
            <section className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-5 text-center">
              <p className="text-xs font-semibold text-slate-800">No teaching periods planned yet.</p><p className="mt-1 text-[0.7rem] text-slate-500">Plan an upcoming timetable class above to create the first period.</p>
            </section>
          ) : (
            <PeriodList periods={plan.periods} busy={busy} sectionId={sectionId} sectionSubjectId={sectionSubjectId} bookId={selectedBook?.id ?? ""} canMapPages={canMapPages} onEdit={startEdit} onDelete={deletePeriod} onMove={movePeriod} onManagePages={setPageManagerPeriodId} onAddPages={openPagePicker} />
          )}
        </>
      ) : null}

      {composerOccurrence ? <TeachingPeriodComposer sectionSubjectId={sectionSubjectId} occurrence={composerOccurrence} period={composerOccurrence.period} book={selectedBook ?? composerOccurrence.book!} classLabel={className + "-" + sectionName} subjectName={subjectName} data={composerData} loading={composerLoading} saving={busy === "save-composer"} onClose={closeComposer} onSave={saveComposer} /> : null}
      {editingPeriod ? <PeriodDialog title="Edit Teaching Period" periodTitle={editingTitle} date={editingDate} chapterId={editingChapterId} status={editingStatus} chapters={chapters} saving={busy === "edit-period"} onTitleChange={setEditingTitle} onDateChange={setEditingDate} onChapterChange={setEditingChapterId} onStatusChange={setEditingStatus} onClose={closeEdit} onSave={savePeriod} saveLabel="Save Changes" /> : null}
      {pageManagerPeriod ? <PageReferenceManager period={pageManagerPeriod} sectionId={sectionId} sectionSubjectId={sectionSubjectId} busy={busy} onClose={() => setPageManagerPeriodId(null)} onAddPages={() => openPagePicker(pageManagerPeriod.id)} onRemovePage={(refId) => removePage(pageManagerPeriod.id, refId)} onMovePage={(ref, direction) => movePage(pageManagerPeriod, ref, direction)} /> : null}
      {pickerPeriodId && selectedBook ? <PagePicker pages={visiblePages} modules={modules} moduleFilter={moduleFilter} pageSearch={pageSearch} selectedPageKeys={selectedPageKeys} selectedCount={selectedPages.length} loading={pagesLoading} preview={preview} previewLoading={previewLoading} contentState={availabilityState} busy={busy === "add-pages"} onClose={() => { setPickerPeriodId(null); setPreview(null); }} onModuleChange={setModuleFilter} onSearchChange={setPageSearch} onToggle={togglePage} onPreview={previewPage} onAdd={addSelectedPages} /> : null}
    </main>
  );
}

function occurrenceStateLabel(period: Period | null) {
  if (!period) return "Not planned";
  if (period.status === "PLANNED") return period.meaningfullyPlanned ? "Planned" : "Not planned";
  return period.status[0] + period.status.slice(1).toLowerCase();
}

function formatOccurrenceDate(value: string) {
  return new Date(value + "T12:00:00.000Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

function clockLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
function SummaryStrip({ periods }: { periods: Period[] }) {
  const planned = periods.filter((period) => period.status === "PLANNED" && period.meaningfullyPlanned).length;
  const completed = periods.filter((period) => period.status === "COMPLETED").length;
  const unscheduled = periods.filter((period) => !period.plannedDate).length;
  return <div className="grid grid-cols-2 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white sm:grid-cols-4"><SummaryItem label="Periods" value={periods.length} /><SummaryItem label="Planned" value={planned} /><SummaryItem label="Completed" value={completed} /><SummaryItem label="Unscheduled" value={unscheduled} /></div>;
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return <div className="px-3 py-2"><p className="text-[0.68rem] text-slate-500">{label}</p><p className="text-base font-bold leading-tight text-slate-900">{value}</p></div>;
}

function PeriodList({ periods, busy, sectionId, sectionSubjectId, bookId, canMapPages, onEdit, onDelete, onMove, onManagePages, onAddPages }: {
  periods: Period[];
  busy: string | null;
  sectionId: string;
  sectionSubjectId: string;
  bookId: string;
  canMapPages: boolean;
  onEdit: (period: Period) => void;
  onDelete: (period: Period) => void;
  onMove: (period: Period, direction: "EARLIER" | "LATER") => void;
  onManagePages: (periodId: string) => void;
  onAddPages: (periodId: string) => void;
}) {
  return <>
    <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="bg-slate-50 text-[0.68rem] font-bold uppercase tracking-wide text-slate-500"><tr><th className="w-14 px-3 py-2">Period</th><th className="w-24 px-2 py-2">Date</th><th className="px-2 py-2">Content</th><th className="w-28 px-2 py-2">Pages</th><th className="w-28 px-2 py-2">Status</th><th className="w-52 px-2 py-2">Action</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{periods.map((period, index) => <PeriodTableRow key={period.id} period={period} index={index} total={periods.length} busy={busy} sectionId={sectionId} sectionSubjectId={sectionSubjectId} canMapPages={canMapPages} bookId={bookId} onEdit={onEdit} onDelete={onDelete} onMove={onMove} onManagePages={onManagePages} onAddPages={onAddPages} />)}</tbody>
      </table>
    </div>
    <div className="space-y-2 md:hidden">{periods.map((period, index) => <article key={period.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[0.68rem] font-bold uppercase tracking-wide text-teal-700">Period {period.sequence}</p><p className="truncate text-sm font-bold text-slate-900">{periodContent(period)}</p></div><StatusBadge status={period.status} meaningfullyPlanned={period.meaningfullyPlanned} /></div><p className="mt-1 text-[0.7rem] text-slate-500">{formatPeriodDate(period.plannedDate)} · {pageSummary(period)}</p><div className="mt-2 flex flex-wrap gap-1.5"><PeriodActions period={period} index={index} total={periods.length} busy={busy} sectionId={sectionId} sectionSubjectId={sectionSubjectId} canMapPages={canMapPages} bookId={bookId} onEdit={onEdit} onDelete={onDelete} onMove={onMove} onManagePages={onManagePages} onAddPages={onAddPages} /></div></article>)}</div>
  </>;
}

function PeriodTableRow({ period, index, total, busy, sectionId, sectionSubjectId, bookId, canMapPages, onEdit, onDelete, onMove, onManagePages, onAddPages }: {
  period: Period;
  index: number;
  total: number;
  busy: string | null;
  sectionId: string;
  sectionSubjectId: string;
  bookId: string;
  canMapPages: boolean;
  onEdit: (period: Period) => void;
  onDelete: (period: Period) => void;
  onMove: (period: Period, direction: "EARLIER" | "LATER") => void;
  onManagePages: (periodId: string) => void;
  onAddPages: (periodId: string) => void;
}) {
  return <tr className="h-12 align-middle"><td className="px-3 font-bold text-slate-800">{period.sequence}</td><td className="px-2 text-slate-600">{formatPeriodDate(period.plannedDate)}</td><td className="max-w-[18rem] px-2"><p className="truncate font-semibold text-slate-900">{periodContent(period)}</p>{periodContentModule(period) ? <p className="truncate text-[0.68rem] text-slate-500">{periodContentModule(period)}</p> : null}</td><td className="px-2 text-slate-600">{pageSummary(period)}</td><td className="px-2"><StatusBadge status={period.status} meaningfullyPlanned={period.meaningfullyPlanned} /></td><td className="px-2"><PeriodActions period={period} index={index} total={total} busy={busy} sectionId={sectionId} sectionSubjectId={sectionSubjectId} canMapPages={canMapPages} bookId={bookId} onEdit={onEdit} onDelete={onDelete} onMove={onMove} onManagePages={onManagePages} onAddPages={onAddPages} /></td></tr>;
}

function PeriodActions({ period, index, total, busy, sectionId, sectionSubjectId, bookId, canMapPages, onEdit, onDelete, onMove, onManagePages, onAddPages }: {
  period: Period;
  index: number;
  total: number;
  busy: string | null;
  sectionId: string;
  sectionSubjectId: string;
  bookId: string;
  canMapPages: boolean;
  onEdit: (period: Period) => void;
  onDelete: (period: Period) => void;
  onMove: (period: Period, direction: "EARLIER" | "LATER") => void;
  onManagePages: (periodId: string) => void;
  onAddPages: (periodId: string) => void;
}) {
  const disabled = Boolean(busy);
  return <>{period.meaningfullyPlanned && bookId ? <Link href={teacherTeachHref(sectionId, sectionSubjectId, bookId, period.id)} className="inline-flex h-7 items-center rounded bg-slate-900 px-2 text-[0.7rem] font-bold text-white">Teach</Link> : null}<button type="button" onClick={() => onEdit(period)} disabled={disabled} className="h-7 rounded border border-slate-300 px-2 text-[0.7rem] font-bold text-slate-700">Edit</button><button type="button" onClick={() => onManagePages(period.id)} disabled={disabled} className="h-7 rounded border border-slate-300 px-2 text-[0.7rem] font-bold text-slate-700">Pages</button><button type="button" onClick={() => onAddPages(period.id)} disabled={!canMapPages || disabled} className="h-7 rounded border border-teal-200 bg-teal-50 px-2 text-[0.7rem] font-bold text-teal-800 disabled:cursor-not-allowed disabled:opacity-40">+ Pages</button><button type="button" onClick={() => onMove(period, "EARLIER")} disabled={index === 0 || disabled} aria-label={"Move Period " + period.sequence + " earlier"} className="h-7 rounded border border-slate-200 px-1.5 text-[0.7rem] font-bold text-slate-600 disabled:opacity-35">↑</button><button type="button" onClick={() => onMove(period, "LATER")} disabled={index === total - 1 || disabled} aria-label={"Move Period " + period.sequence + " later"} className="h-7 rounded border border-slate-200 px-1.5 text-[0.7rem] font-bold text-slate-600 disabled:opacity-35">↓</button><button type="button" onClick={() => onDelete(period)} disabled={disabled} className="h-7 rounded border border-rose-200 px-2 text-[0.7rem] font-bold text-rose-700 disabled:opacity-40">Delete</button></>;
}

function StatusBadge({ status, meaningfullyPlanned }: { status: TeachingPeriodStatus; meaningfullyPlanned: boolean }) {
  const styles: Record<TeachingPeriodStatus, string> = { PLANNED: "bg-blue-50 text-blue-700", COMPLETED: "bg-emerald-50 text-emerald-700", SKIPPED: "bg-slate-100 text-slate-600", RESCHEDULED: "bg-amber-50 text-amber-700" };
  const isEmptyPlannedPeriod = status === "PLANNED" && !meaningfullyPlanned;
  return <span className={"inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide " + (isEmptyPlannedPeriod ? "bg-slate-100 text-slate-600" : styles[status])}>{isEmptyPlannedPeriod ? "Not planned" : STATUS_LABELS[status]}</span>;
}

function PeriodDialog({ title, periodTitle, date, chapterId, status, chapters, saving, onTitleChange, onDateChange, onChapterChange, onStatusChange, onClose, onSave, saveLabel, statusReadOnly = false }: {
  title: string;
  periodTitle: string;
  date: string;
  chapterId: string;
  status: TeachingPeriodStatus;
  chapters: Chapter[];
  saving: boolean;
  onTitleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onChapterChange: (value: string) => void;
  onStatusChange: (value: TeachingPeriodStatus) => void;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
  statusReadOnly?: boolean;
}) {
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/30 p-3">
    <section className="mx-auto mt-8 max-w-md rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
      <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold text-slate-950">{title}</h2><button type="button" onClick={onClose} disabled={saving} className="text-xs font-bold text-slate-500">Close</button></div>
      <div className="mt-3 space-y-2.5">
        <label className="block text-xs font-bold text-slate-700">Title<input value={periodTitle} onChange={(event) => onTitleChange(event.target.value)} maxLength={180} autoFocus className="mt-1 h-8 w-full rounded-md border border-slate-300 px-2 text-xs" /></label>
        <label className="block text-xs font-bold text-slate-700">Planned date <span className="font-normal text-slate-400">(optional)</span><input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} className="mt-1 h-8 w-full rounded-md border border-slate-300 px-2 text-xs" /></label>
        {chapters.length ? <label className="block text-xs font-bold text-slate-700">Chapter <span className="font-normal text-slate-400">(optional)</span><select value={chapterId} onChange={(event) => onChapterChange(event.target.value)} className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"><option value="">No chapter</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>Chapter {chapter.chapterNumber}: {chapter.title}</option>)}</select></label> : null}
        <label className="block text-xs font-bold text-slate-700">Status{statusReadOnly ? <p className="mt-1 h-8 rounded-md bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-600">Planned</p> : <select value={status} onChange={(event) => onStatusChange(event.target.value as TeachingPeriodStatus)} className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs">{(Object.keys(STATUS_LABELS) as TeachingPeriodStatus[]).map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select>}</label>
      </div>
      <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="h-8 rounded-md border border-slate-300 px-3 text-xs font-bold text-slate-700">Cancel</button><button type="button" onClick={onSave} disabled={!periodTitle.trim() || saving} className="h-8 rounded-md bg-teal-700 px-3 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving..." : saveLabel}</button></div>
    </section>
  </div>;
}

function PageReferenceManager({ period, sectionId, sectionSubjectId, busy, onClose, onAddPages, onRemovePage, onMovePage }: {
  period: Period;
  sectionId: string;
  sectionSubjectId: string;
  busy: string | null;
  onClose: () => void;
  onAddPages: () => void;
  onRemovePage: (refId: string) => void;
  onMovePage: (ref: PageReference, direction: "EARLIER" | "LATER") => void;
}) {
  return <div role="dialog" aria-modal="true" aria-label={"Pages for Period " + period.sequence} className="fixed inset-0 z-30 overflow-y-auto bg-slate-950/30 p-3">
    <section className="mx-auto mt-8 max-w-lg rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-950">Period {period.sequence} pages</h2><p className="text-[0.7rem] text-slate-500">{periodContent(period)}</p></div><button type="button" onClick={onClose} className="text-xs font-bold text-slate-500">Close</button></div>
      <div className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200">
        {!period.pageRefs.length ? <p className="px-2 py-3 text-xs text-slate-500">No pages mapped to this period.</p> : period.pageRefs.map((ref, index) => {
          const href = ref.state === "MISSING_PAGE" || !ref.chapterId ? null : teacherViewerHref(sectionId, sectionSubjectId, ref);
          return <div key={ref.refId} className="flex items-center gap-2 px-2 py-2"><span className="w-5 text-[0.7rem] font-bold text-slate-400">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{ref.state === "MISSING_PAGE" ? "Page unavailable" : "Page " + (ref.displayPageNumber ?? "") + " - " + ref.title}</p>{ref.moduleTitle ? <p className="truncate text-[0.68rem] text-slate-500">{ref.moduleTitle}</p> : null}</div>{href ? <Link href={href} className="text-[0.68rem] font-bold text-teal-700">Open</Link> : null}<button type="button" onClick={() => onMovePage(ref, "EARLIER")} disabled={index === 0 || Boolean(busy)} aria-label="Move page earlier" className="text-xs disabled:opacity-30">↑</button><button type="button" onClick={() => onMovePage(ref, "LATER")} disabled={index === period.pageRefs.length - 1 || Boolean(busy)} aria-label="Move page later" className="text-xs disabled:opacity-30">↓</button><button type="button" onClick={() => onRemovePage(ref.refId)} disabled={Boolean(busy)} className="text-[0.68rem] font-bold text-rose-700 disabled:opacity-40">Remove</button></div>;
        })}
      </div>
      <button type="button" onClick={onAddPages} disabled={Boolean(busy)} className="mt-3 h-8 rounded-md bg-teal-700 px-3 text-xs font-bold text-white disabled:opacity-50">+ Add Pages</button>
    </section>
  </div>;
}

function PagePicker({ pages, modules, moduleFilter, pageSearch, selectedPageKeys, selectedCount, loading, preview, previewLoading, contentState, busy, onClose, onModuleChange, onSearchChange, onToggle, onPreview, onAdd }: {
  pages: AvailablePage[];
  modules: Array<{ id: string; title: string }>;
  moduleFilter: string;
  pageSearch: string;
  selectedPageKeys: string[];
  selectedCount: number;
  loading: boolean;
  preview: PagePreview | null;
  previewLoading: boolean;
  contentState: PageAvailability["state"];
  busy: boolean;
  onClose: () => void;
  onModuleChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onToggle: (page: AvailablePage) => void;
  onPreview: (page: AvailablePage) => void;
  onAdd: () => void;
}) {
  return <div role="dialog" aria-modal="true" aria-label="Add book pages to teaching period" className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:p-5">
    <section className="mx-auto max-w-5xl rounded-lg bg-white p-3 shadow-xl">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-950">Add book pages</h2><p className="text-[0.7rem] text-slate-500">Select ordered V2 pages, then add them to the period.</p></div><button type="button" onClick={onClose} disabled={busy} className="h-8 rounded-md border border-slate-300 px-3 text-xs font-bold">Close</button></div>
      {loading ? <p className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-600">Loading available pages...</p> : null}
      {!loading && contentState === "V1_ONLY" ? <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Page-level mapping is available for V2 content.</p> : null}
      {!loading && contentState === "NO_DIGITAL_CONTENT" ? <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">No digital pages are available for this book.</p> : null}
      {!loading && contentState === "V2_AVAILABLE" ? <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(300px,1.1fr)]">
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2"><label className="text-[0.7rem] font-bold text-slate-700">Module<select value={moduleFilter} onChange={(event) => onModuleChange(event.target.value)} className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"><option value="all">All Modules</option>{modules.map((moduleItem) => <option key={moduleItem.id} value={moduleItem.id}>{moduleItem.title}</option>)}</select></label><label className="text-[0.7rem] font-bold text-slate-700">Search pages<input value={pageSearch} onChange={(event) => onSearchChange(event.target.value)} placeholder="Page number or title" className="mt-1 h-8 w-full rounded-md border border-slate-300 px-2 text-xs" /></label></div>
          <div className="max-h-[48vh] overflow-y-auto rounded-md border border-slate-200">{pages.map((page) => { const key = pageKey(page); const checked = selectedPageKeys.includes(key); const inputId = "teach-page-" + key; return <div key={key} className="flex items-center gap-2 border-b border-slate-100 p-2 last:border-0"><input id={inputId} type="checkbox" checked={checked} onChange={() => onToggle(page)} className="h-4 w-4" /><label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer text-xs"><span className="font-bold">Page {page.displayPageNumber}</span> - {page.title}<span className="block text-[0.68rem] text-slate-500">{page.moduleTitle}</span></label><button type="button" onClick={() => onPreview(page)} className="h-7 rounded border border-slate-300 px-2 text-[0.68rem] font-bold">Preview</button></div>; })}{!pages.length ? <p className="p-3 text-xs text-slate-500">No pages match this filter.</p> : null}</div>
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-slate-600">{selectedCount} selected</span><button type="button" onClick={onAdd} disabled={!selectedCount || busy} className="h-8 rounded-md bg-teal-700 px-3 text-xs font-bold text-white disabled:opacity-50">{busy ? "Adding..." : "Add Selected Pages"}</button></div>
        </div>
        <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-2"><p className="px-1 text-[0.68rem] font-bold uppercase tracking-wide text-slate-500">Preview</p>{previewLoading ? <p className="p-3 text-xs text-slate-600">Loading preview...</p> : null}{!previewLoading && !preview ? <p className="p-3 text-xs text-slate-500">Choose Preview for one page.</p> : null}{preview ? <div className="mt-2 max-h-[62vh] overflow-y-auto rounded-md bg-white p-2"><p className="mb-2 text-xs font-bold text-slate-800">Page {preview.metadata.displayPageNumber} - {preview.metadata.title}</p><V2ContentDocumentRenderer document={preview.document} mode="TEACHER" linkedAssets={preview.linkedAssets} activities={preview.activities} worksheets={preview.worksheets} media={preview.media} sectionDefinitions={preview.sectionDefinitions} knowledgeDefinitions={preview.knowledgeDefinitions} resourceUrls={preview.resourceUrls} pageNumberOffset={preview.metadata.displayPageNumber - 1} /></div> : null}</div>
      </div> : null}
    </section>
  </div>;
}

function EmptyBookState() {
  return <section className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-xs text-slate-600"><p className="font-semibold text-slate-900">No eligible book assigned</p><p className="mt-1">Period and page authoring becomes available after a school-approved book is assigned.</p></section>;
}

function contentNotice(state: PageAvailability["state"]) {
  if (state === "V1_ONLY") return <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Page mapping is available for V2 content.</p>;
  if (state === "NO_DIGITAL_CONTENT") return <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">No digital pages are available for this book.</p>;
  return null;
}

function periodContent(period: Period) {
  return period.chapterTitle || uniqueModuleTitles(period)[0] || period.title;
}

function periodContentModule(period: Period) {
  const modules = uniqueModuleTitles(period);
  return period.chapterTitle && modules.length ? modules.join(" · ") : null;
}

function uniqueModuleTitles(period: Period) {
  return [...new Set(period.pageRefs.map((ref) => ref.moduleTitle).filter((title): title is string => Boolean(title)))];
}

function teacherTeachHref(sectionId: string, sectionSubjectId: string, bookId: string, periodId: string) {
  return "/teacher-dashboard/classes/" + encodeURIComponent(sectionId) + "/teach?subject=" + encodeURIComponent(sectionSubjectId) + "&bookId=" + encodeURIComponent(bookId) + "&periodId=" + encodeURIComponent(periodId);
}

function pageSummary(period: Period) {
  const numbers = period.pageRefs.map((ref) => ref.displayPageNumber).filter((value): value is number => typeof value === "number");
  if (!numbers.length) return period.pageRefs.length ? period.pageRefs.length + " pages" : "No pages";
  const sorted = [...new Set(numbers)].sort((left, right) => left - right);
  const contiguous = sorted.every((value, index) => index === 0 || value === sorted[index - 1] + 1);
  if (contiguous && sorted.length > 1) return "Pages " + sorted[0] + "-" + sorted[sorted.length - 1];
  if (sorted.length === 1) return "Page " + sorted[0];
  return sorted.length + " pages";
}

function formatPeriodDate(value: Date | null) {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(value));
}

function dateInputValue(value: Date | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function pageKey(page: Pick<AvailablePage, "moduleId" | "pageId">) {
  return page.moduleId + ":" + page.pageId;
}

function teacherViewerHref(sectionId: string, sectionSubjectId: string, refItem: PageReference) {
  const params = new URLSearchParams({ subject: sectionSubjectId, bookId: refItem.deepLink.bookId, moduleId: refItem.deepLink.moduleId, pageId: refItem.deepLink.pageId });
  return "/teacher-dashboard/classes/" + sectionId + "/content/" + refItem.chapterId + "?" + params.toString() + "#" + refItem.deepLink.anchor;
}

function toTeacherMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/book.*(not authorized|not available)|BOOK_NOT_ENTITLED/i.test(message)) return "This book is no longer available to this school.";
  if (/date|chapter|status|planned/i.test(message)) return "Check the period date, chapter, or status and try again.";
  if (/V2 page|selected.*page|INVALID_PAGE/i.test(message)) return "One or more selected pages are no longer available.";
  if (/not assigned|unauthorized|access/i.test(message)) return "This teaching plan is not available to your account.";
  if (/concurrent|stale|CONFLICT/i.test(message)) return "The teaching order changed. Please try again.";
  return "Could not save the teaching plan. Try again.";
}
