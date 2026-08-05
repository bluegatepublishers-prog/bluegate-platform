"use client";

import {
  Label,
  Section,
  fieldClass,
  type QuestionStudioDraft,
} from "@/components/admin/books/question-studio/shared";

export default function HOTSEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="HOTS Template" description="Higher-order thinking prompt with skill, model answer, and rubric.">
      <Label title="Question" wide>
        <textarea rows={4} value={draft.questionText} onChange={(event) => onChange({ questionText: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Expected Thinking Skill" wide>
        <input value={draft.hotsSkill} onChange={(event) => onChange({ hotsSkill: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Model Answer" wide>
        <textarea rows={4} value={draft.hotsModelAnswer} onChange={(event) => onChange({ hotsModelAnswer: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Rubric" wide>
        <textarea rows={4} value={draft.hotsRubric} onChange={(event) => onChange({ hotsRubric: event.target.value })} className={fieldClass()} />
      </Label>
    </Section>
  );
}
