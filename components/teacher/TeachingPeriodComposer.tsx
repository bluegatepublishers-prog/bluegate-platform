"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getTeachingPeriodComposerDataAction,
  getTeachingPlanAction,
  getTeachingPlanTimetableOccurrencesAction,
} from "@/app/teacher-dashboard/classes/[sectionId]/plan/teaching-actions";
import {
  TEACHING_PERIOD_ACTIVITY_TYPES,
  type TeachingPeriodActivityType,
} from "@/lib/teaching-period-plan-policy";

type ComposerData = Awaited<ReturnType<typeof getTeachingPeriodComposerDataAction>>;
type Period = Awaited<ReturnType<typeof getTeachingPlanAction>>["periods"][number];
type Occurrence = Awaited<ReturnType<typeof getTeachingPlanTimetableOccurrencesAction>>[number];
type Page = ComposerData["pageAvailability"]["pages"][number];

type ActivityDraft = {
  id: string;
  type: TeachingPeriodActivityType;
  title: string;
  description: string;
};

type AssessmentType = "CHAPTER" | "UNIT" | "TERM" | "CUSTOM" | "SCHOOL" | "TEACHER" | "BOARD";
const ASSESSMENT_TYPES: AssessmentType[] = ["CHAPTER", "UNIT", "TERM", "CUSTOM", "SCHOOL", "TEACHER", "BOARD"];

type AssessmentDraft = {
  id: string;
  title: string;
  type: AssessmentType;
  instructions: string;
  durationMinutes: string;
  maximumMarks: string;
  opensAt: string;
  dueAt: string;
  maxAttempts: string;
  resultRelease: "IMMEDIATE" | "AFTER_DUE_DATE" | "NEVER";
  bookId: string;
  chapterId: string;
  moduleId: string;
  exerciseId: string;
  status: string;
  questionCount: number;
  totalMarks: number;
  attemptCount: number;
};

function assessmentType(value: string): AssessmentType {
  return ASSESSMENT_TYPES.includes(value as AssessmentType) ? value as AssessmentType : "CUSTOM";
}

function resultRelease(value: string): AssessmentDraft["resultRelease"] {
  return value === "AFTER_DUE_DATE" || value === "NEVER" ? value : "IMMEDIATE";
}

type AssignmentType = "HOMEWORK" | "CLASSWORK" | "PROJECT" | "WORKSHEET" | "READING" | "PRACTICAL" | "OTHER";
const ASSIGNMENT_TYPES: AssignmentType[] = ["HOMEWORK", "CLASSWORK", "PROJECT", "WORKSHEET", "READING", "PRACTICAL", "OTHER"];

type AssignmentDraft = {
  id: string;
  title: string;
  instructions: string;
  assignmentType: AssignmentType;
  sectionSubjectId: string;
  bookId: string;
  chapterId: string;
  moduleId: string;
  exerciseId: string;
  totalMarks: string;
  allowTextSubmission: boolean;
  allowFileSubmission: boolean;
  allowMultipleFiles: boolean;
  maximumFiles: string;
  maximumFileSizeMb: string;
  acceptedFileTypes: string[];
  allowLateSubmission: boolean;
  allowResubmission: boolean;
  maximumAttempts: string;
  intent: "DRAFT" | "PUBLISHED" | "SCHEDULED";
  publishAt: string;
  dueAt: string;
  closeAt: string;
  status: string;
  submissionCount: number;
};

export type TeachingPeriodComposerSaveInput = {
  periodId?: string | null;
  sectionId: string;
  sectionSubjectId: string;
  timetableEntryId: string;
  date: string;
  bookId: string;
  chapterId: string | null;
  pages: Array<{ pageId: string; moduleId: string }>;
  objective: string;
  notes: string;
  activities: Array<{ type: TeachingPeriodActivityType; title: string; description: string; sequence: number }>;
  assignments: Array<Record<string, unknown>>;
  assessments: Array<Record<string, unknown>>;
};

type Props = {
  sectionSubjectId: string;
  occurrence: Occurrence;
  period: Period | null;
  book: { id: string; title: string };
  classLabel: string;
  subjectName: string;
  data: ComposerData | null;
  loading: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (input: TeachingPeriodComposerSaveInput) => void;
};

function pageKey(page: Pick<Page, "moduleId" | "pageId">) {
  return page.moduleId + ":" + page.pageId;
}

function refKey(ref: Period["pageRefs"][number]) {
  return ref.moduleId ? ref.moduleId + ":" + ref.pageId : "";
}

function pageLabel(page: Page) {
  return page.pdfPageNumber ? "p. " + page.pdfPageNumber + " · " + page.title : "Page " + page.displayPageNumber + " · " + page.title;
}

function formatDate(value: string) {
  return new Date(value + "T12:00:00.000Z").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

function clock(minutes: number) {
  return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
}

function initialActivities(period: Period | null): ActivityDraft[] {
  return period?.activities.map((activity) => ({
    id: activity.id,
    type: activity.type,
    title: activity.title,
    description: activity.description ?? "",
  })) ?? [];
}

function assignmentType(value: string): AssignmentType {
  return ASSIGNMENT_TYPES.includes(value as AssignmentType) ? value as AssignmentType : "OTHER";
}

function dateTimeInput(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}

function initialAssignments(period: Period | null, sectionSubjectId: string): AssignmentDraft[] {
  return period?.assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    instructions: assignment.instructions ?? "",
    assignmentType: assignmentType(assignment.assignmentType),
    sectionSubjectId: assignment.sectionSubjectId ?? sectionSubjectId,
    bookId: assignment.bookId ?? "",
    chapterId: assignment.chapterId ?? "",
    moduleId: "",
    exerciseId: "",
    totalMarks: assignment.totalMarks == null ? "" : String(assignment.totalMarks),
    allowTextSubmission: assignment.allowTextSubmission,
    allowFileSubmission: assignment.allowFileSubmission,
    allowMultipleFiles: assignment.allowMultipleFiles,
    maximumFiles: String(assignment.maximumFiles),
    maximumFileSizeMb: String(Math.max(1, Math.round(assignment.maximumFileSizeBytes / 1024 / 1024))),
    acceptedFileTypes: assignment.acceptedFileTypes,
    allowLateSubmission: assignment.allowLateSubmission,
    allowResubmission: assignment.allowResubmission,
    maximumAttempts: String(assignment.maximumAttempts),
    intent: assignment.status === "SCHEDULED" ? "SCHEDULED" : assignment.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    publishAt: dateTimeInput(assignment.publishAt),
    dueAt: dateTimeInput(assignment.dueAt),
    closeAt: dateTimeInput(assignment.closeAt),
    status: assignment.status,
    submissionCount: assignment.submissionCount,
  })) ?? [];
}

function initialAssessments(period: Period | null, defaultBookId: string): AssessmentDraft[] {
  return period?.assessments.map((assessment) => ({
    id: assessment.id,
    title: assessment.title,
    type: assessmentType(assessment.type),
    instructions: assessment.instructions ?? "",
    durationMinutes: assessment.durationMinutes == null ? "" : String(assessment.durationMinutes),
    maximumMarks: assessment.totalMarks ? String(assessment.totalMarks) : "",
    opensAt: dateTimeInput(assessment.opensAt),
    dueAt: dateTimeInput(assessment.dueAt),
    maxAttempts: String(assessment.maxAttempts),
    resultRelease: resultRelease(assessment.resultRelease),
    bookId: assessment.bookId || defaultBookId,
    chapterId: assessment.chapterId ?? "",
    moduleId: "",
    exerciseId: "",
    status: assessment.status,
    questionCount: assessment.questionCount,
    totalMarks: assessment.totalMarks,
    attemptCount: assessment.attemptCount,
  })) ?? [];
}

function defaultAssessment(bookId: string, chapterId: string): AssessmentDraft {
  return {
    id: "new-" + String(Date.now()),
    title: "",
    type: "CHAPTER",
    instructions: "",
    durationMinutes: "10",
    maximumMarks: "",
    opensAt: "",
    dueAt: "",
    maxAttempts: "1",
    resultRelease: "IMMEDIATE",
    bookId,
    chapterId,
    moduleId: "",
    exerciseId: "",
    status: "DRAFT",
    questionCount: 0,
    totalMarks: 0,
    attemptCount: 0,
  };
}

function assessmentTypeLabel(value: AssessmentType) {
  if (value === "CHAPTER") return "Chapter Test";
  if (value === "UNIT") return "Unit Test";
  if (value === "TERM") return "Term Test";
  if (value === "CUSTOM") return "Practice / Custom";
  if (value === "SCHOOL") return "School Assessment";
  if (value === "TEACHER") return "Teacher Assessment";
  return "Board Assessment";
}

function defaultAssignment(bookId: string, chapterId: string, sectionSubjectId: string, moduleId: string, exerciseId: string): AssignmentDraft {
  return {
    id: "new-" + String(Date.now()),
    title: "",
    instructions: "",
    assignmentType: "HOMEWORK",
    sectionSubjectId,
    bookId,
    chapterId,
    moduleId,
    exerciseId,
    totalMarks: "",
    allowTextSubmission: true,
    allowFileSubmission: false,
    allowMultipleFiles: false,
    maximumFiles: "1",
    maximumFileSizeMb: "10",
    acceptedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowLateSubmission: false,
    allowResubmission: false,
    maximumAttempts: "1",
    intent: "DRAFT",
    publishAt: "",
    dueAt: "",
    closeAt: "",
    status: "DRAFT",
    submissionCount: 0,
  };
}

export default function TeachingPeriodComposer({
  sectionSubjectId,
  occurrence,
  period,
  book,
  classLabel,
  subjectName,
  data,
  loading,
  saving,
  onClose,
  onSave,
}: Props) {
  const [chapterId, setChapterId] = useState(period?.chapterId ?? "");
  const [nodeValue, setNodeValue] = useState(() => {
    const moduleId = period?.pageRefs.find((ref) => ref.moduleId)?.moduleId;
    return moduleId ? "MODULE:" + moduleId : "";
  });
  const [selectedPageKeys, setSelectedPageKeys] = useState<string[]>(
    period?.pageRefs.map(refKey).filter(Boolean) ?? [],
  );
  const [objective, setObjective] = useState(period?.objective ?? "");
  const [notes, setNotes] = useState(period?.notes ?? "");
  const [activities, setActivities] = useState<ActivityDraft[]>(() => initialActivities(period));
  const [assignments, setAssignments] = useState<AssignmentDraft[]>(() => initialAssignments(period, sectionSubjectId));
  const [assessments, setAssessments] = useState<AssessmentDraft[]>(() => initialAssessments(period, book.id));
  const [expandedAssessmentId, setExpandedAssessmentId] = useState<string | null>(null);
  const [assignmentBookData, setAssignmentBookData] = useState<Record<string, ComposerData>>({});
  const [assignmentLoading, setAssignmentLoading] = useState<string | null>(null);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setAssignmentBookData((current) => ({ ...current, [data.book.id]: data }));
  }, [data]);

  const selectedChapter = data?.chapters.find((chapter) => chapter.id === chapterId) ?? null;
  const assignmentBooks = occurrence.eligibleBooks.length ? occurrence.eligibleBooks : [book];

  function assignmentDataFor(bookId: string) {
    return assignmentBookData[bookId] ?? (bookId === data?.book.id ? data : null);
  }

  function assignmentHierarchy(assignment: AssignmentDraft) {
    const currentData = assignmentDataFor(assignment.bookId);
    return {
      data: currentData,
      modules: currentData?.modules.filter((module) => module.chapterId === assignment.chapterId) ?? [],
      exercises: currentData?.exercises.filter((exercise) => exercise.chapterId === assignment.chapterId) ?? [],
    };
  }
  const nodeType = nodeValue.startsWith("EXERCISE:") ? "EXERCISE" : nodeValue.startsWith("MODULE:") ? "MODULE" : null;
  const nodeId = nodeValue.includes(":") ? nodeValue.slice(nodeValue.indexOf(":") + 1) : "";
  const selectedModule = data?.modules.find((module) => module.id === nodeId) ?? null;
  const selectedExercise = data?.exercises.find((exercise) => exercise.id === nodeId) ?? null;

  const nodeOptions = useMemo(() => {
    if (!selectedChapter || !data) return [];
    const modules = data.modules
      .filter((module) => module.chapterId === selectedChapter.id)
      .map((module) => ({ value: "MODULE:" + module.id, label: "Module · " + module.title }));
    const exercises = data.exercises
      .filter((exercise) => exercise.chapterId === selectedChapter.id)
      .map((exercise) => ({
        value: "EXERCISE:" + exercise.id,
        label: (exercise.moduleId ? "Exercise · " : "Exercise · ") + exercise.title,
      }));
    return [...modules, ...exercises];
  }, [data, selectedChapter]);

  const teachPages = useMemo(() => {
    const pages = data?.pageAvailability.pages.filter((page) => {
      if (!chapterId || page.chapterId !== chapterId) return false;
      if (nodeType === "MODULE") return page.moduleId === nodeId;
      if (nodeType === "EXERCISE" && selectedExercise?.moduleId) return page.moduleId === selectedExercise.moduleId;
      if (nodeType === "EXERCISE" && selectedExercise?.startPage != null && selectedExercise.endPage != null) {
        return page.pdfPageNumber != null && page.pdfPageNumber >= selectedExercise.startPage && page.pdfPageNumber <= selectedExercise.endPage;
      }
      return true;
    }) ?? [];
    return pages.slice().sort((left, right) =>
      (left.pdfPageNumber ?? Number.MAX_SAFE_INTEGER) - (right.pdfPageNumber ?? Number.MAX_SAFE_INTEGER)
      || left.moduleId.localeCompare(right.moduleId)
      || left.currentPageOrder - right.currentPageOrder
      || left.pageId.localeCompare(right.pageId));
  }, [chapterId, data, nodeId, nodeType, selectedExercise]);

  const selectedPages = useMemo(() => {
    const allPages = data?.pageAvailability.pages ?? [];
    return allPages
      .filter((page) => selectedPageKeys.includes(pageKey(page)))
      .sort((left, right) =>
        (left.pdfPageNumber ?? Number.MAX_SAFE_INTEGER) - (right.pdfPageNumber ?? Number.MAX_SAFE_INTEGER)
        || left.moduleId.localeCompare(right.moduleId)
        || left.currentPageOrder - right.currentPageOrder
        || left.pageId.localeCompare(right.pageId));
  }, [data, selectedPageKeys]);

  const mappedNode = selectedExercise ?? selectedModule ?? selectedChapter;
  const mappedRangeAvailable = mappedNode?.startPage != null && mappedNode.endPage != null;
  const mappedPages = mappedRangeAvailable
    ? teachPages.filter((page) => page.pdfPageNumber != null && page.pdfPageNumber >= mappedNode.startPage! && page.pdfPageNumber <= mappedNode.endPage!)
    : [];
  const visibleSelectedPages = teachPages.filter((page) => selectedPageKeys.includes(pageKey(page)));
  const startPageKey = visibleSelectedPages[0] ? pageKey(visibleSelectedPages[0]) : "";
  const endPageKey = visibleSelectedPages[visibleSelectedPages.length - 1] ? pageKey(visibleSelectedPages[visibleSelectedPages.length - 1]) : "";

  function setChapter(value: string) {
    setChapterId(value);
    setNodeValue("");
    setSelectedPageKeys([]);
  }

  function setNode(value: string) {
    setNodeValue(value);
    setSelectedPageKeys([]);
  }

  function togglePage(page: Page) {
    const key = pageKey(page);
    setSelectedPageKeys((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]);
  }

  function applyRange(start: string, end: string) {
    const startIndex = teachPages.findIndex((page) => pageKey(page) === start);
    const endIndex = teachPages.findIndex((page) => pageKey(page) === end);
    if (startIndex < 0 || endIndex < startIndex) return;
    setSelectedPageKeys(teachPages.slice(startIndex, endIndex + 1).map(pageKey));
  }

  function useMappedPages() {
    if (mappedPages.length) setSelectedPageKeys(mappedPages.map(pageKey));
  }

  function addActivity() {
    setActivities((current) => [...current, {
      id: "new-" + String(Date.now()) + "-" + String(current.length),
      type: "DISCUSSION",
      title: "",
      description: "",
    }]);
  }

  function updateActivity(id: string, patch: Partial<ActivityDraft>) {
    setActivities((current) => current.map((activity) => activity.id === id ? { ...activity, ...patch } : activity));
  }

  function removeActivity(id: string) {
    setActivities((current) => current.filter((activity) => activity.id !== id));
  }

  function loadAssignmentBook(bookId: string) {
    if (!bookId || assignmentDataFor(bookId)) return;
    setAssignmentLoading(bookId);
    void getTeachingPeriodComposerDataAction({ sectionSubjectId, bookId })
      .then((nextData) => setAssignmentBookData((current) => ({ ...current, [bookId]: nextData })))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "The assignment book could not be loaded."))
      .finally(() => setAssignmentLoading(null));
  }

  function assessmentHierarchy(assessment: AssessmentDraft) {
    const currentData = assignmentDataFor(assessment.bookId);
    return {
      data: currentData,
      modules: currentData?.modules.filter((module) => module.chapterId === assessment.chapterId) ?? [],
      exercises: currentData?.exercises.filter((exercise) => exercise.chapterId === assessment.chapterId && (!assessment.moduleId || exercise.moduleId === assessment.moduleId)) ?? [],
    };
  }

  function addAssessment() {
    const draft = defaultAssessment(book.id, chapterId);
    setAssessments((current) => [...current, draft]);
    setExpandedAssessmentId(draft.id);
  }

  function updateAssessment(id: string, patch: Partial<AssessmentDraft>) {
    setAssessments((current) => current.map((assessment) => assessment.id === id ? { ...assessment, ...patch } : assessment));
  }

  function removeAssessment(id: string) {
    setAssessments((current) => current.filter((assessment) => assessment.id !== id));
    if (expandedAssessmentId === id) setExpandedAssessmentId(null);
  }

  function changeAssessmentBook(id: string, bookId: string) {
    updateAssessment(id, { bookId, chapterId: "", moduleId: "", exerciseId: "" });
    loadAssignmentBook(bookId);
  }

  function addAssignment() {
    const draft = defaultAssignment(
      book.id,
      chapterId,
      sectionSubjectId,
      nodeType === "MODULE" ? nodeId : "",
      nodeType === "EXERCISE" ? nodeId : "",
    );
    setAssignments((current) => [...current, draft]);
    setExpandedAssignmentId(draft.id);
  }

  function updateAssignment(id: string, patch: Partial<AssignmentDraft>) {
    setAssignments((current) => current.map((assignment) => assignment.id === id ? { ...assignment, ...patch } : assignment));
  }

  function removeAssignment(id: string) {
    setAssignments((current) => current.filter((assignment) => assignment.id !== id));
    if (expandedAssignmentId === id) setExpandedAssignmentId(null);
  }

  function changeAssignmentBook(id: string, bookId: string) {
    updateAssignment(id, { bookId, chapterId: "", moduleId: "", exerciseId: "" });
    loadAssignmentBook(bookId);
  }

  function save() {
    setError(null);
    if (selectedPageKeys.length && !chapterId) {
      setError("Choose a chapter before selecting Teach pages.");
      return;
    }
    if (activities.some((activity) => !activity.title.trim())) {
      setError("Add a title to each activity or remove the empty row.");
      return;
    }
    if (assessments.some((assessment) => !assessment.title.trim())) {
      setError("Add a title to each assessment or remove the empty row.");
      return;
    }
    if (assessments.some((assessment) => assessment.type === "CHAPTER" && !assessment.chapterId)) {
      setError("Chapter Test requires a chapter.");
      return;
    }
    if (assignments.some((assignment) => !assignment.title.trim())) {
      setError("Add a title to each assignment or remove the empty row.");
      return;
    }
    if (assignments.some((assignment) => assignment.chapterId && !assignment.bookId)) {
      setError("Choose an assignment book before choosing its chapter.");
      return;
    }
    const meaningful = Boolean(chapterId || selectedPages.length || objective.trim() || notes.trim() || activities.length || assignments.length || assessments.length);
    if (!period && !meaningful) {
      setError("Add something to the period before saving the plan.");
      return;
    }
    onSave({
      periodId: period?.id ?? null,
      sectionId: occurrence.entry.sectionId,
      sectionSubjectId,
      timetableEntryId: occurrence.entry.id,
      date: occurrence.date,
      bookId: book.id,
      chapterId: chapterId || null,
      pages: selectedPages.map((page) => ({ pageId: page.pageId, moduleId: page.moduleId })),
      objective: objective.trim(),
      notes: notes.trim(),
      activities: activities.map((activity, index) => ({
        type: activity.type,
        title: activity.title.trim(),
        description: activity.description.trim(),
        sequence: index + 1,
      })),
      assessments: assessments.map((assessment) => ({
        id: assessment.id.startsWith("new-") ? null : assessment.id,
        title: assessment.title.trim(),
        type: assessment.type,
        instructions: assessment.instructions.trim(),
        durationMinutes: assessment.durationMinutes,
        maximumMarks: assessment.maximumMarks,
        opensAt: assessment.opensAt,
        dueAt: assessment.dueAt,
        maxAttempts: assessment.maxAttempts,
        resultRelease: assessment.resultRelease,
        bookId: assessment.bookId,
        chapterId: assessment.chapterId,
        moduleId: assessment.moduleId,
        exerciseId: assessment.exerciseId,
      })),
      assignments: assignments.map((assignment) => ({
        id: assignment.id.startsWith("new-") ? null : assignment.id,
        title: assignment.title.trim(),
        instructions: assignment.instructions.trim(),
        assignmentType: assignment.assignmentType,
        intent: assignment.intent,
        sectionSubjectId: assignment.sectionSubjectId,
        bookId: assignment.bookId,
        chapterId: assignment.chapterId,
        totalMarks: assignment.totalMarks,
        allowTextSubmission: assignment.allowTextSubmission,
        allowFileSubmission: assignment.allowFileSubmission,
        allowMultipleFiles: assignment.allowMultipleFiles,
        maximumFiles: assignment.maximumFiles,
        maximumFileSizeMb: assignment.maximumFileSizeMb,
        acceptedFileTypes: assignment.acceptedFileTypes,
        allowLateSubmission: assignment.allowLateSubmission,
        allowResubmission: assignment.allowResubmission,
        maximumAttempts: assignment.maximumAttempts,
        publishAt: assignment.publishAt,
        dueAt: assignment.dueAt,
        closeAt: assignment.closeAt,
      })),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-2 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Plan period">
      <section className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-sky-50 px-4 py-3">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-teal-700">Plan period</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">{classLabel} · {subjectName}</h2>
            <p className="mt-0.5 text-xs text-slate-600">{formatDate(occurrence.date)} · {clock(occurrence.entry.periodSlot.startMinute)}–{clock(occurrence.entry.periodSlot.endMinute)} · {occurrence.entry.periodSlot.label}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close composer" className="rounded-lg px-2 py-1 text-lg font-bold text-slate-400 hover:bg-white hover:text-slate-700">×</button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{error}</p> : null}
          {loading || !data ? <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">Loading published Smart Book structure…</p> : (
            <>
              <section className="rounded-xl border border-teal-100 bg-teal-50/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div><h3 className="text-sm font-bold text-slate-900">Teach</h3><p className="text-[0.68rem] text-slate-500">Use the assigned published Smart Book.</p></div>
                  <span className="rounded-full bg-white px-2 py-1 text-[0.65rem] font-bold text-teal-800">{book.title}</span>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-[0.68rem] font-bold text-slate-600">Chapter <span className="text-rose-600">*</span><select value={chapterId} onChange={(event) => setChapter(event.target.value)} className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800"><option value="">Choose chapter</option>{data.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>Chapter {chapter.chapterNumber}: {chapter.title}</option>)}</select></label>
                  <label className="text-[0.68rem] font-bold text-slate-600">Module / Exercise <span className="font-normal text-slate-400">(optional)</span><select value={nodeValue} onChange={(event) => setNode(event.target.value)} disabled={!chapterId} className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800"><option value="">All chapter content</option>{nodeOptions.map((node) => <option key={node.value} value={node.value}>{node.label}</option>)}</select></label>
                </div>
                {nodeType === "EXERCISE" && !selectedExercise?.moduleId ? <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[0.67rem] text-amber-800">This exercise has no module page field. The saved Teach context remains chapter plus canonical module/page references.</p> : null}
                <div className="mt-2 rounded-lg border border-white/80 bg-white/80 p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[0.68rem] font-bold text-slate-700">Pages</p><p className="text-[0.65rem] text-slate-500">{selectedPages.length ? selectedPages.length + " selected" : "Select existing V2 page references."}</p></div>{mappedRangeAvailable ? <button type="button" onClick={useMappedPages} disabled={!mappedPages.length || saving} className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-[0.65rem] font-bold text-teal-800 disabled:opacity-40">Use mapped pages{mappedNode?.startPage != null ? " · " + mappedNode.startPage + "–" + mappedNode.endPage : ""}</button> : null}</div>
                  {teachPages.length ? <><div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="text-[0.65rem] font-bold text-slate-600">Start page<select value={startPageKey} onChange={(event) => applyRange(event.target.value, endPageKey || event.target.value)} className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-1 text-[0.65rem]"><option value="">Choose</option>{teachPages.map((page) => <option key={pageKey(page)} value={pageKey(page)}>{pageLabel(page)}</option>)}</select></label><label className="text-[0.65rem] font-bold text-slate-600">End page<select value={endPageKey} onChange={(event) => applyRange(startPageKey || event.target.value, event.target.value)} className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-1 text-[0.65rem]"><option value="">Choose</option>{teachPages.map((page) => <option key={pageKey(page)} value={pageKey(page)}>{pageLabel(page)}</option>)}</select></label></div><div className="mt-2 grid max-h-28 gap-1 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-1.5 sm:grid-cols-2">{teachPages.map((page) => <label key={pageKey(page)} className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[0.65rem] text-slate-700 hover:bg-white"><input type="checkbox" checked={selectedPageKeys.includes(pageKey(page))} onChange={() => togglePage(page)} />{pageLabel(page)}</label>)}</div></> : <p className="mt-2 rounded-md bg-slate-50 px-2 py-2 text-[0.68rem] text-slate-500">{chapterId ? "No published V2 pages are available for this selection." : "Choose a chapter to see published pages."}</p>}
                </div>
              </section>

              <section className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                <div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-900">Activity / Classwork</h3><p className="text-[0.68rem] text-slate-500">Add a lightweight class activity.</p></div><button type="button" onClick={addActivity} disabled={saving} className="rounded-md border border-amber-200 bg-white px-2 py-1 text-[0.65rem] font-bold text-amber-800">+ Add activity</button></div>
                {activities.length ? <div className="mt-2 space-y-2">{activities.map((activity, index) => <div key={activity.id} className="rounded-lg border border-amber-100 bg-white p-2"><div className="flex items-start gap-2"><span className="pt-1 text-[0.65rem] font-bold text-amber-700">{index + 1}.</span><div className="min-w-0 flex-1 space-y-1.5"><div className="grid gap-1.5 sm:grid-cols-[9rem_1fr]"><select value={activity.type} onChange={(event) => updateActivity(activity.id, { type: event.target.value as TeachingPeriodActivityType })} className="h-7 rounded border border-slate-300 bg-white px-1 text-[0.65rem] font-semibold">{TEACHING_PERIOD_ACTIVITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select><input value={activity.title} onChange={(event) => updateActivity(activity.id, { title: event.target.value })} placeholder="Activity title" maxLength={180} className="h-7 rounded border border-slate-300 px-2 text-[0.68rem]" /></div><input value={activity.description} onChange={(event) => updateActivity(activity.id, { description: event.target.value })} placeholder="Short description (optional)" maxLength={4000} className="h-7 w-full rounded border border-slate-300 px-2 text-[0.68rem]" /></div><button type="button" onClick={() => removeActivity(activity.id)} disabled={saving} aria-label="Remove activity" className="rounded px-1.5 py-1 text-sm font-bold text-rose-600 hover:bg-rose-50">×</button></div></div>)}</div> : <p className="mt-2 rounded-md border border-dashed border-amber-200 px-2 py-2 text-[0.68rem] text-amber-800">No activities added.</p>}
              </section>

              <section className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
                <div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Assignment</h3><p className="text-[0.68rem] text-slate-500">Basic student work using the existing assignment engine.</p></div><button type="button" onClick={addAssignment} disabled={saving} className="rounded-md border border-violet-200 bg-white px-2 py-1 text-[0.65rem] font-bold text-violet-800">+ Add assignment</button></div>
                {assignments.length ? <div className="mt-2 space-y-2">{assignments.map((assignment) => {
                  const hierarchy = assignmentHierarchy(assignment);
                  const editable = assignment.id.startsWith("new-") || ["DRAFT", "SCHEDULED"].includes(assignment.status);
                  const expanded = expandedAssignmentId === assignment.id;
                  return <article key={assignment.id} className="rounded-lg border border-violet-100 bg-white p-2">
                    <div className="flex items-start justify-between gap-2"><button type="button" onClick={() => setExpandedAssignmentId(expanded ? null : assignment.id)} className="min-w-0 flex-1 text-left"><p className="text-[0.65rem] font-bold uppercase text-violet-700">{assignment.assignmentType} - {assignment.status}</p><p className="truncate text-xs font-bold text-slate-900">{assignment.title || "Untitled assignment"}</p><p className="truncate text-[0.65rem] text-slate-500">{assignment.chapterId ? "Chapter selected" : "No chapter"}{assignment.dueAt ? " - Due " + assignment.dueAt.replace("T", " ") : ""}{assignment.submissionCount ? " - " + assignment.submissionCount + " submission(s)" : ""}</p></button><div className="flex items-center gap-1"><button type="button" onClick={() => setExpandedAssignmentId(expanded ? null : assignment.id)} disabled={saving} className="rounded border border-violet-200 px-2 py-1 text-[0.62rem] font-bold text-violet-800">{expanded ? "Close" : "Edit"}</button><button type="button" onClick={() => removeAssignment(assignment.id)} disabled={saving} className="rounded px-1.5 py-1 text-[0.62rem] font-bold text-rose-600">Remove</button></div></div>
                    {expanded ? <div className="mt-2 grid gap-2 border-t border-violet-100 pt-2 sm:grid-cols-2">
                      {!editable ? <p className="sm:col-span-2 rounded-md bg-amber-50 px-2 py-1.5 text-[0.65rem] text-amber-800">This assignment is delivered or otherwise locked. Its student work is preserved; removal only detaches it from this period.</p> : null}
                      <label className="sm:col-span-2 text-[0.65rem] font-bold text-slate-600">Title<input value={assignment.title} onChange={(event) => updateAssignment(assignment.id, { title: event.target.value })} disabled={!editable} maxLength={160} className="mt-1 h-7 w-full rounded border border-slate-300 px-2 text-[0.68rem]" /></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Type<select value={assignment.assignmentType} onChange={(event) => updateAssignment(assignment.id, { assignmentType: assignmentType(event.target.value) })} disabled={!editable} className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[0.68rem]">{ASSIGNMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Save as<select value={assignment.intent} onChange={(event) => updateAssignment(assignment.id, { intent: event.target.value as AssignmentDraft["intent"] })} disabled={!editable} className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[0.68rem]"><option value="DRAFT">Draft</option><option value="PUBLISHED">Publish now</option><option value="SCHEDULED">Scheduled</option></select></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Book<select value={assignment.bookId} onChange={(event) => changeAssignmentBook(assignment.id, event.target.value)} disabled={!editable} className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[0.68rem]"><option value="">No book</option>{assignmentBooks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Chapter<select value={assignment.chapterId} onChange={(event) => updateAssignment(assignment.id, { chapterId: event.target.value, moduleId: "", exerciseId: "" })} disabled={!editable || !assignment.bookId || !hierarchy.data} className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[0.68rem]"><option value="">No chapter</option>{hierarchy.data?.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>Chapter {chapter.chapterNumber}: {chapter.title}</option>)}</select></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Module filter<select value={assignment.moduleId} onChange={(event) => updateAssignment(assignment.id, { moduleId: event.target.value, exerciseId: "" })} disabled={!assignment.chapterId || !hierarchy.modules.length} className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[0.68rem]"><option value="">All modules</option>{hierarchy.modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Exercise filter<select value={assignment.exerciseId} onChange={(event) => updateAssignment(assignment.id, { exerciseId: event.target.value })} disabled={!assignment.chapterId || !hierarchy.exercises.length} className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[0.68rem]"><option value="">All exercises</option>{hierarchy.exercises.filter((exercise) => !assignment.moduleId || exercise.moduleId === assignment.moduleId).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.title}</option>)}</select></label>
                      <p className="sm:col-span-2 rounded-md bg-slate-50 px-2 py-1.5 text-[0.62rem] text-slate-600">Module and Exercise are real published filters. ClassroomAssignment persists Book and Chapter only; no moduleId is invented.</p>
                      {assignmentLoading === assignment.bookId ? <p className="sm:col-span-2 text-[0.65rem] text-violet-700">Loading published assignment hierarchy...</p> : null}
                      <label className="sm:col-span-2 text-[0.65rem] font-bold text-slate-600">Instructions<textarea value={assignment.instructions} onChange={(event) => updateAssignment(assignment.id, { instructions: event.target.value })} disabled={!editable} maxLength={10000} rows={2} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-[0.68rem]" /></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Total marks<input value={assignment.totalMarks} onChange={(event) => updateAssignment(assignment.id, { totalMarks: event.target.value })} disabled={!editable} type="number" min={1} max={10000} className="mt-1 h-7 w-full rounded border border-slate-300 px-2 text-[0.68rem]" /></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Due date/time<input value={assignment.dueAt} onChange={(event) => updateAssignment(assignment.id, { dueAt: event.target.value })} disabled={!editable} type="datetime-local" className="mt-1 h-7 w-full rounded border border-slate-300 px-2 text-[0.68rem]" /></label>
<label className="text-[0.65rem] font-bold text-slate-600">Publish at<input value={assignment.publishAt} onChange={(event) => updateAssignment(assignment.id, { publishAt: event.target.value })} disabled={!editable} type="datetime-local" className="mt-1 h-7 w-full rounded border border-slate-300 px-2 text-[0.68rem]" /></label>
<label className="text-[0.65rem] font-bold text-slate-600">Close at<input value={assignment.closeAt} onChange={(event) => updateAssignment(assignment.id, { closeAt: event.target.value })} disabled={!editable} type="datetime-local" className="mt-1 h-7 w-full rounded border border-slate-300 px-2 text-[0.68rem]" /></label>
                      <label className="flex items-center gap-2 text-[0.65rem] font-bold text-slate-600"><input type="checkbox" checked={assignment.allowTextSubmission} onChange={(event) => updateAssignment(assignment.id, { allowTextSubmission: event.target.checked })} disabled={!editable} /> Allow written response</label>
                      <label className="flex items-center gap-2 text-[0.65rem] font-bold text-slate-600"><input type="checkbox" checked={assignment.allowFileSubmission} onChange={(event) => updateAssignment(assignment.id, { allowFileSubmission: event.target.checked })} disabled={!editable} /> Allow file upload</label>
                    </div> : null}
                  </article>;
                })}</div> : <p className="mt-2 rounded-md border border-dashed border-violet-200 px-2 py-2 text-[0.68rem] text-violet-800">No assignments added. Add one only when this period includes student work.</p>}
              </section>

              <section className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div><h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Assessment</h3><p className="text-[0.68rem] text-slate-500">Create the shell, then continue in the existing Question Builder.</p></div>
                  <button type="button" onClick={addAssessment} disabled={saving} className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[0.65rem] font-bold text-rose-800">+ Add assessment</button>
                </div>
                {assessments.length ? <div className="mt-2 space-y-2">{assessments.map((assessment) => {
                  const hierarchy = assessmentHierarchy(assessment);
                  const expanded = expandedAssessmentId === assessment.id;
                  const editable = assessment.id.startsWith("new-") || assessment.status !== "ARCHIVED";
                  return <article key={assessment.id} className="rounded-lg border border-rose-100 bg-white p-2">
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" onClick={() => setExpandedAssessmentId(expanded ? null : assessment.id)} className="min-w-0 flex-1 text-left">
                        <p className="text-[0.65rem] font-bold uppercase text-rose-700">{assessmentTypeLabel(assessment.type)} - {assessment.status}</p>
                        <p className="truncate text-xs font-bold text-slate-900">{assessment.title || "Untitled assessment"}</p>
                        <p className="truncate text-[0.65rem] text-slate-500">{assessment.totalMarks ? assessment.totalMarks + " marks" : "Marks set in Question Builder"}{assessment.durationMinutes ? " - " + assessment.durationMinutes + " min" : ""}{assessment.questionCount ? " - " + assessment.questionCount + " question(s)" : ""}</p>
                      </button>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setExpandedAssessmentId(expanded ? null : assessment.id)} disabled={saving} className="rounded border border-rose-200 px-2 py-1 text-[0.62rem] font-bold text-rose-800">{expanded ? "Close" : "Edit"}</button>
                        {assessment.id.startsWith("new-") ? null : <a href={"/teacher-dashboard/classes/" + occurrence.entry.sectionId + "/assessments/" + assessment.id + "?subject=" + sectionSubjectId} className="rounded border border-slate-200 px-2 py-1 text-[0.62rem] font-bold text-slate-700">Question Builder</a>}
                        <button type="button" onClick={() => removeAssessment(assessment.id)} disabled={saving} className="rounded px-1.5 py-1 text-[0.62rem] font-bold text-rose-600">Remove</button>
                      </div>
                    </div>
                    {expanded ? <div className="mt-2 grid gap-2 border-t border-rose-100 pt-2 sm:grid-cols-2">
                      {!editable ? <p className="sm:col-span-2 rounded-md bg-amber-50 px-2 py-1.5 text-[0.65rem] text-amber-800">Archived assessments are read-only. Remove safely detaches the period link and preserves student work.</p> : null}
                      <label className="sm:col-span-2 text-[0.65rem] font-bold text-slate-600">Assessment name<input value={assessment.title} onChange={(event) => updateAssessment(assessment.id, { title: event.target.value })} disabled={!editable} maxLength={160} className="mt-1 h-7 w-full rounded border border-slate-300 px-2 text-[0.68rem]" /></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Type<select value={assessment.type} onChange={(event) => updateAssessment(assessment.id, { type: assessmentType(event.target.value) })} disabled={!editable} className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[0.68rem]">{ASSESSMENT_TYPES.map((type) => <option key={type} value={type}>{assessmentTypeLabel(type)}</option>)}</select></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Book<select value={assessment.bookId} onChange={(event) => changeAssessmentBook(assessment.id, event.target.value)} disabled={!editable} className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[0.68rem]"><option value="">Choose book</option>{assignmentBooks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Chapter<select value={assessment.chapterId} onChange={(event) => updateAssessment(assessment.id, { chapterId: event.target.value, moduleId: "", exerciseId: "" })} disabled={!editable || !assessment.bookId || !hierarchy.data} className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[0.68rem]"><option value="">All chapters</option>{hierarchy.data?.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>Chapter {chapter.chapterNumber}: {chapter.title}</option>)}</select></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Module filter<select value={assessment.moduleId} onChange={(event) => updateAssessment(assessment.id, { moduleId: event.target.value, exerciseId: "" })} disabled={!editable || !assessment.chapterId || !hierarchy.modules.length} className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[0.68rem]"><option value="">All modules</option>{hierarchy.modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Exercise filter<select value={assessment.exerciseId} onChange={(event) => updateAssessment(assessment.id, { exerciseId: event.target.value })} disabled={!editable || !assessment.chapterId || !hierarchy.exercises.length} className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[0.68rem]"><option value="">All exercises</option>{hierarchy.exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.title}</option>)}</select></label>
                      <p className="sm:col-span-2 rounded-md bg-slate-50 px-2 py-1.5 text-[0.62rem] text-slate-600">Module and Exercise use the real published hierarchy for filtering. The canonical Assessment stores Book and Chapter only.</p>
                      <label className="sm:col-span-2 text-[0.65rem] font-bold text-slate-600">Instructions<textarea value={assessment.instructions} onChange={(event) => updateAssessment(assessment.id, { instructions: event.target.value })} disabled={!editable} maxLength={4000} rows={2} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-[0.68rem]" /></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Duration (minutes)<input value={assessment.durationMinutes} onChange={(event) => updateAssessment(assessment.id, { durationMinutes: event.target.value })} disabled={!editable} type="number" min={1} max={300} className="mt-1 h-7 w-full rounded border border-slate-300 px-2 text-[0.68rem]" /></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Maximum marks<input value={assessment.maximumMarks} onChange={(event) => updateAssessment(assessment.id, { maximumMarks: event.target.value })} disabled={!editable} type="number" min={1} max={10000} placeholder="Derived from questions" className="mt-1 h-7 w-full rounded border border-slate-300 px-2 text-[0.68rem]" /></label>
                      <p className="sm:col-span-2 text-[0.62rem] text-slate-500">Passing marks are not supported by the current Assessment engine. Maximum marks are derived from selected questions.</p>
                      <label className="text-[0.65rem] font-bold text-slate-600">Open date/time<input value={assessment.opensAt} onChange={(event) => updateAssessment(assessment.id, { opensAt: event.target.value })} disabled={!editable} type="datetime-local" className="mt-1 h-7 w-full rounded border border-slate-300 px-2 text-[0.68rem]" /></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Close / due date/time<input value={assessment.dueAt} onChange={(event) => updateAssessment(assessment.id, { dueAt: event.target.value })} disabled={!editable} type="datetime-local" className="mt-1 h-7 w-full rounded border border-slate-300 px-2 text-[0.68rem]" /></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Attempts allowed<input value={assessment.maxAttempts} onChange={(event) => updateAssessment(assessment.id, { maxAttempts: event.target.value })} disabled={!editable} type="number" min={1} max={20} className="mt-1 h-7 w-full rounded border border-slate-300 px-2 text-[0.68rem]" /></label>
                      <label className="text-[0.65rem] font-bold text-slate-600">Result release<select value={assessment.resultRelease} onChange={(event) => updateAssessment(assessment.id, { resultRelease: resultRelease(event.target.value) })} disabled={!editable} className="mt-1 h-7 w-full rounded border border-slate-300 bg-white px-2 text-[0.68rem]"><option value="IMMEDIATE">Immediate</option><option value="AFTER_DUE_DATE">After due date</option><option value="NEVER">Never</option></select></label>
                      <p className="sm:col-span-2 rounded-md bg-rose-50 px-2 py-1.5 text-[0.62rem] text-rose-800">Save creates a Draft shell. Continue to Question Builder to add questions and use the canonical Publish action.</p>
                    </div> : null}
                  </article>;
                })}</div> : <p className="mt-2 rounded-md border border-dashed border-rose-200 px-2 py-2 text-[0.68rem] text-rose-800">No assessments added. Add one only when this period includes an assessment.</p>}
              </section>
              <section className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                <h3 className="text-sm font-bold text-slate-900">Objective & Note</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="text-[0.68rem] font-bold text-slate-600">Objective<textarea value={objective} onChange={(event) => setObjective(event.target.value)} maxLength={1000} rows={2} placeholder="What should students learn?" className="mt-1 w-full resize-none rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-normal" /></label><label className="text-[0.68rem] font-bold text-slate-600">Teacher note<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} rows={2} placeholder="A note for your next lesson" className="mt-1 w-full resize-none rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-normal" /></label></div>
              </section>
            </>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-slate-100 bg-white px-3 py-2.5">
          <p className="text-[0.65rem] text-slate-500">{period?.assignmentCount || period?.assessmentCount ? "Linked work is preserved." : "Add Teach content, an activity, an objective, or a note."}</p>
          <div className="flex gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-md border border-slate-300 px-3 py-1.5 text-[0.68rem] font-bold text-slate-700">Cancel</button><button type="button" onClick={save} disabled={saving || loading || !data} className="rounded-md bg-teal-700 px-3 py-1.5 text-[0.68rem] font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save plan"}</button></div>
        </footer>
      </section>
    </div>
  );
}