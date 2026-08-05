"use client";

import {
  Label,
  Section,
  addPairItem,
  fieldClass,
  removePairItem,
  updatePairItem,
  type QuestionStudioDraft,
} from "@/components/admin/books/question-studio/shared";

export default function MatchEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="Match the Following Template" description="Instructions, parallel columns, and answer mapping rows.">
      <Label title="Instructions" wide>
        <textarea
          rows={3}
          value={draft.matchInstructions}
          onChange={(event) => onChange({ matchInstructions: event.target.value })}
          className={fieldClass()}
        />
      </Label>
      <div className="space-y-3">
        {draft.matchPairs.map((pair, index) => (
          <div key={`match-pair-${index}`} className="grid gap-3 rounded-[1.2rem] bg-white p-3 ring-1 ring-slate-200 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={pair.left}
              onChange={(event) => onChange({ matchPairs: updatePairItem(draft.matchPairs, index, { left: event.target.value }) })}
              placeholder={`Column A ${index + 1}`}
              className={fieldClass("mt-0")}
            />
            <input
              value={pair.right}
              onChange={(event) => onChange({ matchPairs: updatePairItem(draft.matchPairs, index, { right: event.target.value }) })}
              placeholder={`Column B ${index + 1}`}
              className={fieldClass("mt-0")}
            />
            <button
              type="button"
              onClick={() => onChange({ matchPairs: removePairItem(draft.matchPairs, index) })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ matchPairs: addPairItem(draft.matchPairs) })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Add Row
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
