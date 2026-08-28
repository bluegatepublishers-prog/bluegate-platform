import type {
  StudentImmutableGrounding,
} from "@/lib/ai/types";

const MAX_VOCABULARY_TERMS = 24;
const MAX_TERM_LENGTH = 48;
const MIN_TERM_LENGTH = 4;

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "among",
  "another",
  "because",
  "before",
  "being",
  "between",
  "both",
  "chapter",
  "could",
  "does",
  "each",
  "from",
  "have",
  "into",
  "itself",
  "many",
  "more",
  "most",
  "other",
  "over",
  "same",
  "should",
  "some",
  "such",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "using",
  "very",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
]);

type Candidate = {
  display: string;
  count: number;
  firstIndex: number;
  headingBonus: number;
};

export function extractStudentImmutableVocabulary(
  grounding: StudentImmutableGrounding,
  limit = MAX_VOCABULARY_TERMS,
): string[] {
  if (!Number.isInteger(limit) || limit <= 0) {
    return [];
  }

  const candidates = new Map<
    string,
    Candidate
  >();

  let tokenIndex = 0;

  for (const chunk of grounding.chunks) {
    const headingLike =
      chunk.citation.blockType === "heading" ||
      chunk.citation.blockType === "heading3" ||
      chunk.citation.blockType === "subheading";

    for (const token of tokenize(chunk.text)) {
      const normalized =
        normalizeTerm(token);

      if (!isVocabularyCandidate(normalized)) {
        tokenIndex += 1;
        continue;
      }

      const key =
        normalized.toLocaleLowerCase("en-IN");

      const existing =
        candidates.get(key);

      if (existing) {
        existing.count += 1;

        if (headingLike) {
          existing.headingBonus += 1;
        }
      } else {
        candidates.set(key, {
          display: normalized,
          count: 1,
          firstIndex: tokenIndex,
          headingBonus:
            headingLike ? 1 : 0,
        });
      }

      tokenIndex += 1;
    }
  }

  return [...candidates.values()]
    .filter(
      (candidate) =>
        candidate.count >= 2 ||
        candidate.headingBonus > 0,
    )
    .sort((left, right) => {
      if (
        left.headingBonus !==
        right.headingBonus
      ) {
        return (
          right.headingBonus -
          left.headingBonus
        );
      }

      if (left.count !== right.count) {
        return right.count - left.count;
      }

      return (
        left.firstIndex -
        right.firstIndex
      );
    })
    .slice(
      0,
      Math.min(
        limit,
        MAX_VOCABULARY_TERMS,
      ),
    )
    .map(
      (candidate) =>
        candidate.display,
    );
}

function tokenize(text: string): string[] {
  return text.match(
    /[\p{L}][\p{L}\p{M}'’-]*/gu,
  ) ?? [];
}

function normalizeTerm(
  value: string,
): string {
  return value
    .replace(/^[’'-]+|[’'-]+$/g, "")
    .replace(/[’]/g, "'")
    .trim();
}

function isVocabularyCandidate(
  value: string,
): boolean {
  if (
    value.length < MIN_TERM_LENGTH ||
    value.length > MAX_TERM_LENGTH
  ) {
    return false;
  }

  const lower =
    value.toLocaleLowerCase("en-IN");

  if (STOP_WORDS.has(lower)) {
    return false;
  }

  if (!/\p{L}/u.test(value)) {
    return false;
  }

  /*
   * Reject obvious identifier-like/noisy tokens.
   * Educational terms may contain a normal
   * apostrophe or hyphen, but not repeated
   * punctuation.
   */
  if (/[-']{2,}/.test(value)) {
    return false;
  }

  return true;
}
