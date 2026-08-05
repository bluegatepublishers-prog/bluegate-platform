"use client";

import {
  Label,
  Section,
  fieldClass,
  type QuestionStudioDraft,
} from "@/components/admin/books/question-studio/shared";

export default function AssertionReasonEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="Assertion–Reason Template" description="Separate assertion and reason fields with the standard A/B/C/D answer set.">
      <Label title="Assertion" wide>
        <textarea rows={3} value={draft.assertionText} onChange={(event) => onChange({ assertionText: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Reason" wide>
        <textarea rows={3} value={draft.assertionReason} onChange={(event) => onChange({ assertionReason: event.target.value })} className={fieldClass()} />
      </Label>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(["A", "B", "C", "D"] as const).map((option) => (
          <label key={option} className="rounded-[1.2rem] bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
            <input
              type="radio"
              name="assertion-reason-answer"
              checked={draft.assertionOption === option}
              onChange={() => onChange({ assertionOption: option })}
              className="mr-2"
            />
            {option}
          </label>
        ))}
      </div>
      <Label title="Explanation" wide>
        <textarea rows={4} value={draft.explanation} onChange={(event) => onChange({ explanation: event.target.value })} className={fieldClass()} />
      </Label>
    </Section>
  );
}
