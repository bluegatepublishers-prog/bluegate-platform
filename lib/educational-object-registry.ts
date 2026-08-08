export const EDUCATIONAL_OBJECT_REGISTRY = [
  ["learningOutcome", "Learning Outcome", "Learning outcome", "target"],
  ["learningObjective", "Learning Objective", "Learning objective", "target"],
  ["didYouKnow", "Do You Know?", "Do You Know?", "didYouKnow"],
  ["thinkAndDiscuss", "Think and Discuss", "Think and Discuss", "thinkAndDiscuss"],
  ["thinkAndAnswer", "Think and Answer", "Think and Answer", "thinkAndAnswer"],
  ["thinkAndWrite", "Think and Write", "Think and Write", "reflection"],
  ["remember", "Remember", "Remember", "remember"],
  ["keyPoint", "Key Point", "Key Point", "important"],
  ["factBox", "Fact Box", "Fact Box", "tip"],
  ["example", "Example", "Example", "example"],
  ["vocabulary", "Vocabulary / Keywords", "Vocabulary", "summary"],
  ["caseStudy", "Case Study", "Case Study", "caseStudy"],
  ["competencyQuestion", "Competency Question", "Competency Question", "competencyCheck"],
  ["hots", "HOTS", "HOTS", "important"],
  ["lifeSkill", "Life Skill", "Life Skill", "lifeSkill"],
  ["teacherNote", "Teacher Note", "Teacher Note", "teacherTip"],
] as const;

export type EducationalObjectType = (typeof EDUCATIONAL_OBJECT_REGISTRY)[number][0];

export const EDUCATIONAL_OBJECT_PLACEHOLDERS: Record<EducationalObjectType, string> = {
  learningOutcome: "Type learning outcome here...",
  learningObjective: "Type learning objective here...",
  didYouKnow: "Type an interesting fact here...",
  thinkAndDiscuss: "Type discussion prompt here...",
  thinkAndAnswer: "Type question here...",
  thinkAndWrite: "Type writing prompt here...",
  remember: "Type important reminder here...",
  keyPoint: "Type key point here...",
  factBox: "Type fact here...",
  example: "Type example here...",
  vocabulary: "Add key terms here...",
  caseStudy: "Type case study here...",
  competencyQuestion: "Type competency-based question here...",
  hots: "Type higher-order thinking question here...",
  lifeSkill: "Type life-skill connection here...",
  teacherNote: "Type teacher note here...",
};

export type EducationalObjectDefinition = {
  type: EducationalObjectType;
  label: string;
  defaultTitle: string;
  defaultPlaceholder: string;
  appearanceVariant: string;
  icon?: string;
  defaultWidth: number;
  defaultHeight: number;
};

export function getEducationalObjectDefinition(type: EducationalObjectType): EducationalObjectDefinition {
  const row = EDUCATIONAL_OBJECT_REGISTRY.find((entry) => entry[0] === type) ?? EDUCATIONAL_OBJECT_REGISTRY[0];
  return {
    type: row[0], label: row[1], defaultTitle: row[2],
    defaultPlaceholder: EDUCATIONAL_OBJECT_PLACEHOLDERS[row[0]],
    appearanceVariant: row[3], defaultWidth: 520, defaultHeight: 180,
  };
}

export function getEducationalObjectPlaceholder(type: EducationalObjectType) {
  return EDUCATIONAL_OBJECT_PLACEHOLDERS[type];
}

export function isEducationalObjectType(value: unknown): value is EducationalObjectType {
  return EDUCATIONAL_OBJECT_REGISTRY.some((entry) => entry[0] === value);
}
