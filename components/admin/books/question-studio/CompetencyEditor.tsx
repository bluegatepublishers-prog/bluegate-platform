"use client";

import {
  Label,
  Section,
  fieldClass,
  type QuestionStudioDraft,
} from "@/components/admin/books/question-studio/shared";

export default function CompetencyEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="Competency Template" description="Scenario, expected competency, model answer, and rubric.">
      <Label title="Scenario" wide>
        <textarea rows={5} value={draft.competencyScenario} onChange={(event) => onChange({ competencyScenario: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Question" wide>
        <textarea rows={4} value={draft.questionText} onChange={(event) => onChange({ questionText: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Expected Competency" wide>
        <input value={draft.competencyExpected} onChange={(event) => onChange({ competencyExpected: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Model Answer" wide>
        <textarea rows={4} value={draft.competencyModelAnswer} onChange={(event) => onChange({ competencyModelAnswer: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Rubric" wide>
        <textarea rows={4} value={draft.competencyRubric} onChange={(event) => onChange({ competencyRubric: event.target.value })} className={fieldClass()} />
      </Label>
    </Section>
  );
}
