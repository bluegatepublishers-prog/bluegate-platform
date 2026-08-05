"use client";

import {
  HelperText,
  Label,
  Section,
  fieldClass,
  type QuestionStudioDraft,
} from "@/components/admin/books/question-studio/shared";

export default function PictureQuestionEditor({
  draft,
  onChange,
}: {
  draft: QuestionStudioDraft;
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <Section title="Picture Based Template" description="Image selection at the top, then instruction, question, and answer.">
      <HelperText>Choose the question image from the common metadata panel below the manuscript fields. The prompt itself stays picture-first.</HelperText>
      <Label title="Instruction" wide>
        <textarea rows={3} value={draft.pictureInstruction} onChange={(event) => onChange({ pictureInstruction: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Question" wide>
        <textarea rows={4} value={draft.questionText} onChange={(event) => onChange({ questionText: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Answer" wide>
        <textarea rows={4} value={draft.pictureAnswer} onChange={(event) => onChange({ pictureAnswer: event.target.value })} className={fieldClass()} />
      </Label>
      <Label title="Explanation" wide>
        <textarea rows={4} value={draft.explanation} onChange={(event) => onChange({ explanation: event.target.value })} className={fieldClass()} />
      </Label>
    </Section>
  );
}
