"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { InteractiveQuestionRenderer } from "@/components/questions/InteractiveQuestionRenderer";
import type { InteractiveQuestion } from "@/lib/normalized-question";
import {
  getPublisherAssessmentQuestionTypeLabel,
  groupPublisherAssessmentItemsByType,
} from "@/lib/publisher-assessment-presentation";

type Item = {
  itemId: string;
  questionType: string;
  questionText: string;
  marks: number;
  preview: InteractiveQuestion;
};

export default function PublisherAssessmentPreview({
  heading, scope, durationMinutes, instructions, sectionInstructions, mode, items, totalMarks, close,
}: {
  heading: string;
  scope: string;
  durationMinutes: number | null;
  instructions: string | null;
  sectionInstructions: Record<string, string>;
  mode: "INTERACTIVE" | "PRINT" | "BOTH";
  items: Item[];
  totalMarks: number;
  close: () => void;
}) {
  const [display, setDisplay] = useState<"INTERACTIVE" | "PRINT">(mode === "PRINT" ? "PRINT" : "INTERACTIVE");
  let number = 0;
  const sections = groupPublisherAssessmentItemsByType(items).map((section) => ({
    ...section,
    label: getPublisherAssessmentQuestionTypeLabel(section.questionType),
    instruction: sectionInstructions[section.questionType] ?? "",
    questions: section.items.map((item) => ({ item, number: ++number })),
  }));
  return <div data-publisher-assessment-preview className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:p-6"><section role="dialog" aria-modal="true" className="mx-auto max-w-3xl rounded-xl bg-white p-5 shadow-2xl"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold">{heading}</h2><p className="text-sm text-slate-500">Scope: {scope}{durationMinutes ? ` · ${durationMinutes} minutes` : ""} · {items.length} questions · {totalMarks} marks</p></div><button type="button" onClick={close} aria-label="Close preview"><X className="h-5 w-5" /></button></div>{mode === "BOTH" ? <div className="mt-3 flex gap-2"><button type="button" onClick={() => setDisplay("INTERACTIVE")} className="rounded border px-3 py-1 text-sm font-bold">Interactive</button><button type="button" onClick={() => setDisplay("PRINT")} className="rounded border px-3 py-1 text-sm font-bold">Print</button></div> : null}{instructions ? <section className="mt-5"><h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">General Instructions</h3><p className="mt-2 whitespace-pre-wrap rounded-lg bg-violet-50 p-4 text-sm text-violet-950">{instructions}</p></section> : null}<div className="mt-5 space-y-6">{sections.map((section, index) => <section key={section.questionType}><div className="border-b border-slate-200 pb-2"><h3 className="font-bold">Section {String.fromCharCode(65 + index)} - {section.label}</h3>{section.instruction ? <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{section.instruction}</p> : null}</div><ol className="mt-4 space-y-5">{section.questions.map(({ item, number: questionNumber }) => <li key={item.itemId} className="rounded-lg border border-slate-200 p-4"><div className="mb-3 flex justify-between gap-3"><span className="font-bold">{questionNumber}. {item.questionText}</span><span className="shrink-0 text-sm font-bold text-slate-500">{item.marks} marks</span></div>{display === "INTERACTIVE" ? <InteractiveQuestionRenderer question={item.preview} response="" onChange={() => undefined} readOnly showPrompt={false} /> : <PrintQuestion question={item.preview} />}</li>)}</ol></section>)}</div></section></div>;
}

function PrintQuestion({ question }: { question: InteractiveQuestion }) {
  if (["MCQ", "MULTIPLE_SELECT"].includes(question.questionType)) return <ol className="list-[upper-alpha] space-y-1 pl-6 text-sm">{question.options.map((option) => <li key={option.id}>{option.text}</li>)}</ol>;
  if (question.questionType === "TRUE_FALSE") return <p className="text-sm">True / False</p>;
  if (question.questionType === "FILL_BLANK") return <p className="border-b border-slate-400 pb-2">&nbsp;</p>;
  return <div className="space-y-3">{Array.from({ length: question.questionType === "SHORT_ANSWER" ? 3 : 6 }, (_, index) => <div key={index} className="border-b border-slate-300" />)}</div>;
}
