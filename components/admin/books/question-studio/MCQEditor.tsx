"use client";

import {
  HelperText,
  Label,
  Section,
  addStringItem,
  fieldClass,
  removeStringItem,
  updateStringItem,
  type QuestionStudioDraft,
} from "@/components/admin/books/question-studio/shared";

export default function MCQEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="MCQ Template" description="Question, options, the correct answer, and a short explanation.">
      <Label title="Question" wide>
        <textarea
          rows={5}
          value={draft.questionText}
          onChange={(event) => onChange({ questionText: event.target.value })}
          className={fieldClass()}
        />
      </Label>

      <div className="space-y-3">
        {draft.mcqOptions.map((option, index) => (
          <div key={`mcq-option-${index}`} className="rounded-[1.2rem] bg-white p-3 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">Option {String.fromCharCode(65 + index)}</p>
              {draft.mcqOptions.length > 2 ? (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      mcqOptions: removeStringItem(draft.mcqOptions, index),
                      mcqCorrectIndex:
                        draft.mcqCorrectIndex >= index && draft.mcqCorrectIndex > 0
                          ? draft.mcqCorrectIndex - 1
                          : draft.mcqCorrectIndex,
                    })
                  }
                  className="text-xs font-semibold text-rose-600"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <input
              value={option}
              onChange={(event) =>
                onChange({
                  mcqOptions: updateStringItem(draft.mcqOptions, index, event.target.value),
                })
              }
              className={fieldClass()}
            />
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input
                type="radio"
                name="mcq-correct-answer"
                checked={draft.mcqCorrectIndex === index}
                onChange={() => onChange({ mcqCorrectIndex: index })}
              />
              Correct answer
            </label>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ mcqOptions: addStringItem(draft.mcqOptions) })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Add Option
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
      <HelperText>No image, matching, or assertion-specific controls are shown in this template.</HelperText>
    </Section>
  );
}
