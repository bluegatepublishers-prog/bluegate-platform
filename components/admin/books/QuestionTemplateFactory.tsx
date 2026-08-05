"use client";

import MCQEditor from "@/components/admin/books/question-studio/MCQEditor";
import FillBlankEditor from "@/components/admin/books/question-studio/FillBlankEditor";
import TrueFalseEditor from "@/components/admin/books/question-studio/TrueFalseEditor";
import MatchEditor from "@/components/admin/books/question-studio/MatchEditor";
import PictureQuestionEditor from "@/components/admin/books/question-studio/PictureQuestionEditor";
import DiagramQuestionEditor from "@/components/admin/books/question-studio/DiagramQuestionEditor";
import AssertionReasonEditor from "@/components/admin/books/question-studio/AssertionReasonEditor";
import CaseStudyEditor from "@/components/admin/books/question-studio/CaseStudyEditor";
import CompetencyEditor from "@/components/admin/books/question-studio/CompetencyEditor";
import HOTSEditor from "@/components/admin/books/question-studio/HOTSEditor";
import PracticalEditor from "@/components/admin/books/question-studio/PracticalEditor";
import ProjectEditor from "@/components/admin/books/question-studio/ProjectEditor";
import {
  Label,
  Section,
  fieldClass,
  type QuestionStudioDraft,
} from "@/components/admin/books/question-studio/shared";
import {
  LongAnswerEditor,
  OneWordEditor,
  ShortAnswerEditor,
  VeryShortEditor,
} from "@/components/admin/books/question-studio/TextAnswerEditors";

type Lookups = {
  modules: { id: string; title: string }[];
  topics: { id: string; title: string; moduleId: string | null }[];
  outcomes: { id: string; outcome: string; moduleId: string | null; topicId: string | null }[];
  resources: { id: string; title: string; type: string; fileUrl: string; thumbnail: string | null }[];
};

export default function QuestionTemplateFactory({
  draft,
  lookups,
  questionGroups,
  onChange,
}: {
  draft: QuestionStudioDraft;
  lookups: Lookups;
  questionGroups: { id: string; title: string }[];
  onChange: (patch: Partial<QuestionStudioDraft>) => void;
}) {
  return (
    <div className="space-y-4">
      {renderTemplate(draft, onChange)}

      <Section title="Common Question Details" description="Only reusable metadata needed by the current question.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Label title="Marks">
            <input value={draft.marks} onChange={(event) => onChange({ marks: event.target.value })} className={fieldClass()} />
          </Label>
          <Label title="Difficulty">
            <select value={draft.difficulty} onChange={(event) => onChange({ difficulty: event.target.value })} className={fieldClass()}>
              <option value="EASY">EASY</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="DIFFICULT">DIFFICULT</option>
            </select>
          </Label>
          <Label title="Question Group">
            <select value={draft.exerciseGroupId} onChange={(event) => onChange({ exerciseGroupId: event.target.value })} className={fieldClass()}>
              <option value="">No group</option>
              {questionGroups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </Label>
          <Label title="Bloom Level">
            <input value={draft.bloomLevel} onChange={(event) => onChange({ bloomLevel: event.target.value })} className={fieldClass()} />
          </Label>
          <Label title="Competency">
            <input value={draft.competency} onChange={(event) => onChange({ competency: event.target.value })} className={fieldClass()} />
          </Label>
          <Label title="Learning Outcome">
            <select value={draft.learningOutcomeId} onChange={(event) => onChange({ learningOutcomeId: event.target.value })} className={fieldClass()}>
              <option value="">Not set</option>
              {lookups.outcomes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.outcome}
                </option>
              ))}
            </select>
          </Label>
          <Label title="Module">
            <select value={draft.moduleId} onChange={(event) => onChange({ moduleId: event.target.value })} className={fieldClass()}>
              <option value="">Not set</option>
              {lookups.modules.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </Label>
          <Label title="Topic">
            <select value={draft.topicId} onChange={(event) => onChange({ topicId: event.target.value })} className={fieldClass()}>
              <option value="">Not set</option>
              {lookups.topics.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </Label>
          <Label title="Image / Resource">
            <select value={draft.imageResourceId} onChange={(event) => onChange({ imageResourceId: event.target.value })} className={fieldClass()}>
              <option value="">Not set</option>
              {lookups.resources.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </Label>
          <Label title="Tags" wide>
            <input value={draft.tags} onChange={(event) => onChange({ tags: event.target.value })} className={fieldClass()} />
          </Label>
        </div>
      </Section>
    </div>
  );
}

function renderTemplate(
  draft: QuestionStudioDraft,
  onChange: (patch: Partial<QuestionStudioDraft>) => void,
) {
  switch (draft.templateId) {
    case "MCQ":
      return <MCQEditor draft={draft} onChange={onChange} />;
    case "FILL_BLANK":
      return <FillBlankEditor draft={draft} onChange={onChange} />;
    case "TRUE_FALSE":
      return <TrueFalseEditor draft={draft} onChange={onChange} />;
    case "MATCH":
      return <MatchEditor draft={draft} onChange={onChange} />;
    case "ONE_WORD":
      return <OneWordEditor draft={draft} onChange={onChange} />;
    case "VERY_SHORT":
      return <VeryShortEditor draft={draft} onChange={onChange} />;
    case "SHORT":
      return <ShortAnswerEditor draft={draft} onChange={onChange} />;
    case "LONG":
      return <LongAnswerEditor draft={draft} onChange={onChange} />;
    case "PICTURE_BASED":
      return <PictureQuestionEditor draft={draft} onChange={onChange} />;
    case "DIAGRAM":
      return <DiagramQuestionEditor draft={draft} onChange={onChange} />;
    case "ASSERTION_REASON":
      return <AssertionReasonEditor draft={draft} onChange={onChange} />;
    case "CASE_STUDY":
      return <CaseStudyEditor draft={draft} onChange={onChange} />;
    case "COMPETENCY":
      return <CompetencyEditor draft={draft} onChange={onChange} />;
    case "HOTS":
      return <HOTSEditor draft={draft} onChange={onChange} />;
    case "PRACTICAL":
      return <PracticalEditor draft={draft} onChange={onChange} />;
    case "PROJECT":
      return <ProjectEditor draft={draft} onChange={onChange} />;
  }
}
