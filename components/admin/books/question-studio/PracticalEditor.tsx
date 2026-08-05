"use client";

import {
  Label,
  Section,
  fieldClass,
  type QuestionStudioDraft,
} from "@/components/admin/books/question-studio/shared";

export default function PracticalEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="Practical Template" description="Aim, materials, procedure, observation, conclusion, and assessment questions.">
      <Label title="Aim" wide>
        <textarea rows={3} value={draft.practicalAim} onChange={(event) => onChange({ practicalAim: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Materials Required" wide>
        <textarea rows={3} value={draft.practicalMaterials} onChange={(event) => onChange({ practicalMaterials: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Procedure" wide>
        <textarea rows={5} value={draft.practicalProcedure} onChange={(event) => onChange({ practicalProcedure: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Observation" wide>
        <textarea rows={4} value={draft.practicalObservation} onChange={(event) => onChange({ practicalObservation: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Conclusion" wide>
        <textarea rows={3} value={draft.practicalConclusion} onChange={(event) => onChange({ practicalConclusion: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Assessment Question(s)" wide>
        <textarea rows={4} value={draft.practicalAssessment} onChange={(event) => onChange({ practicalAssessment: event.target.value })} className={fieldClass()} />
      </Label>
    </Section>
  );
}
