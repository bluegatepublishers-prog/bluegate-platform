"use client";

import {
  Label,
  Section,
  fieldClass,
  type QuestionStudioDraft,
} from "@/components/admin/books/question-studio/shared";

export default function TrueFalseEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="True / False Template" description="Statement, correct value, explanation, and marks.">
      <Label title="Statement" wide>
        <textarea
          rows={4}
          value={draft.questionText}
          onChange={(event) => onChange({ questionText: event.target.value })}
          className={fieldClass()}
        />
      </Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="rounded-[1.2rem] bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
          <input
            type="radio"
            name="true-false-answer"
            checked={draft.trueFalseAnswer === "true"}
            onChange={() => onChange({ trueFalseAnswer: "true" })}
            className="mr-2"
          />
          True
        </label>
        <label className="rounded-[1.2rem] bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
          <input
            type="radio"
            name="true-false-answer"
            checked={draft.trueFalseAnswer === "false"}
            onChange={() => onChange({ trueFalseAnswer: "false" })}
            className="mr-2"
          />
          False
        </label>
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
