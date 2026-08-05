"use client";

import {
  Label,
  Section,
  fieldClass,
  type QuestionStudioDraft,
} from "@/components/admin/books/question-studio/shared";

export default function ProjectEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="Project Template" description="Project title, objective, instructions, submission guide, and rubric.">
      <Label title="Project Title" wide>
        <input value={draft.projectTitle} onChange={(event) => onChange({ projectTitle: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Objective" wide>
        <textarea rows={3} value={draft.projectObjective} onChange={(event) => onChange({ projectObjective: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Instructions" wide>
        <textarea rows={5} value={draft.projectInstructions} onChange={(event) => onChange({ projectInstructions: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Submission Guidelines" wide>
        <textarea rows={4} value={draft.projectSubmission} onChange={(event) => onChange({ projectSubmission: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Rubric" wide>
        <textarea rows={4} value={draft.projectRubric} onChange={(event) => onChange({ projectRubric: event.target.value })} className={fieldClass()} />
      </Label>
    </Section>
  );
}
