export const KNOWLEDGE_REFERENCE_TYPES = ["VOCABULARY", "CONCEPT"] as const;

export type KnowledgeReferenceType = (typeof KNOWLEDGE_REFERENCE_TYPES)[number];

export type KnowledgeReference = {
  id: string;
  type: KnowledgeReferenceType;
  targetId: string;
  label: string;
  start: number;
  end: number;
};

export type KnowledgeDefinitionSummary = {
  id: string;
  type: KnowledgeReferenceType;
  label: string;
  slug: string;
  primaryText: string;
  secondaryText: string | null;
  pronunciation: string | null;
  example: string | null;
  tags: string[];
  bookId: string | null;
  active: boolean;
  published: boolean;
  imageUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  diagramUrl: string | null;
};

export function knowledgeReferenceTypeLabel(type: KnowledgeReferenceType) {
  return type === "VOCABULARY" ? "Vocabulary" : "Concept";
}
