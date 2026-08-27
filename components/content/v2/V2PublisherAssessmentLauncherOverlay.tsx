"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useV2OverlayPortalTarget } from "@/components/content/v2/V2OverlayPortalContext";
import type { V2PublisherAssessmentInstantiationContextValue } from "@/components/content/v2/V2PublisherAssessmentInstantiationContext";

import { InteractiveQuestionRenderer } from "@/components/questions/InteractiveQuestionRenderer";
import type { InteractiveQuestion } from "@/lib/normalized-question";

type PreviewAssessment = {
  heading: string;
  scope: string;
  durationMinutes: number | null;
  totalMarks: number;
  instructions: string | null;
  sections: Array<{
    questionType: string;
    label: string;
    instruction: string | null;
    questions: Array<{ questionNumber: number; marks: number; interactiveQuestion: InteractiveQuestion }>;
  }>;
};

export default function V2PublisherAssessmentLauncherOverlay({
  assessmentId,
  mode,
  teacherContext,
  onClose,
}: {
  assessmentId: string;
  mode: "PREVIEW" | "STUDENT" | "TEACHER";
  teacherContext?: V2PublisherAssessmentInstantiationContextValue | null;
  onClose: () => void;
}) {
  const portalTarget = useV2OverlayPortalTarget();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [assessment, setAssessment] = useState<PreviewAssessment | null>(null);
  const [loading, setLoading] = useState(mode === "PREVIEW");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdAssessmentId, setCreatedAssessmentId] = useState("");
  const [createdAssessmentStatus, setCreatedAssessmentStatus] = useState("");

  useEffect(() => {
    const previousOverflow = globalThis.document.body.style.overflow;
    globalThis.document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    globalThis.document.addEventListener("keydown", onKeyDown);
    return () => {
      globalThis.document.removeEventListener("keydown", onKeyDown);
      globalThis.document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (mode !== "PREVIEW") return;
    let cancelled = false;
    void fetch(`/api/admin/publisher-assessments/${encodeURIComponent(assessmentId)}/launcher-preview`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { ok?: boolean; message?: string; assessment?: PreviewAssessment };
        if (!response.ok || !body.ok || !body.assessment) throw new Error(body.message ?? "Assessment preview is unavailable.");
        if (!cancelled) setAssessment(body.assessment);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Assessment preview is unavailable.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [assessmentId, mode]);

  async function createDraft() {
    if (!teacherContext || creating) return;
    setCreating(true);
    setMessage("");
    try {
      const response = await fetch("/api/teacher/smart-book/publisher-assessments/instantiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: teacherContext.sectionId,
          sectionSubjectId: teacherContext.sectionSubjectId,
          bookId: teacherContext.bookId,
          publisherAssessmentId: assessmentId,
          teachingPeriodId: teacherContext.teachingPeriodId ?? null,
        }),
      });
      const body = await response.json() as { ok?: boolean; assessmentId?: string; status?: string; message?: string };
      if (!response.ok || !body.ok || !body.assessmentId) throw new Error();
      setCreatedAssessmentId(body.assessmentId);
      setCreatedAssessmentStatus(body.status ?? "");
    } catch {
      setMessage("This assessment is unavailable in this Smart Book release.");
    } finally {
      setCreating(false);
    }
  }

  const assessmentHref = createdAssessmentId && teacherContext
    ? "/teacher-dashboard/classes/" + encodeURIComponent(teacherContext.sectionId) + "/assessments/" + encodeURIComponent(createdAssessmentId) + "?subject=" + encodeURIComponent(teacherContext.sectionSubjectId) + (teacherContext.returnHref ? "&returnTo=" + encodeURIComponent(teacherContext.returnHref) : "")
    : "";

  if (typeof globalThis.document === "undefined" || !portalTarget) return null;
  return createPortal(
    <div data-v2-publisher-assessment-overlay role="presentation" className="pointer-events-auto fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div><p className="text-xs font-bold uppercase tracking-wide text-violet-700">{mode === "PREVIEW" ? "Publisher Preview" : mode === "TEACHER" ? "Create Assessment" : "Assessment"}</p><h2 id={titleId} className="text-lg font-bold text-slate-950">{assessment?.heading ?? "ASSESSMENT"}</h2></div>
          <button ref={closeRef} type="button" aria-label="Close assessment" onClick={onClose} className="rounded-lg px-3 py-1 text-xl font-bold leading-none text-slate-600 hover:bg-slate-200">x</button>
        </header>
        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
          {mode === "STUDENT" ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-700">Publisher assessment delivery is coming next. No student attempt has been created.</p> : null}
          {mode === "TEACHER" ? <section className="rounded-xl bg-slate-50 p-5 text-sm text-slate-700">
            {createdAssessmentId ? <>
              <p className="font-semibold text-emerald-800">{createdAssessmentStatus === "DRAFT" ? "The immutable released assessment is ready as a draft." : "This immutable released assessment already has a canonical class assessment."}</p>
              <Link href={assessmentHref} className="mt-4 inline-flex rounded-lg bg-violet-700 px-4 py-2 font-bold text-white">Review assessment in Question Builder</Link>
            </> : <>
              <p>Create a canonical draft from this exact published Smart Book release. You can review it before publishing to Students.</p>
              <button type="button" disabled={!teacherContext || creating} onClick={() => void createDraft()} className="mt-4 rounded-lg bg-violet-700 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{creating ? "Creating..." : "Create assessment draft"}</button>
            </>}
          </section> : null}
          {loading ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Loading assessment...</p> : null}
          {message ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{message}</p> : null}
          {mode === "PREVIEW" && assessment ? <>
            <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-3"><span><strong>Scope:</strong> {assessment.scope}</span>{assessment.durationMinutes ? <span><strong>Duration:</strong> {assessment.durationMinutes} min</span> : null}<span><strong>Total marks:</strong> {assessment.totalMarks}</span></div>
            {assessment.instructions ? <section><h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">General Instructions</h3><p className="mt-2 whitespace-pre-wrap rounded-xl bg-violet-50 p-4 text-sm leading-6 text-violet-950">{assessment.instructions}</p></section> : null}
            {assessment.sections.map((section, sectionIndex) => <section key={section.questionType} className="space-y-3"><div className="border-b border-slate-200 pb-2"><h3 className="font-bold text-slate-950">Section {String.fromCharCode(65 + sectionIndex)} - {section.label}</h3>{section.instruction ? <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{section.instruction}</p> : null}</div>{section.questions.map((question) => <article key={question.interactiveQuestion.id} className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold text-slate-500">Question {question.questionNumber} · {question.marks} mark{question.marks === 1 ? "" : "s"}</p><div className="mt-2"><InteractiveQuestionRenderer question={question.interactiveQuestion} response="" onChange={() => undefined} readOnly /></div></article>)}</section>)}
          </> : null}
        </div>
      </section>
    </div>,
    portalTarget,
  );
}
