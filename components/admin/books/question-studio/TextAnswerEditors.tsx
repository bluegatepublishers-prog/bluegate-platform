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

export function OneWordEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="One Word Answer Template" description="Question, one primary answer, and optional alternatives.">
      <Label title="Question" wide>
        <textarea rows={4} value={draft.questionText} onChange={(event) => onChange({ questionText: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Correct Answer">
        <input value={draft.oneWordAnswer} onChange={(event) => onChange({ oneWordAnswer: event.target.value })} className={fieldClass()} />
      </Label>
      <div className="space-y-3">
        {draft.oneWordAlternatives.map((answer, index) => (
          <div key={`one-word-alt-${index}`} className="rounded-[1.2rem] bg-white p-3 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">Alternative Answer {index + 1}</p>
              {draft.oneWordAlternatives.length > 1 ? (
                <button type="button" onClick={() => onChange({ oneWordAlternatives: removeStringItem(draft.oneWordAlternatives, index) })} className="text-xs font-semibold text-rose-600">
                  Remove
                </button>
              ) : null}
            </div>
            <input value={answer} onChange={(event) => onChange({ oneWordAlternatives: updateStringItem(draft.oneWordAlternatives, index, event.target.value) })} className={fieldClass()} />
          </div>
        ))}
        <button type="button" onClick={() => onChange({ oneWordAlternatives: addStringItem(draft.oneWordAlternatives) })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          Add Alternative Answer
        </button>
      </div>
      <Label title="Explanation" wide>
        <textarea rows={4} value={draft.explanation} onChange={(event) => onChange({ explanation: event.target.value })} className={fieldClass()} />
      </Label>
    </Section>
  );
}

export function VeryShortEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="Very Short Answer Template" description="Question, expected answer, and optional key points.">
      <Label title="Question" wide>
        <textarea rows={4} value={draft.questionText} onChange={(event) => onChange({ questionText: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Expected Answer" wide>
        <textarea rows={3} value={draft.veryShortAnswer} onChange={(event) => onChange({ veryShortAnswer: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Key Points" wide>
        <textarea rows={3} value={draft.veryShortKeyPoints} onChange={(event) => onChange({ veryShortKeyPoints: event.target.value })} className={fieldClass()} />
      </Label>
    </Section>
  );
}

export function ShortAnswerEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="Short Answer Template" description="Expected answer, model answer, and marking guidelines.">
      <Label title="Question" wide>
        <textarea rows={4} value={draft.questionText} onChange={(event) => onChange({ questionText: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Expected Answer" wide>
        <textarea rows={3} value={draft.shortExpectedAnswer} onChange={(event) => onChange({ shortExpectedAnswer: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Model Answer" wide>
        <textarea rows={4} value={draft.shortModelAnswer} onChange={(event) => onChange({ shortModelAnswer: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Marking Guidelines" wide>
        <textarea rows={4} value={draft.shortGuidelines} onChange={(event) => onChange({ shortGuidelines: event.target.value })} className={fieldClass()} />
      </Label>
    </Section>
  );
}

export function LongAnswerEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="Long Answer Template" description="Question, model answer, rubric, and expected keywords.">
      <Label title="Question" wide>
        <textarea rows={4} value={draft.questionText} onChange={(event) => onChange({ questionText: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Model Answer" wide>
        <textarea rows={5} value={draft.longModelAnswer} onChange={(event) => onChange({ longModelAnswer: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Marking Rubric" wide>
        <textarea rows={4} value={draft.longRubric} onChange={(event) => onChange({ longRubric: event.target.value })} className={fieldClass()} />
      </Label>
      <div className="space-y-3">
        {draft.longKeywords.map((keyword, index) => (
          <div key={`keyword-${index}`} className="rounded-[1.2rem] bg-white p-3 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">Expected Keyword {index + 1}</p>
              {draft.longKeywords.length > 1 ? (
                <button type="button" onClick={() => onChange({ longKeywords: removeStringItem(draft.longKeywords, index) })} className="text-xs font-semibold text-rose-600">
                  Remove
                </button>
              ) : null}
            </div>
            <input value={keyword} onChange={(event) => onChange({ longKeywords: updateStringItem(draft.longKeywords, index, event.target.value) })} className={fieldClass()} />
          </div>
        ))}
        <button type="button" onClick={() => onChange({ longKeywords: addStringItem(draft.longKeywords) })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          Add Keyword
        </button>
      </div>
    </Section>
  );
}
