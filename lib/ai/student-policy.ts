export const STUDENT_AI_INTENTS = [
  "EXPLAIN_CONCEPT",
  "SIMPLIFY_TOPIC",
  "REAL_LIFE_EXAMPLE",
  "REVISION_SUMMARY",
  "VOCABULARY_HELP",
  "ASK_ME_QUESTIONS",
  "DOUBT_SOLVER",
  "EXPLAIN_IN_HINDI",
] as const;

export type StudentAiIntentValue =
  (typeof STUDENT_AI_INTENTS)[number];

export type StudentAiPlan =
  | "SCHOOL_BASIC"
  | "SCHOOL_PREMIUM"
  | "INDIVIDUAL_PREMIUM"
  | "INDIVIDUAL_PREMIUM_MENTOR";

export type StudentAiIntentMetadata = {
  label: string;
  description: string;
  freeTextAllowed: boolean;
  maxInputLength: number;
  scope: "SELECTION" | "KEYWORD" | "CHAPTER" | "DOUBT";
  style: string;
};

export const STUDENT_AI_INTENT_METADATA: Record<
  StudentAiIntentValue,
  StudentAiIntentMetadata
> = {
  EXPLAIN_CONCEPT: {
    label: "Explain Concept",
    description:
      "Understand one released chapter concept step by step.",
    freeTextAllowed: false,
    maxInputLength: 160,
    scope: "SELECTION",
    style:
      "Explain in simple steps using only the supplied released chapter knowledge.",
  },

  SIMPLIFY_TOPIC: {
    label: "Simplify Topic",
    description:
      "Read a simpler explanation without losing academic meaning.",
    freeTextAllowed: false,
    maxInputLength: 160,
    scope: "SELECTION",
    style:
      "Use short age-appropriate sentences while preserving important meaning.",
  },

  REAL_LIFE_EXAMPLE: {
    label: "Real Life Example",
    description:
      "Connect a released chapter concept to a supported example.",
    freeTextAllowed: false,
    maxInputLength: 160,
    scope: "SELECTION",
    style:
      "Give an example only when the supplied released chapter knowledge supports it.",
  },

  REVISION_SUMMARY: {
    label: "Revision",
    description:
      "Create a short recap from this released chapter.",
    freeTextAllowed: false,
    maxInputLength: 0,
    scope: "CHAPTER",
    style:
      "Create a concise revision summary using only the supplied released chapter knowledge.",
  },

  VOCABULARY_HELP: {
    label: "Vocabulary",
    description:
      "Understand a vocabulary term supplied by this released chapter.",
    freeTextAllowed: false,
    maxInputLength: 120,
    scope: "KEYWORD",
    style:
      "Explain only the selected vocabulary term in the supplied chapter context.",
  },

  ASK_ME_QUESTIONS: {
    label: "Ask Me Questions",
    description:
      "Get a small set of self-check questions from this chapter.",
    freeTextAllowed: false,
    maxInputLength: 0,
    scope: "CHAPTER",
    style:
      "Ask up to three short questions based only on the supplied released chapter knowledge and do not include their answers.",
  },

  DOUBT_SOLVER: {
    label: "I Have a Doubt",
    description:
      "Ask a short question limited to this chapter.",
    freeTextAllowed: true,
    maxInputLength: 500,
    scope: "DOUBT",
    style:
      "Answer the chapter-related doubt directly in short paragraphs using only the supplied released chapter knowledge.",
  },

  EXPLAIN_IN_HINDI: {
    label: "Explain in Hindi",
    description:
      "Understand a released chapter concept in simple Hindi.",
    freeTextAllowed: false,
    maxInputLength: 160,
    scope: "SELECTION",
    style:
      "Answer in simple Hindi and retain commonly used English academic terms only when helpful.",
  },
};

export const STUDENT_AI_SAFE_REFUSAL =
  "I can help only with your learning materials for this chapter.";

export const STUDENT_AI_UNAVAILABLE =
  "This learning assistant is not available for this chapter.";

export const STUDENT_AI_TEMPORARY_FAILURE =
  "The learning assistant is temporarily unavailable. Please try again.";

export const STUDENT_AI_DAILY_LIMITS: Record<
  StudentAiPlan,
  number
> = {
  SCHOOL_BASIC: 0,
  SCHOOL_PREMIUM: 10,
  INDIVIDUAL_PREMIUM: 25,
  INDIVIDUAL_PREMIUM_MENTOR: 40,
};

export type ParsedStudentAiInput = {
  requestId: string;
  intent: StudentAiIntentValue;
  reference: string | null;
  question: string | null;
};

export function parseStudentAiInput(
  value: unknown,
):
  | { ok: true; value: ParsedStudentAiInput }
  | { ok: false } {
  if (!isRecord(value)) {
    return { ok: false };
  }

  const intent =
    typeof value.intent === "string"
      ? value.intent
      : "";

  if (
    !STUDENT_AI_INTENTS.includes(
      intent as StudentAiIntentValue,
    )
  ) {
    return { ok: false };
  }

  const metadata =
    STUDENT_AI_INTENT_METADATA[
      intent as StudentAiIntentValue
    ];

  const requestId =
    typeof value.requestId === "string"
      ? value.requestId.trim()
      : "";

  if (
    !/^[a-zA-Z0-9_-]{16,80}$/.test(
      requestId,
    )
  ) {
    return { ok: false };
  }

  const reference =
    typeof value.reference === "string"
      ? clean(value.reference)
      : "";

  const question =
    typeof value.question === "string"
      ? clean(value.question)
      : "";

  if (metadata.scope === "DOUBT") {
    if (
      !question ||
      question.length >
        metadata.maxInputLength ||
      reference
    ) {
      return { ok: false };
    }
  } else if (
    metadata.scope === "SELECTION" ||
    metadata.scope === "KEYWORD"
  ) {
    if (
      !reference ||
      reference.length >
        metadata.maxInputLength ||
      question
    ) {
      return { ok: false };
    }
  } else if (reference || question) {
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      requestId,
      intent:
        intent as StudentAiIntentValue,
      reference: reference || null,
      question: question || null,
    },
  };
}

export function validateStudentAiReference(
  input: ParsedStudentAiInput,
  selections: readonly string[],
  keywords: readonly string[],
) {
  if (!input.reference) {
    return true;
  }

  const allowed =
    input.intent === "VOCABULARY_HELP"
      ? keywords
      : selections;

  const normalized =
    normalize(input.reference);

  return allowed.some(
    (item) =>
      normalize(item) === normalized,
  );
}

export type StudentAiRefusalReasonValue =
  | "OUT_OF_SCOPE"
  | "UNSAFE"
  | "INSUFFICIENT_GROUNDING";

/*
 * Deterministic safety is intentionally about the AI boundary,
 * not about academic subject names.
 *
 * Politics, religion, programming, medicine, law and other legitimate
 * school subjects are not automatically unsafe. They remain usable only
 * when the authenticated Student's exact immutable chapter grounding
 * supports the question.
 *
 * These patterns protect against requests that attempt to escape the
 * bounded Smart Book experience or expose internal AI/system details.
 */
const UNSAFE_PATTERNS = [
  /\b(system prompt|developer message|developer prompt|hidden prompt|internal prompt)\b/i,
  /\b(ignore|disregard|override|bypass)\b.{0,40}\b(rules|instructions|prompt|policy|restrictions)\b/i,
  /\b(api key|secret key|access token|auth token|password|credentials?)\b/i,
  /\b(openai|chatgpt|gpt-[\w.-]+|provider|model name|provider payload)\b/i,
  /\b(another|other) publisher(?:'s)?\b/i,
  /\b(search|browse|open|visit|fetch|read)\b.{0,30}\b(web|website|internet|url|link)\b/i,
  /https?:\/\/|www\./i,
];

export function getDeterministicStudentAiRefusal(
  input: {
    question: string;
    chapterNumber: number;
    groundingTerms: readonly string[];
    hasHistory: boolean;
  },
): StudentAiRefusalReasonValue | null {
  if (
    UNSAFE_PATTERNS.some((pattern) =>
      pattern.test(input.question),
    )
  ) {
    return "UNSAFE";
  }

  const mentionedChapters = [
    ...input.question.matchAll(
      /\bchapter\s+(\d+)\b/gi,
    ),
  ].map((match) => Number(match[1]));

  if (
    mentionedChapters.some(
      (chapter) =>
        chapter !== input.chapterNumber,
    )
  ) {
    return "OUT_OF_SCOPE";
  }

  /*
   * Scope is grounded in the exact immutable STUDENT-safe chapter
   * extraction supplied by the server. Subject categories themselves
   * are never used as an allow/deny list.
   */
  const questionTokens =
    meaningfulTokens(input.question);

  const groundingTokens = new Set(
    input.groundingTerms.flatMap(
      meaningfulTokens,
    ),
  );

  const overlaps =
    questionTokens.some((token) =>
      groundingTokens.has(token),
    );

  /*
   * A follow-up may use pronouns such as "that" or "it" and therefore
   * have little lexical overlap. Existing chapter-scoped conversation
   * history provides the bounded context for such a follow-up.
   */
  if (!overlaps && !input.hasHistory) {
    return "OUT_OF_SCOPE";
  }

  return null;
}

export type StudentAiValidatedResponse = {
  answer: string;
  followUpPrompts: string[];
  refused: boolean;
  refusalReason:
    | StudentAiRefusalReasonValue
    | null;
};

export function validateStudentAiProviderContent(
  content: string,
):
  | {
      ok: true;
      value: StudentAiValidatedResponse;
    }
  | { ok: false } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false };
  }

  if (
    !isRecord(parsed) ||
    typeof parsed.refused !== "boolean"
  ) {
    return { ok: false };
  }

  const answer =
    typeof parsed.answer === "string"
      ? clean(parsed.answer)
      : "";

  const prompts = Array.isArray(
    parsed.followUpPrompts,
  )
    ? parsed.followUpPrompts
        .filter(
          (item): item is string =>
            typeof item === "string",
        )
        .map(clean)
    : [];

  const reason =
    parsed.refusalReason;

  const validReason =
    reason === null ||
    reason === "OUT_OF_SCOPE" ||
    reason === "UNSAFE" ||
    reason ===
      "INSUFFICIENT_GROUNDING";

  if (
    !validReason ||
    prompts.length > 3 ||
    prompts.some(
      (item) =>
        !item || item.length > 160,
    )
  ) {
    return { ok: false };
  }

  if (parsed.refused) {
    if (reason === null) {
      return { ok: false };
    }

    return {
      ok: true,
      value: {
        answer:
          STUDENT_AI_SAFE_REFUSAL,
        followUpPrompts: [],
        refused: true,
        refusalReason: reason,
      },
    };
  }

  if (
    !answer ||
    answer.length > 4000 ||
    reason !== null
  ) {
    return { ok: false };
  }

  if (
    [answer, ...prompts].some(
      containsUnsafeOutput,
    )
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      answer,
      followUpPrompts: [
        ...new Set(prompts),
      ],
      refused: false,
      refusalReason: null,
    },
  };
}

export function getStudentAiDisplayQuestion(
  input: ParsedStudentAiInput,
) {
  if (input.question) {
    return input.question;
  }

  const label =
    STUDENT_AI_INTENT_METADATA[
      input.intent
    ].label;

  return input.reference
    ? `${label}: ${input.reference}`
    : label;
}

function containsUnsafeOutput(
  value: string,
) {
  return (
    /https?:\/\/|www\.|<\/?[a-z][^>]*>|\b(system prompt|developer message|api key|openai|gpt-[\w.-]+|provider payload|storageurl|s3:\/\/|blob\.vercel-storage\.com)\b/i.test(
      value,
    ) ||
    /\bc[a-z0-9]{20,}\b/i.test(value)
  );
}

function meaningfulTokens(
  value: string,
) {
  const stop = new Set([
    "about",
    "after",
    "again",
    "also",
    "because",
    "chapter",
    "could",
    "does",
    "explain",
    "from",
    "have",
    "help",
    "into",
    "please",
    "tell",
    "that",
    "their",
    "there",
    "these",
    "this",
    "what",
    "when",
    "where",
    "which",
    "with",
    "would",
    "your",
  ]);

  return normalize(value)
    .split(" ")
    .filter(
      (token) =>
        token.length >= 3 &&
        !stop.has(token),
    );
}

function clean(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function normalize(value: string) {
  return clean(value)
    .toLocaleLowerCase("en")
    .replace(
      /[^\p{L}\p{N}]+/gu,
      " ",
    )
    .trim();
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}
