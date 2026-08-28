
import type {
  ContentBlock,
  ContentDocument,
} from "@/lib/content-document";

export type SmartBookAiAudience = "STUDENT" | "TEACHER";

export type SmartBookAiTextChunk = {
  id: string;
  blockId: string;
  blockType: ContentBlock["type"];
  text: string;
};

export type SmartBookAiDocument = {
  audience: SmartBookAiAudience;
  chunks: SmartBookAiTextChunk[];
  text: string;
};

const MAX_CHUNK_CHARACTERS = 4_000;
const MAX_DOCUMENT_CHARACTERS = 40_000;

export function extractSmartBookAiDocument(
  document: ContentDocument,
  audience: SmartBookAiAudience,
): SmartBookAiDocument {
  const chunks: SmartBookAiTextChunk[] = [];

  for (const block of document.blocks) {
    if (block.hidden) continue;

    const text = extractBlockText(block);
    if (!text) continue;

    chunks.push({
      id: `${block.type}:${block.id}`,
      blockId: block.id,
      blockType: block.type,
      text: limitText(text, MAX_CHUNK_CHARACTERS),
    });
  }

  const boundedChunks: SmartBookAiTextChunk[] = [];
  let remaining = MAX_DOCUMENT_CHARACTERS;

  for (const chunk of chunks) {
    if (remaining <= 0) break;

    const text = limitText(chunk.text, remaining);
    if (!text) continue;

    boundedChunks.push({
      ...chunk,
      text,
    });

    remaining -= text.length;
  }

  return {
    audience,
    chunks: boundedChunks,
    text: boundedChunks
      .map((chunk) => chunk.text)
      .join("\n\n")
      .trim(),
  };
}

function extractBlockText(block: ContentBlock): string {
  switch (block.type) {
    case "heading":
    case "heading3":
    case "subheading":
    case "paragraph":
    case "caption":
    case "quote":
    case "callout":
      return joinText(block.title, block.text, block.attribution);

    case "educationalObject":
      return joinText(block.title, block.text);

    case "bulletList":
    case "numberedList":
      return joinText(
        block.title,
        block.items.map((item) => cleanText(item)).filter(Boolean).join("\n"),
      );

    case "table":
    case "comparisonTable":
      return joinText(
        block.title,
        block.rows
          .map((row) =>
            row.cells
              .map((cell) => cleanText(cell.text))
              .filter(Boolean)
              .join(" | "),
          )
          .filter(Boolean)
          .join("\n"),
      );

    case "formula":
      return joinText(block.title, block.expression);

    case "infoBox":
    case "observationBox":
      return joinText(block.title, block.text);

    case "timeline":
    case "processFlow":
    case "stepList":
      return joinText(
        block.title,
        block.items
          .map((item) => joinText(item.title, item.description))
          .filter(Boolean)
          .join("\n"),
      );

    case "image":
    case "diagram":
      return joinText(block.title, block.alt, block.caption);

    case "imageGallery":
      return joinText(
        block.title,
        block.images
          .map((image) => joinText(image.alt, image.caption))
          .filter(Boolean)
          .join("\n"),
      );

    case "activity":
      return joinText(
        block.title,
        block.fields
          .map((field) => extractSafeRecordText(field))
          .filter(Boolean)
          .join("\n"),
      );

    /*
     * Worksheet/exercise blocks may contain questions and assessment-like
     * material. Their Student-safe projection removes protected answers,
     * but T12B retrieval should not silently turn active work into an
     * answer-generation source.
     *
     * We therefore exclude these blocks from the initial AI knowledge
     * projection. They can later be handled by the dedicated protected-work
     * policy.
     */
    case "worksheet":
    case "exercise":
      return "";

    case "linkedAsset":
  return joinText(block.title, block.label);

case "media":
  return joinText(block.title, block.label, block.caption);

    case "divider":
    case "mindMap":
    case "flowChart":
      return cleanText(block.title ?? "");

    default:
      return "";
  }
}

function extractSafeRecordText(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const record = value as Record<string, unknown>;

  /*
   * Deliberately allow-list descriptive/instructional fields.
   * Never recursively serialize arbitrary objects into an AI prompt.
   */
  const allowedKeys = [
    "title",
    "label",
    "text",
    "description",
    "instructions",
    "objective",
    "prompt",
    "studentInstructions",
    "expectedLearning",
  ] as const;

  return allowedKeys
    .map((key) => {
      const candidate = record[key];
      return typeof candidate === "string" ? cleanText(candidate) : "";
    })
    .filter(Boolean)
    .join("\n");
}

function joinText(
  ...values: Array<string | null | undefined>
): string {
  return values
    .map((value) => cleanText(value ?? ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function cleanText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function limitText(value: string, maximum: number): string {
  const text = cleanText(value);

  if (!text || maximum <= 0) return "";
  if (text.length <= maximum) return text;

  return text.slice(0, maximum).trimEnd();
}
