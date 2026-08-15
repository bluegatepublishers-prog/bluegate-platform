"use client";

import Link from "next/link";
import { Eye, LoaderCircle, Minus, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import AssignmentsWorkspaceNav from "@/components/admin/books/AssignmentsWorkspaceNav";
import PublisherAssessmentPreview from "@/components/admin/books/PublisherAssessmentPreview";
import type { InteractiveQuestion } from "@/lib/normalized-question";
import { getPublisherAssessmentScopeSummary } from "@/lib/publisher-assessment-presentation";

type Kind =
  | "CHAPTER_TEST"
  | "MULTI_CHAPTER_TEST"
  | "UNIT_TEST"
  | "TERM_TEST"
  | "MULTI_TERM_TEST"
  | "BOOK_TEST"
  | "EXAM"
  | "FINAL_EXAM"
  | "DIAGNOSTIC";
type Mode = "INTERACTIVE" | "PRINT" | "BOTH";
type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type Chapter = {
  id: string;
  title: string;
  chapterNumber: number;
  unitId: string | null;
};
type Unit = { id: string; title: string };
type Module = { id: string; title: string; chapterId: string };
type SafeQuestion = {
  id: string;
  chapterId: string;
  questionType: string;
  questionText: string;
  marks: number;
  difficulty: string;
  tags: string[];
  chapter: { title: string; chapterNumber: number };
  module: { title: string } | null;
  preview: InteractiveQuestion;
};
type Item = SafeQuestion & { itemId: string; position: number };
type Assessment = {
  id: string;
  kind: Kind;
  deliveryMode: Mode;
  status: Status;
  chapterId: string | null;
  unitId: string | null;
  chapterIds: string[];
  instructions: string | null;
  durationMinutes: number | null;
  sectionInstructions: Array<{ questionType: string; instruction: string }>;
  items: Item[];
};
type Result = { ok: boolean; assessmentId?: string; message?: string };
type DraftInput = {
  assessmentId?: string;
  kind: string;
  deliveryMode: string;
  chapterId?: string | null;
  unitId?: string | null;
  chapterIds?: string[];
  instructions?: string | null;
  durationMinutes?: number | null;
  sectionInstructions?: Array<{ questionType: string; instruction: string }>;
};

const kinds: Array<[Kind, string]> = [
  ["CHAPTER_TEST", "Chapter Test"],
  ["MULTI_CHAPTER_TEST", "Multi-Chapter Test"],
  ["UNIT_TEST", "Unit Test"],
  ["TERM_TEST", "Term Test"],
  ["MULTI_TERM_TEST", "Multi-Term Test"],
  ["BOOK_TEST", "Book Test"],
  ["FINAL_EXAM", "Final Exam"],
  ["EXAM", "Exam"],
  ["DIAGNOSTIC", "Diagnostic Assessment"],
];
const emptyItems: Item[] = [];

const questionTypes = [
  "MCQ",
  "TRUE_FALSE",
  "FILL_BLANK",
  "MATCH",
  "MULTIPLE_SELECT",
  "ORDERING",
  "SHORT_ANSWER",
  "LONG_ANSWER",
  "PICTURE_BASED",
  "CASE_BASED",
  "COMPETENCY",
  "HOTS",
  "ASSERTION_REASON",
  "PRACTICAL",
  "PROJECT",
  "CUSTOM",
];

export default function PublisherAssessmentStudio({
  bookId,
  chapters,
  units,
  modules,
  assessment,
  initialPreview,
  saveAction,
  publishAction,
  addQuestionsAction,
  removeItemAction,
  moveItemAction,
  archiveAction,
  restoreAction,
}: {
  bookId: string;
  chapters: Chapter[];
  units: Unit[];
  modules: Module[];
  assessment: Assessment | null;
  initialPreview: boolean;
  saveAction: (input: DraftInput) => Promise<Result>;
  publishAction: (assessmentId: string) => Promise<Result>;
  addQuestionsAction: (
    assessmentId: string,
    questionIds: string[],
  ) => Promise<Result>;
  removeItemAction: (assessmentId: string, itemId: string) => Promise<Result>;
  moveItemAction: (
    assessmentId: string,
    itemId: string,
    direction: -1 | 1,
  ) => Promise<Result>;
  archiveAction: (assessmentId: string) => Promise<Result>;
  restoreAction: (assessmentId: string) => Promise<Result>;
}) {
  const router = useRouter();
  const editable = !assessment || assessment.status === "DRAFT";
  const [kind, setKind] = useState<Kind>(assessment?.kind ?? "CHAPTER_TEST");
  const [deliveryMode, setDeliveryMode] = useState<Mode>(
    assessment?.deliveryMode ?? "BOTH",
  );
  const [chapterId, setChapterId] = useState(assessment?.chapterId ?? "");
  const [unitId, setUnitId] = useState(assessment?.unitId ?? "");
  const [chapterIds, setChapterIds] = useState<string[]>(
    assessment?.chapterIds ?? [],
  );
  const [instructions, setInstructions] = useState(
    assessment?.instructions ?? "",
  );
  const [durationMinutes, setDurationMinutes] = useState(
    assessment?.durationMinutes?.toString() ?? "",
  );
  const [sectionInstructions, setSectionInstructions] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      (assessment?.sectionInstructions ?? []).map((entry) => [
        entry.questionType,
        entry.instruction,
      ]),
    ),
  );
  const [examScope, setExamScope] = useState<"BOOK" | "CHAPTERS">(
    assessment?.chapterIds.length ? "CHAPTERS" : "BOOK",
  );
  const [diagnosticScope, setDiagnosticScope] = useState<
    "BOOK" | "UNIT" | "CHAPTERS"
  >(
    assessment?.unitId
      ? "UNIT"
      : assessment?.chapterId || assessment?.chapterIds.length
        ? "CHAPTERS"
        : "BOOK",
  );
  const [chapterCandidate, setChapterCandidate] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(initialPreview);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [candidates, setCandidates] = useState<SafeQuestion[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(
    [],
  );
  const [search, setSearch] = useState("");
  const [pickerChapterId, setPickerChapterId] = useState("");
  const [pickerModuleId, setPickerModuleId] = useState("");
  const [pickerType, setPickerType] = useState("");
  const [pickerDifficulty, setPickerDifficulty] = useState("");
  const [pickerTag, setPickerTag] = useState("");
  const [pending, startTransition] = useTransition();

  const selectedItems = assessment?.items ?? emptyItems;
  const totalMarks = selectedItems.reduce(
    (total, item) => total + item.marks,
    0,
  );
  const selectedQuestionGroups = useMemo(() => {
    let questionNumber = 0;
    return groupItemsByType(selectedItems).map((group) => ({
      ...group,
      items: group.items.map((item) => ({
        ...item,
        displayNumber: ++questionNumber,
        persistedIndex: selectedItems.findIndex(
          (selected) => selected.itemId === item.itemId,
        ),
      })),
    }));
  }, [selectedItems]);
  const assessmentLabel =
    kinds.find(([value]) => value === kind)?.[1] ?? "Assessment";
  const allowedChapterIds = useMemo(() => {
    if (chapterIds.length) return new Set(chapterIds);
    if (chapterId) return new Set([chapterId]);
    if (unitId)
      return new Set(
        chapters
          .filter((chapter) => chapter.unitId === unitId)
          .map((chapter) => chapter.id),
      );
    return null;
  }, [chapterId, chapterIds, chapters, unitId]);
  const pickerModules = pickerChapterId
    ? modules.filter((module) => module.chapterId === pickerChapterId)
    : modules;

  useEffect(() => {
    if (!assessment || !pickerOpen) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      bookId,
      status: "APPROVED",
      pageSize: "100",
    });
    if (search.trim()) params.set("search", search.trim());
    if (pickerChapterId) params.set("chapterId", pickerChapterId);
    if (pickerModuleId) params.set("moduleId", pickerModuleId);
    if (pickerType) params.set("questionType", pickerType);
    if (pickerDifficulty) params.set("difficulty", pickerDifficulty);
    if (pickerTag.trim()) params.append("tags", pickerTag.trim());
    fetch(`/api/admin/questions?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          items?: Array<{
            id: string;
            context: {
              chapterId: string;
              chapter: { title: string; chapterNumber: number };
              module: { title: string } | null;
            };
            question: {
              questionType: string;
              questionText: string;
              marks: number;
              difficulty: string;
              tags: string[];
            };
            normalized: InteractiveQuestion;
          }>;
        };
        if (!response.ok)
          throw new Error("Unable to load approved publisher questions.");
        setCandidates(
          (payload.items ?? []).map((question) => ({
            id: question.id,
            chapterId: question.context.chapterId,
            questionType: question.question.questionType,
            questionText: question.question.questionText,
            marks: question.question.marks,
            difficulty: question.question.difficulty,
            tags: question.question.tags,
            chapter: question.context.chapter,
            module: question.context.module,
            preview: question.normalized,
          })),
        );
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load questions.",
          );
      });
    return () => controller.abort();
  }, [
    assessment,
    bookId,
    pickerOpen,
    pickerChapterId,
    pickerDifficulty,
    pickerModuleId,
    pickerTag,
    pickerType,
    search,
  ]);

  function orderedAdd() {
    if (chapterCandidate && !chapterIds.includes(chapterCandidate))
      setChapterIds((current) => [...current, chapterCandidate]);
    setChapterCandidate("");
  }
  function moveChapter(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= chapterIds.length) return;
    setChapterIds((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function chapterCountMinimum() {
    return kind === "MULTI_CHAPTER_TEST" || kind === "MULTI_TERM_TEST" ? 2 : 1;
  }
  function usesChapterMembership() {
    return (
      ["MULTI_CHAPTER_TEST", "TERM_TEST", "MULTI_TERM_TEST"].includes(kind) ||
      (kind === "EXAM" && examScope === "CHAPTERS") ||
      (kind === "DIAGNOSTIC" && diagnosticScope === "CHAPTERS")
    );
  }
  function validScope() {
    if (kind === "CHAPTER_TEST") return Boolean(chapterId);
    if (kind === "UNIT_TEST") return Boolean(unitId);
    if (usesChapterMembership())
      return chapterIds.length >= chapterCountMinimum();
    return true;
  }
  const canPreview = Boolean(assessment && validScope());

  function payload(): DraftInput {
    const membership = usesChapterMembership() ? chapterIds : [];
    return {
      assessmentId: assessment?.id,
      kind,
      deliveryMode,
      chapterId: kind === "CHAPTER_TEST" ? chapterId || null : null,
      unitId:
        kind === "UNIT_TEST" ||
        (kind === "DIAGNOSTIC" && diagnosticScope === "UNIT")
          ? unitId || null
          : null,
      chapterIds: membership,
      instructions: instructions || null,
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      sectionInstructions: Object.entries(sectionInstructions).map(
        ([questionType, instruction]) => ({ questionType, instruction }),
      ),
    };
  }
  function save() {
    if (!validScope()) {
      setMessage("Choose the required assessment scope before saving.");
      return;
    }
    startTransition(async () => {
      const result = await saveAction(payload());
      if (!result.ok) {
        setMessage(result.message ?? "Unable to save assessment.");
        return;
      }
      if (!assessment && result.assessmentId)
        router.replace(
          `/admin/books/${bookId}/content/assignments/assessments/${result.assessmentId}`,
        );
      else {
        setMessage("Draft saved. You can now continue building the assessment.");
        router.refresh();
      }
    });
  }
  function mutate(
    action: () => Promise<Result>,
    successMessage = "Assessment updated.",
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok)
        setMessage(result.message ?? "Unable to update assessment.");
      else {
        setMessage(successMessage);
        router.refresh();
      }
    });
  }  function addSelected() {
    if (!assessment || !selectedCandidateIds.length) return;
    const questionIds = selectedCandidateIds;
    setSelectedCandidateIds([]);
    mutate(() => addQuestionsAction(assessment.id, questionIds));
  }
  const visibleCandidates = candidates.filter(
    (question) =>
      (!allowedChapterIds || allowedChapterIds.has(question.chapterId)) &&
      !selectedItems.some((item) => item.id === question.id),
  );

  return (
    <main className="space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href={`/admin/books/${bookId}/content/assignments/assessments`}
            className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700"
          >
            ← Content Studio / Assignments
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{assessmentLabel}</h1>
            {assessment ? (
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${assessment.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : assessment.status === "ARCHIVED" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`}>
                {assessment.status}
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">NEW DRAFT</span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">1. Assessment Setup → 2. Questions → 3. Preview / Publish</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPreview(true)} disabled={!canPreview || pending} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"><Eye className="h-4 w-4" />Preview</button>
          {assessment?.status === "DRAFT" || !assessment ? (
            <button type="button" onClick={save} disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{assessment ? "Save Draft" : "Save & Continue"}</button>
          ) : null}
          {assessment?.status === "DRAFT" ? (
            <button type="button" onClick={() => mutate(() => publishAction(assessment.id), "Assessment published. It is now available in Content Studio → Insert → Assessment.")} disabled={pending} className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-60">Publish Assessment</button>
          ) : null}
          {assessment?.status === "PUBLISHED" ? <span className="inline-flex h-10 items-center rounded-lg bg-emerald-100 px-4 text-sm font-bold text-emerald-800">Published</span> : null}
        </div>
      </header>
      <AssignmentsWorkspaceNav bookId={bookId} active="assessments" />
      {message ? (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800"
        >
          {message}
        </div>
      ) : null}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">1. Assessment Setup</p>
            <h2 className="mt-1 font-bold text-slate-900">Define the paper</h2>
            <p className="mt-1 text-sm text-slate-500">Scope is required; duration and instructions are optional.</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50 text-center text-xs">
            <div className="px-3 py-2"><span className="block font-bold text-slate-900">{selectedItems.length}</span>Questions</div>
            <div className="px-3 py-2"><span className="block font-bold text-slate-900">{totalMarks}</span>Total marks</div>
            <div className="px-3 py-2"><span className="block font-bold text-slate-900">{durationMinutes || "—"}</span>Minutes</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Assessment kind"><select disabled={!editable} value={kind} onChange={(event) => { setKind(event.target.value as Kind); setChapterId(""); setUnitId(""); setChapterIds([]); }} className="control"><option value="">Choose assessment kind</option>{kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Assessment mode"><select disabled={!editable} value={deliveryMode} onChange={(event) => setDeliveryMode(event.target.value as Mode)} className="control"><option value="INTERACTIVE">Interactive</option><option value="PRINT">Printable</option><option value="BOTH">Both</option></select></Field>
          {kind === "CHAPTER_TEST" ? <Field label="Select chapter"><select disabled={!editable} value={chapterId} onChange={(event) => setChapterId(event.target.value)} className="control"><option value="">Choose chapter</option>{chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>Chapter {chapter.chapterNumber}: {chapter.title}</option>)}</select></Field> : null}
          {kind === "UNIT_TEST" || (kind === "DIAGNOSTIC" && diagnosticScope === "UNIT") ? <Field label="Select unit"><select disabled={!editable} value={unitId} onChange={(event) => setUnitId(event.target.value)} className="control"><option value="">Choose unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.title}</option>)}</select></Field> : null}
          {kind === "EXAM" ? <Field label="Exam scope"><select disabled={!editable} value={examScope} onChange={(event) => { setExamScope(event.target.value as "BOOK" | "CHAPTERS"); setChapterIds([]); }} className="control"><option value="BOOK">Whole Book</option><option value="CHAPTERS">Selected Chapters</option></select></Field> : null}
          {kind === "DIAGNOSTIC" ? <Field label="Diagnostic scope"><select disabled={!editable} value={diagnosticScope} onChange={(event) => { setDiagnosticScope(event.target.value as "BOOK" | "UNIT" | "CHAPTERS"); setChapterIds([]); setUnitId(""); }} className="control"><option value="BOOK">Whole Book</option><option value="UNIT">Unit</option><option value="CHAPTERS">Selected Chapter(s)</option></select></Field> : null}
        </div>
        {usesChapterMembership() ? <ChapterOrder chapters={chapters} ids={chapterIds} candidate={chapterCandidate} setCandidate={setChapterCandidate} add={orderedAdd} move={moveChapter} remove={(id) => setChapterIds((current) => current.filter((entry) => entry !== id))} disabled={!editable} label={kind === "TERM_TEST" ? "Select Chapters Covered by This Term" : kind === "MULTI_TERM_TEST" ? "Select Chapters Covered" : "Select Chapters"} minimum={chapterCountMinimum()} /> : kind === "BOOK_TEST" || kind === "FINAL_EXAM" || (kind === "EXAM" && examScope === "BOOK") || (kind === "DIAGNOSTIC" && diagnosticScope === "BOOK") ? <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-600">Scope: Whole Book</p> : null}
        <Field label="General Instructions">
          <p className="mb-2 text-xs font-normal normal-case tracking-normal text-slate-500">Optional. These appear before the assessment; section instructions can be added with their question type below.</p>
          <textarea disabled={!editable} value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={6} className="min-h-36 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100" placeholder="For example: Answer all questions. Read each question carefully before responding." />
        </Field>
        <div className="mt-3 max-w-xs"><Field label="Duration minutes (optional)"><input disabled={!editable} value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value.replace(/\D/g, ""))} inputMode="numeric" className="control" placeholder="For example: 45" /></Field></div>
      </section>

      {!assessment ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">2. Questions</p>
          <h2 className="mt-1 font-bold text-slate-900">Save setup to continue</h2>
          <p className="mt-1 text-sm text-slate-600">Save the assessment setup to start adding questions.</p>
          <button type="button" onClick={save} disabled={pending} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />Save & Continue</button>
        </section>
      ) : (
        <section className="space-y-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">2. Questions</p><h2 className="mt-1 font-bold text-slate-900">Question Builder</h2><p className="mt-1 text-sm text-slate-500">Add approved Book Questions, then arrange the paper in the selected-question panel.</p></div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,1fr)]">
            <QuestionPicker open={pickerOpen} setOpen={setPickerOpen} candidates={visibleCandidates} selected={selectedCandidateIds} setSelected={setSelectedCandidateIds} add={addSelected} search={search} setSearch={setSearch} chapterId={pickerChapterId} setChapterId={setPickerChapterId} moduleId={pickerModuleId} setModuleId={setPickerModuleId} type={pickerType} setType={setPickerType} difficulty={pickerDifficulty} setDifficulty={setPickerDifficulty} tag={pickerTag} setTag={setPickerTag} chapters={chapters} modules={pickerModules} disabled={!editable || pending} />
            <section className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
              <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">Selected Questions</h2><p className="mt-1 text-xs text-slate-500">{selectedItems.length} questions · {totalMarks} total marks</p></div>{assessment.status === "ARCHIVED" ? <button type="button" onClick={() => mutate(() => restoreAction(assessment.id), "Assessment restored.")} disabled={pending} className="rounded-md border px-3 py-2 text-sm font-bold">Restore</button> : <button type="button" onClick={() => mutate(() => archiveAction(assessment.id), "Assessment archived.")} disabled={pending} className="rounded-md border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700">Archive</button>}</div>
              {selectedQuestionGroups.length ? <div className="mt-4 space-y-4">{selectedQuestionGroups.map((group) => <section key={group.questionType} className="rounded-lg border border-slate-200"><div className="border-b border-slate-100 bg-slate-50 px-3 py-2"><h3 className="text-sm font-bold text-slate-900">{questionTypeLabel(group.questionType)}</h3><p className="text-xs text-slate-500">{group.items.length} questions · {group.items.reduce((sum, item) => sum + item.marks, 0)} marks</p></div><label className="block px-3 pt-3"><span className="text-xs font-bold text-slate-700">Instruction for this section (optional)</span><textarea disabled={!editable} value={sectionInstructions[group.questionType] ?? ""} onChange={(event) => setSectionInstructions((current) => ({ ...current, [group.questionType]: event.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100" placeholder={sectionInstructionPlaceholder(group.questionType)} /></label><ol className="space-y-2 p-3">{group.items.map((item) => <li key={item.itemId} className="rounded-lg border border-slate-200 p-3"><div className="flex gap-3"><span className="pt-0.5 text-xs font-bold text-slate-400">{item.displayNumber}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{item.questionText}</p><p className="mt-1 text-xs text-slate-500">{questionTypeLabel(item.questionType)} · {item.marks} marks · Chapter {item.chapter.chapterNumber}: {item.chapter.title}{item.module ? ` · ${item.module.title}` : ""}</p></div>{editable ? <div className="flex shrink-0 gap-1"><button type="button" aria-label={`Move question ${item.displayNumber} up`} disabled={item.persistedIndex === 0 || pending} onClick={() => mutate(() => moveItemAction(assessment.id, item.itemId, -1))} className="rounded border px-2 text-xs disabled:opacity-40">↑</button><button type="button" aria-label={`Move question ${item.displayNumber} down`} disabled={item.persistedIndex === selectedItems.length - 1 || pending} onClick={() => mutate(() => moveItemAction(assessment.id, item.itemId, 1))} className="rounded border px-2 text-xs disabled:opacity-40">↓</button><button type="button" disabled={pending} onClick={() => mutate(() => removeItemAction(assessment.id, item.itemId))} className="rounded border border-rose-200 px-2 text-xs text-rose-700 disabled:opacity-40">Remove</button></div> : null}</div></li>)}</ol></section>)}</div> : <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No questions have been added yet. Open Available Questions, filter approved Book Questions, select one or more, and choose Add Selected.</div>}
            </section>
          </div>
        </section>
      )}
      {preview && assessment ? (
        <PublisherAssessmentPreview
          heading={kinds.find(([value]) => value === kind)?.[1] ?? "Assessment"}
          scope={getPublisherAssessmentScopeSummary({ chapter: assessment.chapterId ? chapters.find((chapter) => chapter.id === assessment.chapterId) : null, unit: assessment.unitId ? units.find((unit) => unit.id === assessment.unitId) : null, chapters: assessment.chapterIds.map((id) => chapters.find((chapter) => chapter.id === id)).filter((chapter): chapter is Chapter => Boolean(chapter)) })}
          durationMinutes={assessment.durationMinutes}
          instructions={assessment.instructions}
          sectionInstructions={Object.fromEntries(assessment.sectionInstructions.map((entry) => [entry.questionType, entry.instruction]))}
          mode={deliveryMode}
          items={selectedItems}
          totalMarks={totalMarks}
          close={() => setPreview(false)}
        />
      ) : null}
    </main>
  );
}

function groupItemsByType(items: Item[]) {
  const groups: Array<{ questionType: string; items: Item[] }> = [];
  for (const item of items) {
    const group = groups.find((entry) => entry.questionType === item.questionType);
    if (group) group.items.push(item);
    else groups.push({ questionType: item.questionType, items: [item] });
  }
  return groups;
}

function questionTypeLabel(questionType: string) {
  return questionType.replaceAll("_", " / ");
}

function sectionInstructionPlaceholder(questionType: string) {
  return ({ MCQ: "Tick the correct option.", TRUE_FALSE: "Write True or False.", FILL_BLANK: "Fill in the blanks with the correct answer.", MULTIPLE_SELECT: "Select all correct options.", SHORT_ANSWER: "Answer in one or two sentences.", LONG_ANSWER: "Answer the following questions in detail.", MATCH: "Match the following.", ORDERING: "Arrange the following in the correct order." } as Record<string, string>)[questionType] ?? "Add instructions for this question type.";
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
function ChapterOrder({
  chapters,
  ids,
  candidate,
  setCandidate,
  add,
  move,
  remove,
  disabled,
  label,
  minimum,
}: {
  chapters: Chapter[];
  ids: string[];
  candidate: string;
  setCandidate: (value: string) => void;
  add: () => void;
  move: (index: number, direction: -1 | 1) => void;
  remove: (id: string) => void;
  disabled: boolean;
  label: string;
  minimum: number;
}) {
  const selected = ids
    .map((id) => chapters.find((chapter) => chapter.id === id))
    .filter((chapter): chapter is Chapter => Boolean(chapter));
  return (
    <div className="mt-4">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label} (minimum {minimum})
      </span>
      {!disabled ? (
        <div className="flex gap-2">
          <select
            value={candidate}
            onChange={(event) => setCandidate(event.target.value)}
            className="control flex-1"
          >
            <option value="">Choose chapter</option>
            {chapters
              .filter((chapter) => !ids.includes(chapter.id))
              .map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  Chapter {chapter.chapterNumber}: {chapter.title}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={!candidate}
            className="rounded-md border px-3 text-sm font-bold text-indigo-700 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <ol className="mt-2 space-y-1">
        {selected.map((chapter, index) => (
          <li
            key={chapter.id}
            className="flex items-center gap-2 rounded-md bg-slate-50 p-2 text-sm"
          >
            <span className="w-5 font-bold text-slate-400">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate">
              Chapter {chapter.chapterNumber}: {chapter.title}
            </span>
            {!disabled ? (
              <>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded border px-2 py-0.5 text-xs disabled:opacity-30"
                >
                  Up
                </button>
                <button
                  type="button"
                  disabled={index === selected.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded border px-2 py-0.5 text-xs disabled:opacity-30"
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => remove(chapter.id)}
                  className="rounded border border-rose-200 px-2 py-0.5 text-xs text-rose-700"
                >
                  <Minus className="h-3 w-3" />
                </button>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
function QuestionPicker({
  open,
  setOpen,
  candidates,
  selected,
  setSelected,
  add,
  search,
  setSearch,
  chapterId,
  setChapterId,
  moduleId,
  setModuleId,
  type,
  setType,
  difficulty,
  setDifficulty,
  tag,
  setTag,
  chapters,
  modules,
  disabled,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  candidates: SafeQuestion[];
  selected: string[];
  setSelected: (value: string[]) => void;
  add: () => void;
  search: string;
  setSearch: (value: string) => void;
  chapterId: string;
  setChapterId: (value: string) => void;
  moduleId: string;
  setModuleId: (value: string) => void;
  type: string;
  setType: (value: string) => void;
  difficulty: string;
  setDifficulty: (value: string) => void;
  tag: string;
  setTag: (value: string) => void;
  chapters: Chapter[];
  modules: Module[];
  disabled: boolean;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900">Available Questions</h2>
          <p className="text-xs text-slate-500">
            Approved, active publisher Book Questions only. Use filters to find eligible questions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={disabled}
          className="rounded-md border px-3 py-2 text-sm font-bold text-indigo-700"
        >
          {open ? "Close" : "Add Questions"}
        </button>
      </div>
      {open ? (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search question text"
              className="control"
            />
            <select
              value={chapterId}
              onChange={(event) => {
                setChapterId(event.target.value);
                setModuleId("");
              }}
              className="control"
            >
              <option value="">All chapters</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  Chapter {chapter.chapterNumber}: {chapter.title}
                </option>
              ))}
            </select>
            <select
              value={moduleId}
              onChange={(event) => setModuleId(event.target.value)}
              className="control"
            >
              <option value="">All modules</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="control"
            >
              <option value="">All types</option>
              {questionTypes.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="control"
            >
              <option value="">All difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Moderate</option>
              <option value="HARD">Difficult</option>
            </select>
            <input
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="Filter tag"
              className="control"
            />
          </div>
          <div className="mt-3 max-h-64 space-y-1 overflow-auto rounded-md border border-slate-200 p-2">
            {candidates.length ? (
              candidates.map((question) => (
                <label
                  key={question.id}
                  className="flex cursor-pointer gap-2 rounded p-2 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(question.id)}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? [...selected, question.id]
                          : selected.filter((id) => id !== question.id),
                      )
                    }
                  />
                  <span>
                    <span className="font-semibold">
                      {question.questionText}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {question.questionType} · {question.marks} marks · Chapter{" "}
                      {question.chapter.chapterNumber}: {question.chapter.title}
                      {question.module ? ` · ${question.module.title}` : ""}
                    </span>
                  </span>
                </label>
              ))
            ) : (
              <p className="p-3 text-sm text-slate-500">
                No eligible questions match these filters and scope.
              </p>
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={add}
              disabled={!selected.length || disabled}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Add Selected ({selected.length})
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
