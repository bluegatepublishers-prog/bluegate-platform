"use client";

import { useEffect, useState, useTransition } from "react";
import { useTeachModeClassroom } from "@/components/teacher/TeachModeShell";

import {
  createTeachModeAssignmentAction,
  createTeachModeAssessmentAction,
  saveTeachModeNoteAction,
  updateTeachModeStatusAction,
} from "@/app/teacher-dashboard/classes/[sectionId]/teach/actions";

type Period = {
  id: string;
  title: string;
  status: "PLANNED" | "COMPLETED" | "SKIPPED" | "RESCHEDULED";
  chapterTitle: string | null;
  objective: string | null;
  notes: string | null;
  assignments: Array<{ id: string; title: string; assignmentType: string; status: string }>;
  assessments: Array<{ id: string; title: string; status: string }>;
};

type Props = {
  period: Period;
  sectionId: string;
  sectionSubjectId: string;
  bookId: string;
  classLabel: string;
  subjectName: string;
  periodLabel: string;
  timeLabel: string;
  dateLabel: string;
  bookTitle: string;
  chapterTitle: string | null;
  persistedPage: number | null;
  returnHref: string;
};

type Tool = "menu" | "info" | "assignment" | "assessment" | "note" | "status";
type AssignmentType = "CLASSWORK" | "HOMEWORK" | "WORKSHEET";

export default function TeachModeClassTools(props: Props) {
  const classroom = useTeachModeClassroom();
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<Tool>("menu");
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("CLASSWORK");
  const [period, setPeriod] = useState(props.period);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setPeriod(props.period), [props.period]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function showTool(next: Tool) {
    setMessage(null);
    setError(null);
    setTool(next);
    setOpen(true);
  }

  function run(action: () => Promise<{ ok: boolean; message?: string; period?: Period; id?: string | null }>, success: string) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? "The classroom action could not be completed.");
        return;
      }
      if (result.period) setPeriod(result.period);
      setMessage(success);
      setTool("menu");
    });
  }

  const currentPage = classroom?.currentPage ?? props.persistedPage;
  const createdAssignment = period.assignments[period.assignments.length - 1];
  const createdAssessment = period.assessments[period.assessments.length - 1];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setMessage(null);
          setOpen((value) => !value);
          setTool("menu");
        }}
        aria-expanded={open}
        aria-controls="teach-mode-class-tools"
        className="pointer-events-auto fixed right-3 top-16 z-[110] rounded-xl border border-white/20 bg-slate-950/90 px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-teal-300"
      >
        Class Tools
      </button>

      {open ? (
        <aside
          id="teach-mode-class-tools"
          role="dialog"
          aria-label="Class Tools"
          className="pointer-events-auto fixed bottom-3 right-3 top-16 z-[115] flex w-[min(92vw,23rem)] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-teal-700">Classroom</p>
              <h2 className="text-base font-bold text-slate-950">{tool === "menu" ? "Class Tools" : toolTitle(tool)}</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Class Tools" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Close</button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {message ? <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{message}</p> : null}
            {error ? <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{error}</p> : null}

            {tool === "menu" ? (
              <div className="grid gap-2">
                <button type="button" onClick={() => showTool("info")} className="tool-action">Class Info</button>
                <button type="button" onClick={() => { setAssignmentType("CLASSWORK"); showTool("assignment"); }} className="tool-action">Classwork</button>
                <button type="button" onClick={() => { setAssignmentType("HOMEWORK"); showTool("assignment"); }} className="tool-action">Homework</button>
                <button type="button" onClick={() => { setAssignmentType("WORKSHEET"); showTool("assignment"); }} className="tool-action">Worksheet</button>
                <button type="button" onClick={() => showTool("assessment")} className="tool-action">Assessment</button>
                <button type="button" onClick={() => showTool("note")} className="tool-action">Teacher Note</button>
                <button type="button" onClick={() => showTool("status")} className="tool-action">Lesson Status</button>
              </div>
            ) : null}

            {tool === "info" ? <InfoView {...props} currentPage={currentPage} period={period} /> : null}
            {tool === "assignment" ? <AssignmentForm {...props} assignmentType={assignmentType} pending={pending} onCancel={() => setTool("menu")} onSubmit={(input) => run(() => createTeachModeAssignmentAction({ ...input, sectionId: props.sectionId, sectionSubjectId: props.sectionSubjectId, periodId: period.id, bookId: props.bookId }), "Saved to this teaching period.")} createdAssignment={createdAssignment} /> : null}
            {tool === "assessment" ? <AssessmentForm {...props} pending={pending} onCancel={() => setTool("menu")} onSubmit={(input) => run(() => createTeachModeAssessmentAction({ ...input, sectionId: props.sectionId, sectionSubjectId: props.sectionSubjectId, periodId: period.id, bookId: props.bookId }), "Draft assessment created.")} createdAssessment={createdAssessment} /> : null}
            {tool === "note" ? <NoteForm period={period} pending={pending} onCancel={() => setTool("menu")} onSubmit={(notes) => run(() => saveTeachModeNoteAction({ sectionId: props.sectionId, sectionSubjectId: props.sectionSubjectId, periodId: period.id, notes }), "Teacher note saved.")} /> : null}
            {tool === "status" ? <StatusView period={period} pending={pending} onCancel={() => setTool("menu")} onStatus={(status) => run(() => updateTeachModeStatusAction({ sectionId: props.sectionId, sectionSubjectId: props.sectionSubjectId, periodId: period.id, status }), status === "COMPLETED" ? "Lesson marked complete." : "Lesson marked skipped.")} /> : null}
          </div>
        </aside>
      ) : null}
    </>
  );
}

function toolTitle(tool: Tool) {
  return { info: "Class Info", assignment: "Create Classroom Work", assessment: "Create Assessment", note: "Teacher Note", status: "Lesson Status", menu: "Class Tools" }[tool];
}

function InfoView({ ...props }: Props & { currentPage: number | null; period: Period }) {
  return <div className="space-y-3 text-sm text-slate-700"><InfoRow label="Class" value={props.classLabel} /><InfoRow label="Subject" value={props.subjectName} /><InfoRow label="Period" value={`${props.periodLabel} · ${props.timeLabel}`} /><InfoRow label="Date" value={props.dateLabel} /><InfoRow label="Book" value={props.bookTitle} /><InfoRow label="Chapter" value={props.chapterTitle ?? "Not selected"} /><InfoRow label="Book page" value={props.currentPage ? String(props.currentPage) : "Unavailable"} />{props.period.objective ? <InfoRow label="Objective" value={props.period.objective} /> : null}</div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>;
}

function AssignmentForm({ assignmentType, pending, onCancel, onSubmit, createdAssignment, returnHref }: { assignmentType: AssignmentType; pending: boolean; onCancel: () => void; onSubmit: (input: { title: string; instructions: string; assignmentType: AssignmentType; totalMarks: string; dueAt: string }) => void; createdAssignment?: { id: string; title: string } ; returnHref: string; chapterTitle?: string | null }) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [dueAt, setDueAt] = useState("");
  return <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); onSubmit({ title, instructions, assignmentType, totalMarks, dueAt }); }}><p className="text-xs text-slate-500">{assignmentType === "WORKSHEET" ? "Create a simple worksheet, then use the existing Assignment editor for structured questions." : "Class, subject, book, chapter, and teaching period are prefilled and authorized."}</p><Field label="Title" value={title} onChange={setTitle} required /><label className="block text-xs font-bold text-slate-700">Instructions<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><div className="grid grid-cols-2 gap-2"><Field label="Marks" value={totalMarks} onChange={setTotalMarks} type="number" min="1" /><Field label="Due" value={dueAt} onChange={setDueAt} type="datetime-local" /></div><div className="flex gap-2"><button type="submit" disabled={pending} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{pending ? "Creating…" : `Create ${assignmentType[0] + assignmentType.slice(1).toLowerCase()}`}</button><button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Cancel</button></div>{createdAssignment ? <p className="text-xs text-emerald-700">Created: <a className="font-bold underline" href={`/teacher-dashboard/classes/${encodeURIComponent(location.pathname.split("/")[3] ?? "")}/assignments/${createdAssignment.id}/edit?returnTo=${encodeURIComponent(returnHref)}`}>{createdAssignment.title}</a></p> : null}</form>;
}

function AssessmentForm({ pending, onCancel, onSubmit, createdAssessment, returnHref, sectionId, sectionSubjectId, chapterTitle }: { pending: boolean; onCancel: () => void; onSubmit: (input: { title: string; type: string; durationMinutes: string; maximumMarks: string }) => void; createdAssessment?: { id: string; title: string }; returnHref: string; sectionId: string; sectionSubjectId: string; chapterTitle?: string | null }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState(chapterTitle ? "CHAPTER" : "CUSTOM");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [maximumMarks, setMaximumMarks] = useState("");
  return <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); onSubmit({ title, type, durationMinutes, maximumMarks }); }}><p className="text-xs text-slate-500">Creates a Draft shell linked to this period. Questions and publishing remain in the existing builder.</p><Field label="Title" value={title} onChange={setTitle} required /><div className="grid grid-cols-2 gap-2"><label className="block text-xs font-bold text-slate-700">Type<select value={type} onChange={(event) => setType(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"><option value="CHAPTER">Chapter</option><option value="CUSTOM">Custom</option><option value="UNIT">Unit</option><option value="TERM">Term</option></select></label><Field label="Duration (min)" value={durationMinutes} onChange={setDurationMinutes} type="number" min="1" max="300" /></div><Field label="Marks" value={maximumMarks} onChange={setMaximumMarks} type="number" min="1" /><div className="flex gap-2"><button type="submit" disabled={pending} className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{pending ? "Creating…" : "Create & Open Question Builder"}</button><button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Cancel</button></div>{createdAssessment ? <p className="text-xs text-emerald-700">Created: <a className="font-bold underline" href={`/teacher-dashboard/classes/${sectionId}/assessments/${createdAssessment.id}?subject=${encodeURIComponent(sectionSubjectId)}&returnTo=${encodeURIComponent(returnHref)}`}>{createdAssessment.title}</a></p> : null}</form>;
}

function NoteForm({ period, pending, onCancel, onSubmit }: { period: Period; pending: boolean; onCancel: () => void; onSubmit: (notes: string) => void }) {
  const [notes, setNotes] = useState(period.notes ?? "");
  return <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); onSubmit(notes); }}><p className="text-xs text-slate-500">This updates TeachingPeriod.notes only. The objective remains separate.</p><label className="block text-xs font-bold text-slate-700">Teacher note<textarea aria-label="Teacher note" value={notes} onChange={(event) => setNotes(event.target.value)} rows={7} maxLength={4000} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><div className="flex gap-2"><button type="submit" disabled={pending} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{pending ? "Saving…" : "Save Note"}</button><button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Cancel</button></div></form>;
}

function StatusView({ period, pending, onCancel, onStatus }: { period: Period; pending: boolean; onCancel: () => void; onStatus: (status: "COMPLETED" | "SKIPPED") => void }) {
  return <div className="space-y-3"><p className="text-sm text-slate-700">Current status: <strong>{period.status}</strong></p><div className="flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => onStatus("COMPLETED")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">Mark Completed</button><button type="button" disabled={pending} onClick={() => onStatus("SKIPPED")} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-60">Mark Skipped</button><button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Cancel</button></div></div>;
}

function Field({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; min?: string; max?: string }) {
  return <label className="block text-xs font-bold text-slate-700">{label}<input {...props} required={props.required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>;
}
