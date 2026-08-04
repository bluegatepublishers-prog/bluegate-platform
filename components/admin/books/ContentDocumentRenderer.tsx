import StructuredContentRenderer from "@/components/content/StructuredContentRenderer";
import type { ContentDocument } from "@/lib/content-document";
import type { KnowledgeDefinitionSummary } from "@/lib/content-knowledge-types";
import type {
  ContentSectionDefinitionSummary,
  ResolvedLinkedAsset,
} from "@/lib/content-linked-asset-types";
import type { ResolvedMediaBlock } from "@/lib/content-media-types";
import type { ResolvedActivityBlock } from "@/lib/activity-studio-types";
import type { ResolvedWorksheetBlock } from "@/lib/worksheet-studio-types";

export default function ContentDocumentRenderer({
  document,
  className = "",
  linkedAssets = {},
  activities = {},
  worksheets = {},
  media = {},
  sectionDefinitions = [],
  knowledgeDefinitions = {},
}: {
  document: ContentDocument;
  className?: string;
  linkedAssets?: Record<string, ResolvedLinkedAsset | null>;
  activities?: Record<string, ResolvedActivityBlock>;
  worksheets?: Record<string, ResolvedWorksheetBlock>;
  media?: Record<string, ResolvedMediaBlock | null>;
  sectionDefinitions?: ContentSectionDefinitionSummary[];
  knowledgeDefinitions?: Record<string, KnowledgeDefinitionSummary | null>;
}) {
  return (
    <StructuredContentRenderer
      document={document}
      mode="ADMIN_PREVIEW"
      className={className}
      linkedAssets={linkedAssets}
      activities={activities}
      worksheets={worksheets}
      media={media}
      sectionDefinitions={sectionDefinitions}
      knowledgeDefinitions={knowledgeDefinitions}
    />
  );
}
