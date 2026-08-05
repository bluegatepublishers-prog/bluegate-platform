"use client";

import {
  Label,
  Section,
  addCasePrompt,
  fieldClass,
  removeCasePrompt,
  updateCasePrompt,
  type QuestionStudioDraft,
} from "@/components/admin/books/question-studio/shared";

export default function CaseStudyEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="Case Study Template" description="Case title, passage, and a managed list of follow-up prompts.">
      <Label title="Case Study Title" wide>
        <input value={draft.caseStudyTitle} onChange={(event) => onChange({ caseStudyTitle: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Case Study Passage" wide>
        <textarea rows={7} value={draft.caseStudyPassage} onChange={(event) => onChange({ caseStudyPassage: event.target.value })} className={fieldClass()} />
      </Label>
      <div className="space-y-3">
        {draft.caseStudyQuestions.map((item, index) => (
          <div key={item.id} className="rounded-[1.2rem] bg-white p-3 ring-1 ring-slate-200">
            <div className="grid gap-3 lg:grid-cols-[12rem_1fr_auto]">
              <select
                value={item.type}
                onChange={(event) => onChange({ caseStudyQuestions: updateCasePrompt(draft.caseStudyQuestions, item.id, { type: event.target.value as typeof item.type }) })}
                className={fieldClass("mt-0")}
              >
                <option value="MCQ">MCQ</option>
                <option value="SHORT">Short</option>
                <option value="LONG">Long</option>
                <option value="TRUE_FALSE">True / False</option>
              </select>
              <textarea
                rows={3}
                value={item.prompt}
                onChange={(event) => onChange({ caseStudyQuestions: updateCasePrompt(draft.caseStudyQuestions, item.id, { prompt: event.target.value }) })}
                placeholder={`Question ${index + 1}`}
                className={fieldClass("mt-0")}
              />
              <button type="button" onClick={() => onChange({ caseStudyQuestions: removeCasePrompt(draft.caseStudyQuestions, item.id) })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                Remove
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ caseStudyQuestions: addCasePrompt(draft.caseStudyQuestions) })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          Add Question
        </button>
      </div>
      <Label title="Explanation" wide>
        <textarea rows={4} value={draft.explanation} onChange={(event) => onChange({ explanation: event.target.value })} className={fieldClass()} />
      </Label>
    </Section>
  );
}
