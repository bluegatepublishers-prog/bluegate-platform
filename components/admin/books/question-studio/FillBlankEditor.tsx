"use client";

import {
  Label,
  Section,
  addStringItem,
  fieldClass,
  removeStringItem,
  updateStringItem,
  type QuestionStudioDraft,
} from "@/components/admin/books/question-studio/shared";

export default function FillBlankEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="Fill in the Blanks Template" description="Question sentence, accepted answers, and explanation.">
      <Label title="Question" wide>
        <textarea
          rows={4}
          value={draft.questionText}
          onChange={(event) => onChange({ questionText: event.target.value })}
          className={fieldClass()}
        />
      </Label>
      <div className="space-y-3">
        {draft.acceptedAnswers.map((answer, index) => (
          <div key={`accepted-answer-${index}`} className="rounded-[1.2rem] bg-white p-3 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">Accepted Answer {index + 1}</p>
              {draft.acceptedAnswers.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onChange({ acceptedAnswers: removeStringItem(draft.acceptedAnswers, index) })}
                  className="text-xs font-semibold text-rose-600"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <input
              value={answer}
              onChange={(event) =>
                onChange({ acceptedAnswers: updateStringItem(draft.acceptedAnswers, index, event.target.value) })
              }
              className={fieldClass()}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ acceptedAnswers: addStringItem(draft.acceptedAnswers) })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Add Another Answer
        </button>
      </div>
      <Label title="Explanation" wide>
        <textarea
          rows={4}
          value={draft.explanation}
          onChange={(event) => onChange({ explanation: event.target.value })}
          className={fieldClass()}
        />
      </Label>
    </Section>
  );
}
