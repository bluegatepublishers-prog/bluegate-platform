export const EDUCATIONAL_OBJECT_REGISTRY = [
  ["learningOutcome", "Learning Outcome", "Learning outcome", "target"],
  ["learningObjective", "Learning Objective", "Learning objective", "target"],
  ["didYouKnow", "Do You Know?", "Do You Know?", "didYouKnow"],
  ["thinkAndDiscuss", "Think and Discuss", "Think and Discuss", "thinkAndDiscuss"],
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

export type EducationalObjectDefinition = {
  type: EducationalObjectType;
  label: string;
  defaultTitle: string;
  appearanceVariant: string;
  icon?: string;
  defaultWidth: number;
  defaultHeight: number;
};

export function getEducationalObjectDefinition(type: EducationalObjectType): EducationalObjectDefinition {
  const row = EDUCATIONAL_OBJECT_REGISTRY.find((entry) => entry[0] === type) ?? EDUCATIONAL_OBJECT_REGISTRY[0];
  return {
    type: row[0], label: row[1], defaultTitle: row[2], appearanceVariant: row[3],
    defaultWidth: 520, defaultHeight: 180,
  };
}

export function isEducationalObjectType(value: unknown): value is EducationalObjectType {
  return EDUCATIONAL_OBJECT_REGISTRY.some((entry) => entry[0] === value);
}
