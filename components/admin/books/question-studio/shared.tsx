"use client";

import type { ReactNode } from "react";

export type QuestionTemplateId =
  | "MCQ"
  | "FILL_BLANK"
  | "TRUE_FALSE"
  | "MATCH"
  | "ONE_WORD"
  | "VERY_SHORT"
  | "SHORT"
  | "LONG"
  | "PICTURE_BASED"
  | "DIAGRAM"
  | "ASSERTION_REASON"
  | "CASE_STUDY"
  | "COMPETENCY"
  | "HOTS"
  | "PRACTICAL"
  | "PROJECT";

export type TemplateQuestionKind =
  | "MCQ"
  | "FILL_BLANK"
  | "TRUE_FALSE"
  | "MATCH"
  | "VERY_SHORT"
  | "SHORT"
  | "LONG"
  | "ASSERTION_REASON"
  | "CASE_STUDY"
  | "COMPETENCY"
  | "HOTS"
  | "DIAGRAM"
  | "PRACTICAL"
  | "PROJECT";

export type QuestionPair = {
  left: string;
  right: string;
};

export type CaseStudyPrompt = {
  id: string;
  type: "MCQ" | "SHORT" | "LONG" | "TRUE_FALSE";
  prompt: string;
};

export type QuestionStudioDraft = {
  id: string;
  templateId: QuestionTemplateId;
  questionType: TemplateQuestionKind;
  exerciseGroupId: string;
  moduleId: string;
  topicId: string;
  learningOutcomeId: string;
  imageResourceId: string;
  questionText: string;
  explanation: string;
  marks: string;
  difficulty: string;
  bloomLevel: string;
  competency: string;
  approved: boolean;
  tags: string;
  displayOrder: number;
  mcqOptions: string[];
  mcqCorrectIndex: number;
  acceptedAnswers: string[];
  trueFalseAnswer: "true" | "false";
  matchInstructions: string;
  matchPairs: QuestionPair[];
  oneWordAnswer: string;
  oneWordAlternatives: string[];
  veryShortAnswer: string;
  veryShortKeyPoints: string;
  shortExpectedAnswer: string;
  shortModelAnswer: string;
  shortGuidelines: string;
  longModelAnswer: string;
  longRubric: string;
  longKeywords: string[];
  pictureInstruction: string;
  pictureAnswer: string;
  diagramLabels: string[];
  assertionText: string;
  assertionReason: string;
  assertionOption: "A" | "B" | "C" | "D";
  caseStudyTitle: string;
  caseStudyPassage: string;
  caseStudyQuestions: CaseStudyPrompt[];
  competencyScenario: string;
  competencyExpected: string;
  competencyModelAnswer: string;
  competencyRubric: string;
  hotsSkill: string;
  hotsModelAnswer: string;
  hotsRubric: string;
  practicalAim: string;
  practicalMaterials: string;
  practicalProcedure: string;
  practicalObservation: string;
  practicalConclusion: string;
  practicalAssessment: string;
  projectTitle: string;
  projectObjective: string;
  projectInstructions: string;
  projectSubmission: string;
  projectRubric: string;
};

export type QuestionStudioRecord = {
  id: string;
  exerciseGroupId: string | null;
  moduleId: string | null;
  topicId: string | null;
  learningOutcomeId: string | null;
  imageResourceId: string | null;
  questionType: string;
  questionText: string;
  options: unknown;
  correctAnswer: string | null;
  explanation: string | null;
  marks: number;
  difficulty: string;
  bloomLevel: string | null;
  competency: string | null;
  tags: string[];
  displayOrder: number;
  approved: boolean;
};

export const QUESTION_TEMPLATE_DEFINITIONS: Array<{
  id: QuestionTemplateId;
  label: string;
  description: string;
  questionType: TemplateQuestionKind;
}> = [
  { id: "MCQ", label: "MCQ", description: "Multiple choice question with one correct answer.", questionType: "MCQ" },
  { id: "FILL_BLANK", label: "Fill in the Blanks", description: "Sentence completion with accepted answers.", questionType: "FILL_BLANK" },
  { id: "TRUE_FALSE", label: "True / False", description: "Binary statement check.", questionType: "TRUE_FALSE" },
  { id: "MATCH", label: "Match the Following", description: "Column matching editor.", questionType: "MATCH" },
  { id: "ONE_WORD", label: "One Word Answer", description: "Single-word answer with optional alternatives.", questionType: "VERY_SHORT" },
  { id: "VERY_SHORT", label: "Very Short Answer", description: "Brief answer with key points.", questionType: "VERY_SHORT" },
  { id: "SHORT", label: "Short Answer", description: "Expected answer, model answer, and marking guidance.", questionType: "SHORT" },
  { id: "LONG", label: "Long Answer", description: "Extended response with rubric and keywords.", questionType: "LONG" },
  { id: "PICTURE_BASED", label: "Picture Based", description: "Image-led question with instruction and answer.", questionType: "DIAGRAM" },
  { id: "DIAGRAM", label: "Diagram Based", description: "Diagram question with expected labels.", questionType: "DIAGRAM" },
  { id: "ASSERTION_REASON", label: "Assertion–Reason", description: "Assertion, reason, and A/B/C/D resolution.", questionType: "ASSERTION_REASON" },
  { id: "CASE_STUDY", label: "Case Study", description: "Passage-led question set.", questionType: "CASE_STUDY" },
  { id: "COMPETENCY", label: "Competency Based", description: "Scenario, competency, and rubric.", questionType: "COMPETENCY" },
  { id: "HOTS", label: "HOTS", description: "Higher-order thinking skill prompt.", questionType: "HOTS" },
  { id: "PRACTICAL", label: "Practical", description: "Aim, materials, procedure, and observation flow.", questionType: "PRACTICAL" },
  { id: "PROJECT", label: "Project", description: "Project brief with submission guidance and rubric.", questionType: "PROJECT" },
];

const fieldBase =
  "mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-200";

export function fieldClass(extra = "") {
  return `${fieldBase}${extra ? ` ${extra}` : ""}`;
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl bg-[#fcfaf5] p-3 ring-1 ring-slate-200">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-950">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Label({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`block text-xs font-medium text-slate-700 ${wide ? "lg:col-span-2" : ""}`}>
      {title}
      {children}
    </label>
  );
}

export function HelperText({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium text-slate-500">{children}</p>;
}

export function addStringItem(items: string[]) {
  return [...items, ""];
}

export function updateStringItem(items: string[], index: number, value: string) {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

export function removeStringItem(items: string[], index: number) {
  const next = items.filter((_, itemIndex) => itemIndex !== index);
  return next.length ? next : [""];
}

export function addPairItem(items: QuestionPair[]) {
  return [...items, { left: "", right: "" }];
}

export function updatePairItem(items: QuestionPair[], index: number, patch: Partial<QuestionPair>) {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

export function removePairItem(items: QuestionPair[], index: number) {
  const next = items.filter((_, itemIndex) => itemIndex !== index);
  return next.length ? next : [{ left: "", right: "" }];
}

export function addCasePrompt(items: CaseStudyPrompt[]): CaseStudyPrompt[] {
  return [
    ...items,
    {
      id: stableId("case"),
      type: "SHORT",
      prompt: "",
    },
  ];
}

export function updateCasePrompt(
  items: CaseStudyPrompt[],
  id: string,
  patch: Partial<CaseStudyPrompt>,
): CaseStudyPrompt[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function removeCasePrompt(items: CaseStudyPrompt[], id: string): CaseStudyPrompt[] {
  const next = items.filter((item) => item.id !== id);
  return next.length ? next : [{ id: stableId("case"), type: "SHORT", prompt: "" }];
}

export function stableId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function questionTemplateLabel(id: QuestionTemplateId) {
  return QUESTION_TEMPLATE_DEFINITIONS.find((item) => item.id === id)?.label ?? id;
}

export function defaultQuestionStudioDraft(templateId: QuestionTemplateId, displayOrder: number) {
  const definition = QUESTION_TEMPLATE_DEFINITIONS.find((item) => item.id === templateId) ?? QUESTION_TEMPLATE_DEFINITIONS[0];
  return {
    id: "",
    templateId: definition.id,
    questionType: definition.questionType,
    exerciseGroupId: "",
    moduleId: "",
    topicId: "",
    learningOutcomeId: "",
    imageResourceId: "",
    questionText: "",
    explanation: "",
    marks: "1",
    difficulty: "MEDIUM",
    bloomLevel: "",
    competency: "",
    approved: false,
    tags: "",
    displayOrder,
    mcqOptions: ["", "", "", ""],
    mcqCorrectIndex: 0,
    acceptedAnswers: [""],
    trueFalseAnswer: "true",
    matchInstructions: "",
    matchPairs: [{ left: "", right: "" }, { left: "", right: "" }],
    oneWordAnswer: "",
    oneWordAlternatives: [""],
    veryShortAnswer: "",
    veryShortKeyPoints: "",
    shortExpectedAnswer: "",
    shortModelAnswer: "",
    shortGuidelines: "",
    longModelAnswer: "",
    longRubric: "",
    longKeywords: [""],
    pictureInstruction: "",
    pictureAnswer: "",
    diagramLabels: [""],
    assertionText: "",
    assertionReason: "",
    assertionOption: "A",
    caseStudyTitle: "",
    caseStudyPassage: "",
    caseStudyQuestions: [{ id: stableId("case"), type: "SHORT", prompt: "" }],
    competencyScenario: "",
    competencyExpected: "",
    competencyModelAnswer: "",
    competencyRubric: "",
    hotsSkill: "",
    hotsModelAnswer: "",
    hotsRubric: "",
    practicalAim: "",
    practicalMaterials: "",
    practicalProcedure: "",
    practicalObservation: "",
    practicalConclusion: "",
    practicalAssessment: "",
    projectTitle: "",
    projectObjective: "",
    projectInstructions: "",
    projectSubmission: "",
    projectRubric: "",
  } satisfies QuestionStudioDraft;
}

export function detectTemplateId(question: QuestionStudioRecord): QuestionTemplateId {
  const explicit = question.tags.find((tag) => tag.startsWith("template:"))?.slice("template:".length) ?? "";
  const explicitMatch = QUESTION_TEMPLATE_DEFINITIONS.find((item) => item.id === explicit);
  if (explicitMatch) return explicitMatch.id;
  if (question.questionType === "VERY_SHORT") return "VERY_SHORT";
  return (
    QUESTION_TEMPLATE_DEFINITIONS.find((item) => item.questionType === question.questionType)?.id ??
    "MCQ"
  );
}

export function createDraftFromQuestion(question: QuestionStudioRecord | null, nextDisplayOrder: number) {
  if (!question) return defaultQuestionStudioDraft("MCQ", nextDisplayOrder);

  const templateId = detectTemplateId(question);
  const base = defaultQuestionStudioDraft(templateId, question.displayOrder);
  const stringOptions = getStringOptions(question.options);
  const matchPairs = getMatchPairs(question.options);
  const sections = parseSections(question.explanation ?? "");
  const caseStudyQuestions = stringOptions.length
    ? stringOptions.map((item) => {
        const [type, prompt] = item.includes("::") ? item.split("::", 2) : ["SHORT", item];
        return {
          id: stableId("case"),
          type: normalizeCasePromptType(type),
          prompt,
        };
      })
    : base.caseStudyQuestions;

  return {
    ...base,
    id: question.id,
    templateId,
    questionType: (QUESTION_TEMPLATE_DEFINITIONS.find((item) => item.id === templateId)?.questionType ??
      question.questionType) as TemplateQuestionKind,
    exerciseGroupId: question.exerciseGroupId ?? "",
    moduleId: question.moduleId ?? "",
    topicId: question.topicId ?? "",
    learningOutcomeId: question.learningOutcomeId ?? "",
    imageResourceId: question.imageResourceId ?? "",
    questionText: question.questionText,
    explanation: sections["Explanation"] ?? question.explanation ?? "",
    marks: String(question.marks),
    difficulty: question.difficulty || "MEDIUM",
    bloomLevel: question.bloomLevel ?? "",
    competency: question.competency ?? "",
    approved: question.approved,
    tags: question.tags.filter((tag) => !tag.startsWith("template:")).join(", "),
    displayOrder: question.displayOrder,
    mcqOptions: stringOptions.length ? stringOptions : base.mcqOptions,
    mcqCorrectIndex: Math.max(0, stringOptions.findIndex((item) => item === (question.correctAnswer ?? ""))),
    acceptedAnswers: stringOptions.length ? stringOptions : base.acceptedAnswers,
    trueFalseAnswer: normalizeBooleanAnswer(question.correctAnswer),
    matchInstructions: question.questionText,
    matchPairs: matchPairs.length ? matchPairs : base.matchPairs,
    oneWordAnswer: question.correctAnswer ?? "",
    oneWordAlternatives: stringOptions.length ? stringOptions : base.oneWordAlternatives,
    veryShortAnswer: question.correctAnswer ?? "",
    veryShortKeyPoints: sections["Key Points"] ?? "",
    shortExpectedAnswer: question.correctAnswer ?? "",
    shortModelAnswer: sections["Model Answer"] ?? "",
    shortGuidelines: sections["Marking Guidelines"] ?? "",
    longModelAnswer: question.correctAnswer ?? "",
    longRubric: sections["Marking Rubric"] ?? "",
    longKeywords: stringOptions.length ? stringOptions : base.longKeywords,
    pictureInstruction: sections["Instruction"] ?? "",
    pictureAnswer: question.correctAnswer ?? "",
    diagramLabels: stringOptions.length ? stringOptions : base.diagramLabels,
    assertionText: sections["Assertion"] ?? question.questionText,
    assertionReason: sections["Reason"] ?? "",
    assertionOption: normalizeAssertionOption(question.correctAnswer),
    caseStudyTitle: sections["Case Study Title"] ?? "",
    caseStudyPassage: sections["Case Study Passage"] ?? question.questionText,
    caseStudyQuestions,
    competencyScenario: sections["Scenario"] ?? question.questionText,
    competencyExpected: sections["Expected Competency"] ?? "",
    competencyModelAnswer: question.correctAnswer ?? "",
    competencyRubric: sections["Rubric"] ?? "",
    hotsSkill: sections["Expected Thinking Skill"] ?? "",
    hotsModelAnswer: question.correctAnswer ?? "",
    hotsRubric: sections["Rubric"] ?? "",
    practicalAim: sections["Aim"] ?? "",
    practicalMaterials: sections["Materials Required"] ?? "",
    practicalProcedure: sections["Procedure"] ?? "",
    practicalObservation: sections["Observation"] ?? "",
    practicalConclusion: sections["Conclusion"] ?? "",
    practicalAssessment: sections["Assessment Questions"] ?? "",
    projectTitle: sections["Project Title"] ?? question.questionText,
    projectObjective: sections["Objective"] ?? "",
    projectInstructions: sections["Instructions"] ?? "",
    projectSubmission: sections["Submission Guidelines"] ?? "",
    projectRubric: sections["Rubric"] ?? "",
  } satisfies QuestionStudioDraft;
}

function parseSections(value: string) {
  const sections: Record<string, string> = {};
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) return sections;
  const pattern = /^([A-Za-z][A-Za-z /()-]+):\n([\s\S]*?)(?=^\S.*:\n|\Z)/gm;
  let match = pattern.exec(normalized);
  while (match) {
    sections[match[1].trim()] = match[2].trim();
    match = pattern.exec(normalized);
  }
  return sections;
}

function getStringOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function getMatchPairs(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const left = "left" in item ? String(item.left ?? "") : "";
      const right = "right" in item ? String(item.right ?? "") : "";
      return left || right ? { left, right } : null;
    })
    .filter((item): item is QuestionPair => Boolean(item));
}

function normalizeCasePromptType(value: string): CaseStudyPrompt["type"] {
  return ["MCQ", "SHORT", "LONG", "TRUE_FALSE"].includes(value) ? (value as CaseStudyPrompt["type"]) : "SHORT";
}

function normalizeBooleanAnswer(value: string | null) {
  return String(value ?? "").trim().toLowerCase() === "false" ? "false" : "true";
}

function normalizeAssertionOption(value: string | null): "A" | "B" | "C" | "D" {
  return ["A", "B", "C", "D"].includes(String(value ?? "").trim()) ? (value as "A" | "B" | "C" | "D") : "A";
}
