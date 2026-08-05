"use client";

import { QUESTION_TEMPLATE_DEFINITIONS, type QuestionTemplateId } from "@/components/admin/books/question-studio/shared";

export default function QuestionTypeGallery({
  open,
  onClose,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (templateId: QuestionTemplateId) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Close question type gallery" className="absolute inset-0" onClick={onClose} />
      <section className="relative z-10 max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Choose Question Type</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Question Authoring Gallery</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Each question type opens its own dedicated authoring template. Only the fields needed for that question will be shown.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Close
          </button>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {QUESTION_TEMPLATE_DEFINITIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChoose(item.id)}
              className="rounded-[1.5rem] border border-slate-200 bg-[#fcfaf5] p-4 text-left transition hover:border-slate-300 hover:bg-white"
            >
              <p className="text-sm font-bold text-slate-950">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
