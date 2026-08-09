"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import V2ContentDocumentRenderer from "@/components/content/V2ContentDocumentRenderer";
import {
  addTeachingPeriodPagesAction,
  createTeachingPeriodAction,
  createTeachingPlanAction,
  deleteTeachingPeriodAction,
  getTeachingPlanPageAvailabilityAction,
  getTeachingPlanPagePreviewAction,
  moveTeachingPeriodAction,
  removeTeachingPeriodPageAction,
  reorderTeachingPeriodPagesAction,
  updateTeachingPeriodAction,
} from "@/app/teacher-dashboard/classes/[sectionId]/plan/teaching-actions";

type Plan = Awaited<ReturnType<typeof createTeachingPlanAction>>;
type Period = Plan["periods"][number];
type PageReference = Period["pageRefs"][number];
type PageAvailability = Awaited<ReturnType<typeof getTeachingPlanPageAvailabilityAction>>;
type AvailablePage = PageAvailability["pages"][number];
type PagePreview = Awaited<ReturnType<typeof getTeachingPlanPagePreviewAction>>;

type WorkspaceProps = {
  sectionId: string;
  sectionSubjectId: string;
  className: string;
  sectionName: string;
  subjectName: string;
  academicYearName: string;
  books: Array<{ id: string; title: string }>;
  selectedBook: { id: string; title: string } | null;
  initialPlan: Plan | null;
  pageAvailability: PageAvailability;
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
  initialPlan,
  pageAvailability,
}: WorkspaceProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(initialPlan);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [newPeriodTitle, setNewPeriodTitle] = useState("");
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [pickerPeriodId, setPickerPeriodId] = useState<string | null>(null);
  const [availablePages, setAvailablePages] = useState<AvailablePage[]>(pageAvailability.pages);
  const [availabilityState, setAvailabilityState] = useState<PageAvailability["state"]>(pageAvailability.state);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [pageSearch, setPageSearch] = useState("");
  const [selectedPageKeys, setSelectedPageKeys] = useState<string[]>([]);
  const [preview, setPreview] = useState<PagePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);


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
      const matchesSearch = !search || `page ${page.displayPageNumber} ${page.title}`.toLowerCase().includes(search);
      return matchesModule && matchesSearch;
    });
  }, [availablePages, moduleFilter, pageSearch]);
  const selectedPages = useMemo(() => availablePages.filter((page) => selectedPageKeys.includes(pageKey(page))), [availablePages, selectedPageKeys]);

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

  function createPlan() {
    if (!selectedBook) return;
    runMutation("create-plan", () => createTeachingPlanAction({ sectionSubjectId, bookId: selectedBook.id }), setPlan);
  }

  function createPeriod() {
    if (!plan || !newPeriodTitle.trim()) return;
    runMutation("create-period", () => createTeachingPeriodAction({ planId: plan.id, title: newPeriodTitle }), (period) => {
      setPlan((current) => current ? { ...current, periods: [...current.periods, period].sort((left, right) => left.sequence - right.sequence) } : current);
      setNewPeriodTitle("");
      setAddingPeriod(false);
    });
  }

  function savePeriod(periodId: string) {
    if (!editingTitle.trim()) return;
    runMutation("edit-period", () => updateTeachingPeriodAction({ periodId, title: editingTitle }), (period) => {
      replacePeriod(period);
      setEditingPeriodId(null);
      setEditingTitle("");
    });
  }

  function deletePeriod(period: Period) {
    if (period.pageRefs.length && !window.confirm(`Delete Period ${period.sequence}? This removes the teaching-period mapping only. The Publisher book is not changed.`)) return;
    runMutation("delete-period", () => deleteTeachingPeriodAction({ periodId: period.id }), ({ deletedPeriodId }) => {
      setPlan((current) => current ? { ...current, periods: current.periods.filter((entry) => entry.id !== deletedPeriodId) } : current);
    });
  }

  function movePeriod(period: Period, direction: "EARLIER" | "LATER") {
    runMutation(`move-period-${direction}`, () => moveTeachingPeriodAction({ periodId: period.id, direction }), setPlan);
  }

  function openPagePicker(periodId: string) {
    if (!selectedBook) return;
    setPickerPeriodId(periodId);
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
    const [moved] = orderedPageRefIds.splice(index, 1);
    orderedPageRefIds.splice(nextIndex, 0, moved);
    runMutation(`move-page-${direction}`, () => reorderTeachingPeriodPagesAction({ periodId: period.id, orderedPageRefIds }), replacePeriod);
  }

  function selectBook(bookId: string) {
    const params = new URLSearchParams({ subject: sectionSubjectId, bookId });
    router.replace(`/teacher-dashboard/classes/${sectionId}/plan?${params.toString()}`);
  }

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Teaching Plan</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">{subjectName}</h2>
        <p className="mt-1 text-sm text-slate-600">{className} / {sectionName} · {academicYearName}</p>
        <label className="mt-4 block max-w-md text-sm font-semibold text-slate-800">
          Book
          <select
            aria-label="Select entitled book"
            value={selectedBook?.id ?? ""}
            onChange={(event) => selectBook(event.target.value)}
            disabled={!books.length || Boolean(busy)}
            className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium"
          >
            {!books.length ? <option value="">No entitled books</option> : null}
            {books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
          </select>
        </label>
      </header>

      {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {!selectedBook ? <EmptyEntitlement /> : null}
      {selectedBook && !plan ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">No teaching plan yet.</p>
          <p className="mt-1">Create a compact plan for {selectedBook.title}. It stays separate from plans for other entitled books.</p>
          <button type="button" onClick={createPlan} disabled={isPending || busy === "create-plan"} className="mt-3 h-9 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white disabled:opacity-60">
            {busy === "create-plan" ? "Creating…" : "Create Teaching Plan"}
          </button>
        </section>
      ) : null}

      {plan ? (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm">
            <span className="font-semibold text-slate-900">Plan summary</span> · {plan.periods.length} {plan.periods.length === 1 ? "period" : "periods"} · {plan.periods.reduce((count, period) => count + period.pageRefs.length, 0)} mapped pages
          </section>
          {contentNotice(pageAvailability.state)}
          <div className="space-y-3">
            {plan.periods.map((period, index) => (
              <PeriodCard
                key={period.id}
                period={period}
                sectionId={sectionId}
                sectionSubjectId={sectionSubjectId}
                canMapPages={canMapPages}
                busy={busy}
                isFirst={index === 0}
                isLast={index === plan.periods.length - 1}
                editing={editingPeriodId === period.id}
                editingTitle={editingTitle}
                onEditingTitleChange={setEditingTitle}
                onStartEdit={() => { setEditingPeriodId(period.id); setEditingTitle(period.title); }}
                onCancelEdit={() => { setEditingPeriodId(null); setEditingTitle(""); }}
                onSaveEdit={() => savePeriod(period.id)}
                onDelete={() => deletePeriod(period)}
                onMove={(direction) => movePeriod(period, direction)}
                onAddPages={() => openPagePicker(period.id)}
                onRemovePage={(refId) => removePage(period.id, refId)}
                onMovePage={(ref, direction) => movePage(period, ref, direction)}
              />
            ))}
          </div>
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            {addingPeriod ? (
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-[220px] flex-1 text-sm font-semibold">Period title
                  <input value={newPeriodTitle} onChange={(event) => setNewPeriodTitle(event.target.value)} maxLength={180} autoFocus className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </label>
                <button type="button" onClick={createPeriod} disabled={!newPeriodTitle.trim() || isPending} className="h-9 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white disabled:opacity-60">Create</button>
                <button type="button" onClick={() => { setAddingPeriod(false); setNewPeriodTitle(""); }} className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold">Cancel</button>
              </div>
            ) : <button type="button" onClick={() => setAddingPeriod(true)} className="h-9 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-800">+ Add Period</button>}
          </section>
        </>
      ) : null}

      {pickerPeriodId && selectedBook ? (
        <PagePicker
          pages={visiblePages}
          modules={modules}
          moduleFilter={moduleFilter}
          pageSearch={pageSearch}
          selectedPageKeys={selectedPageKeys}
          selectedCount={selectedPages.length}
          loading={pagesLoading}
          preview={preview}
          previewLoading={previewLoading}
          contentState={availabilityState}
          busy={busy === "add-pages"}
          onClose={() => { setPickerPeriodId(null); setPreview(null); }}
          onModuleChange={setModuleFilter}
          onSearchChange={setPageSearch}
          onToggle={togglePage}
          onPreview={previewPage}
          onAdd={addSelectedPages}
        />
      ) : null}
    </section>
  );
}

function PeriodCard({ period, sectionId, sectionSubjectId, canMapPages, busy, isFirst, isLast, editing, editingTitle, onEditingTitleChange, onStartEdit, onCancelEdit, onSaveEdit, onDelete, onMove, onAddPages, onRemovePage, onMovePage }: {
  period: Period;
  sectionId: string;
  sectionSubjectId: string;
  canMapPages: boolean;
  busy: string | null;
  isFirst: boolean;
  isLast: boolean;
  editing: boolean;
  editingTitle: string;
  onEditingTitleChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onMove: (direction: "EARLIER" | "LATER") => void;
  onAddPages: () => void;
  onRemovePage: (refId: string) => void;
  onMovePage: (ref: PageReference, direction: "EARLIER" | "LATER") => void;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Period {period.sequence}</p>
          {editing ? (
            <div className="mt-1 flex flex-wrap gap-2">
              <label className="sr-only" htmlFor={`period-title-${period.id}`}>Period {period.sequence} title</label>
              <input id={`period-title-${period.id}`} value={editingTitle} onChange={(event) => onEditingTitleChange(event.target.value)} maxLength={180} className="h-9 min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold" />
              <button type="button" onClick={onSaveEdit} disabled={!editingTitle.trim() || Boolean(busy)} className="h-9 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white disabled:opacity-60">Save</button>
              <button type="button" onClick={onCancelEdit} disabled={Boolean(busy)} className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold">Cancel</button>
            </div>
          ) : <h3 className="mt-1 text-base font-bold text-slate-950">{period.title}</h3>}
        </div>
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={() => onMove("EARLIER")} disabled={isFirst || Boolean(busy)} aria-label={`Move Period ${period.sequence} earlier`} className="h-9 rounded-lg border border-slate-300 px-2 text-xs font-semibold disabled:opacity-40">Earlier</button>
          <button type="button" onClick={() => onMove("LATER")} disabled={isLast || Boolean(busy)} aria-label={`Move Period ${period.sequence} later`} className="h-9 rounded-lg border border-slate-300 px-2 text-xs font-semibold disabled:opacity-40">Later</button>
          {!editing ? <button type="button" onClick={onStartEdit} disabled={Boolean(busy)} className="h-9 rounded-lg border border-slate-300 px-2 text-xs font-semibold">Edit</button> : null}
          <button type="button" onClick={onDelete} disabled={Boolean(busy)} className="h-9 rounded-lg border border-rose-200 px-2 text-xs font-semibold text-rose-700">Delete</button>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pages</p>
          <button type="button" onClick={onAddPages} disabled={!canMapPages || Boolean(busy)} className="h-9 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-800 disabled:cursor-not-allowed disabled:opacity-50">Add Pages</button>
        </div>
        {!period.pageRefs.length ? <p className="mt-2 text-sm text-slate-500">No book pages added.</p> : (
          <ol className="mt-2 space-y-2">
            {period.pageRefs.map((ref, index) => <PageReferenceRow key={ref.refId} refItem={ref} period={period} index={index} sectionId={sectionId} sectionSubjectId={sectionSubjectId} busy={busy} onRemove={() => onRemovePage(ref.refId)} onMove={(direction) => onMovePage(ref, direction)} />)}
          </ol>
        )}
      </div>
    </article>
  );
}

function PageReferenceRow({ refItem, period, index, sectionId, sectionSubjectId, busy, onRemove, onMove }: {
  refItem: PageReference;
  period: Period;
  index: number;
  sectionId: string;
  sectionSubjectId: string;
  busy: string | null;
  onRemove: () => void;
  onMove: (direction: "EARLIER" | "LATER") => void;
}) {
  const viewerHref = refItem.state === "MISSING_PAGE" || !refItem.chapterId ? null : teacherViewerHref(sectionId, sectionSubjectId, refItem);
  const label = refItem.state === "MISSING_PAGE" ? "Page unavailable" : `Page ${refItem.displayPageNumber ?? ""} — ${refItem.title}`;
  return (
    <li className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{index + 1}. {label}</p>
          {refItem.moduleTitle ? <p className="text-xs text-slate-500">{refItem.moduleTitle}</p> : null}
          {refItem.visualMode === "EXACT_REPLICA" ? <span className="mt-1 inline-flex rounded-full bg-fuchsia-100 px-2 py-0.5 text-xs font-semibold text-fuchsia-800">Exact Replica</span> : null}
          {refItem.state === "SOURCE_CHANGED" ? <p role="status" className="mt-1 text-xs font-semibold text-amber-800">Content updated by Publisher.</p> : null}
          {refItem.state === "MISSING_PAGE" ? <p role="status" className="mt-1 text-xs font-semibold text-amber-800">Publisher content is no longer available. The mapping is preserved until you remove it.</p> : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {viewerHref ? <Link href={viewerHref} className="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-white px-2 text-xs font-semibold text-blue-800">Open Page</Link> : null}
          <button type="button" onClick={() => onMove("EARLIER")} disabled={index === 0 || Boolean(busy)} aria-label={`Move ${label} earlier`} className="h-9 rounded-lg border border-slate-300 px-2 text-xs font-semibold disabled:opacity-40">Earlier</button>
          <button type="button" onClick={() => onMove("LATER")} disabled={index === period.pageRefs.length - 1 || Boolean(busy)} aria-label={`Move ${label} later`} className="h-9 rounded-lg border border-slate-300 px-2 text-xs font-semibold disabled:opacity-40">Later</button>
          <button type="button" onClick={onRemove} disabled={Boolean(busy)} className="h-9 rounded-lg border border-rose-200 bg-white px-2 text-xs font-semibold text-rose-700">Remove</button>
        </div>
      </div>
    </li>
  );
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
  return (
    <div role="dialog" aria-modal="true" aria-label="Add book pages to teaching period" className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:p-6">
      <section className="mx-auto my-0 max-w-6xl rounded-xl bg-white p-3 shadow-xl sm:my-8 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-base font-bold text-slate-950">Add Pages</h2><p id="picker-guidance" className="mt-1 text-xs text-slate-500">Selected pages are added in current book list order.</p></div>
          <button type="button" onClick={onClose} disabled={busy} className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold">Close</button>
        </div>
        {loading ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Loading available pages…</p> : null}
        {!loading && contentState === "V1_ONLY" ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Page-level Teaching Plan mapping is available for V2 content.</p> : null}
        {!loading && contentState === "NO_DIGITAL_CONTENT" ? <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">No digital pages are available for this book.</p> : null}
        {!loading && contentState === "V2_AVAILABLE" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(360px,1.2fr)]">
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">Module
                  <select value={moduleFilter} onChange={(event) => onModuleChange(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"><option value="all">All Modules</option>{modules.map((moduleItem) => <option key={moduleItem.id} value={moduleItem.id}>{moduleItem.title}</option>)}</select>
                </label>
                <label className="text-xs font-semibold text-slate-700">Search pages
                  <input value={pageSearch} onChange={(event) => onSearchChange(event.target.value)} placeholder="Page number or title" className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm" />
                </label>
              </div>
              <div className="max-h-[48vh] overflow-y-auto rounded-lg border border-slate-200">
                {pages.map((page) => {
                  const key = pageKey(page);
                  const checked = selectedPageKeys.includes(key);
                  const inputId = `teach-page-${key}`;
                  return <div key={key} className="flex items-center gap-2 border-b border-slate-100 p-2 last:border-0">
                    <input id={inputId} type="checkbox" checked={checked} onChange={() => onToggle(page)} aria-describedby="picker-guidance" className="h-4 w-4" />
                    <label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer text-sm"><span className="font-semibold">Page {page.displayPageNumber}</span> — {page.title}<span className="block text-xs text-slate-500">{page.moduleTitle}{page.visualMode === "EXACT_REPLICA" ? " · Exact Replica" : ""}</span></label>
                    <button type="button" onClick={() => onPreview(page)} className="h-9 rounded-lg border border-slate-300 px-2 text-xs font-semibold">Preview</button>
                  </div>;
                })}
                {!pages.length ? <p className="p-3 text-sm text-slate-500">No pages match this filter.</p> : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-700">{selectedCount} {selectedCount === 1 ? "page" : "pages"} selected</span><button type="button" onClick={onAdd} disabled={!selectedCount || busy} className="h-9 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Adding…" : `Add ${selectedCount || ""} Selected Pages`}</button></div>
            </div>
            <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <p className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">Preview</p>
              {previewLoading ? <p className="p-3 text-sm text-slate-600">Loading page preview…</p> : null}
              {!previewLoading && !preview ? <p className="p-3 text-sm text-slate-500">Choose Preview for one page. Only the active page is rendered.</p> : null}
              {preview ? <div className="mt-2 max-h-[65vh] overflow-y-auto rounded-lg bg-white p-2"><p className="mb-2 text-sm font-semibold text-slate-800">Page {preview.metadata.displayPageNumber} — {preview.metadata.title}</p><V2ContentDocumentRenderer document={preview.document} mode="TEACHER" linkedAssets={preview.linkedAssets} activities={preview.activities} worksheets={preview.worksheets} media={preview.media} sectionDefinitions={preview.sectionDefinitions} knowledgeDefinitions={preview.knowledgeDefinitions} resourceUrls={preview.resourceUrls} pageNumberOffset={preview.metadata.displayPageNumber - 1} /></div> : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function EmptyEntitlement() {
  return <section className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600"><p className="font-semibold text-slate-900">No entitled books are available for this subject.</p><p className="mt-1">A Teaching Plan can be created when a school-approved book is available.</p></section>;
}

function contentNotice(state: PageAvailability["state"]) {
  if (state === "V1_ONLY") return <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Page-level Teaching Plan mapping is available for V2 content.</p>;
  if (state === "NO_DIGITAL_CONTENT") return <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">No digital pages are available for this book.</p>;
  return null;
}

function pageKey(page: Pick<AvailablePage, "moduleId" | "pageId">) {
  return `${page.moduleId}:${page.pageId}`;
}

function teacherViewerHref(sectionId: string, sectionSubjectId: string, refItem: PageReference) {
  const params = new URLSearchParams({
    subject: sectionSubjectId,
    bookId: refItem.deepLink.bookId,
    moduleId: refItem.deepLink.moduleId,
    pageId: refItem.deepLink.pageId,
  });
  return `/teacher-dashboard/classes/${sectionId}/content/${refItem.chapterId}?${params.toString()}#${refItem.deepLink.anchor}`;
}

function toTeacherMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/book.*(not authorized|not available)|BOOK_NOT_ENTITLED/i.test(message)) return "This book is no longer available to this school.";
  if (/V2 page|selected.*page|INVALID_PAGE/i.test(message)) return "One or more selected pages are no longer available.";
  if (/not assigned|unauthorized|access/i.test(message)) return "This teaching plan is not available to your account.";
  if (/concurrent|stale|CONFLICT/i.test(message)) return "The teaching order changed. Please try again.";
  return "Could not save the teaching plan. Try again.";
}