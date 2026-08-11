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
  icon: string;
  description: string;
  theme: EducationalObjectTheme;
  defaultWidth: number;
  defaultHeight: number;
};

export type EducationalObjectTheme = {
  accent: string;
  tint: string;
  border: string;
};

const EDUCATIONAL_OBJECT_THEMES: Record<EducationalObjectType, Pick<EducationalObjectDefinition, "icon" | "description" | "theme">> = {
  learningOutcome: { icon: "◎", description: "State what learners should achieve.", theme: { accent: "#4338ca", tint: "#eef2ff", border: "#a5b4fc" } },
  learningObjective: { icon: "◉", description: "Set a clear learning objective.", theme: { accent: "#3730a3", tint: "#eef2ff", border: "#c7d2fe" } },
  didYouKnow: { icon: "✦", description: "Share a concise supporting fact.", theme: { accent: "#0e7490", tint: "#ecfeff", border: "#67e8f9" } },
  thinkAndDiscuss: { icon: "💬", description: "Invite a discussion prompt.", theme: { accent: "#6d28d9", tint: "#f5f3ff", border: "#c4b5fd" } },
  thinkAndAnswer: { icon: "?", description: "Ask learners to reason and respond.", theme: { accent: "#7c3aed", tint: "#f5f3ff", border: "#ddd6fe" } },
  thinkAndWrite: { icon: "✎", description: "Guide a short written reflection.", theme: { accent: "#7c3aed", tint: "#f5f3ff", border: "#ddd6fe" } },
  remember: { icon: "▮", description: "Highlight an important point to retain.", theme: { accent: "#c2410c", tint: "#fff7ed", border: "#fdba74" } },
  keyPoint: { icon: "◆", description: "Emphasize the key idea on this page.", theme: { accent: "#b45309", tint: "#fffbeb", border: "#fcd34d" } },
  factBox: { icon: "i", description: "Present a useful fact or tip.", theme: { accent: "#0369a1", tint: "#f0f9ff", border: "#7dd3fc" } },
  example: { icon: "✓", description: "Work through a representative example.", theme: { accent: "#15803d", tint: "#f0fdf4", border: "#86efac" } },
  vocabulary: { icon: "Aa", description: "Introduce important vocabulary.", theme: { accent: "#0f766e", tint: "#f0fdfa", border: "#99f6e4" } },
  caseStudy: { icon: "▣", description: "Explore a contextual case.", theme: { accent: "#155e75", tint: "#ecfeff", border: "#a5f3fc" } },
  competencyQuestion: { icon: "✓", description: "Check applied understanding.", theme: { accent: "#a16207", tint: "#fefce8", border: "#fde68a" } },
  hots: { icon: "↗", description: "Prompt higher-order thinking.", theme: { accent: "#9d174d", tint: "#fdf2f8", border: "#f9a8d4" } },
  lifeSkill: { icon: "✦", description: "Connect learning to life skills.", theme: { accent: "#0369a1", tint: "#eff6ff", border: "#93c5fd" } },
  teacherNote: { icon: "✎", description: "Add a teacher-facing note.", theme: { accent: "#475569", tint: "#f8fafc", border: "#cbd5e1" } },
};

export function getEducationalObjectDefinition(type: EducationalObjectType): EducationalObjectDefinition {
  const row = EDUCATIONAL_OBJECT_REGISTRY.find((entry) => entry[0] === type) ?? EDUCATIONAL_OBJECT_REGISTRY[0];
  const theme = EDUCATIONAL_OBJECT_THEMES[row[0]];
  return {
    type: row[0], label: row[1], defaultTitle: row[2],
    defaultPlaceholder: EDUCATIONAL_OBJECT_PLACEHOLDERS[row[0]],
    appearanceVariant: row[3], ...theme, defaultWidth: 520, defaultHeight: 180,
  };
}

export function getEducationalObjectTheme(type: EducationalObjectType) {
  return EDUCATIONAL_OBJECT_THEMES[type];
}

export function getEducationalObjectPlaceholder(type: EducationalObjectType) {
  return EDUCATIONAL_OBJECT_PLACEHOLDERS[type];
}

export function isEducationalObjectType(value: unknown): value is EducationalObjectType {
  return EDUCATIONAL_OBJECT_REGISTRY.some((entry) => entry[0] === value);
}
