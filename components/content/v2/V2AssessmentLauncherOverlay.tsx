"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { V2PracticeQuestionType } from "@/lib/v2-assessment-launcher";
import { normalizeV2PracticeQuestionType, v2PracticeQuestionLabel } from "@/lib/v2-assessment-launcher";

import { InteractiveQuestionRenderer } from "@/components/questions/InteractiveQuestionRenderer";

import {
  adaptBookQuestion,
  getBookQuestionPracticeMode,
  type InteractiveQuestion,
  type NormalizedQuestion,
} from "@/lib/normalized-question";

import {
  evaluateObjectiveQuestionResponse,
} from "@/lib/question-response-evaluator";

export type V2AssessmentLauncherOverlayMode =
  | "STUDENT"
  | "TEACHER"
  | "PREVIEW";

type RuntimeOption = {
  value: string;
  text: string;
};

type RuntimeFeedback = {
  correct: boolean | null;
  correctAnswer?: string | null;
  explanation?: string | null;
};

type RuntimeQuestion = {
  questionId: string;
  questionType: V2PracticeQuestionType;
  questionText: string;
  options: RuntimeOption[];
  interactiveQuestion: InteractiveQuestion;
  marks: number;
  answered: boolean;
  studentAnswer: unknown;
  feedback: RuntimeFeedback | null;
  correctAnswer?: string | null;
  previewQuestion?: NormalizedQuestion;
  acceptedAnswers?: string[];
};

type Props = {
  exerciseId: string;
  groupId: string;
  questionType: V2PracticeQuestionType;
  questionIds?: string[];
  mode: V2AssessmentLauncherOverlayMode;
  onClose: () => void;
  onRetry?: () => void;
};

type LauncherResponse = {
  ok?: boolean;
  message?: string;
  attemptId?: string;

  attempt?: {
    id?: string;
    status?: string;

    questions?: Array<{
      questionId: string;
      questionType?: string;
      questionText: string;
      options: string[];
      marks: number;
      interactiveQuestion: InteractiveQuestion;
      answered: boolean;
      studentAnswer: unknown;
      feedback: RuntimeFeedback | null;
    }>;
  };

  questions?: Array<{
    id: string;
    questionType?: string;
    questionText: string;
    options: unknown;
    marks: number;
    correctAnswer?: string | null;
    explanation?: string | null;
  }>;
};

export default function V2AssessmentLauncherOverlay({
  exerciseId,
  groupId,
  questionType,
  questionIds = [],
  mode,
  onClose,
  onRetry,
}: Props) {
  const titleId = useId();

  const closeRef =
    useRef<HTMLButtonElement>(null);

  const [questions, setQuestions] =
    useState<RuntimeQuestion[]>([]);

  const [answers, setAnswers] =
    useState<Record<string, unknown>>(
      {},
    );

  const [attemptId, setAttemptId] =
    useState("");

  const [submitted, setSubmitted] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState("");

  /*
   * Publisher Preview and Teacher Preview are
   * read-only server-data modes.
   *
   * Neither mode creates StudentPracticeAttempt.
   */
  const previewMode =
    mode === "PREVIEW" ||
    mode === "TEACHER";

  const selectedIds = useMemo(
    () => [
      ...new Set(
        questionIds
          .map((id) =>
            id.trim(),
          )
          .filter(Boolean),
      ),
    ],
    [questionIds],
  );

  const label =
    v2PracticeQuestionLabel(
      questionType,
    );

  useEffect(() => {
    const previousOverflow =
      globalThis.document.body.style
        .overflow;

    globalThis.document.body.style
      .overflow = "hidden";

    closeRef.current?.focus();

    const onKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    };

    globalThis.document.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () => {
      globalThis.document.removeEventListener(
        "keydown",
        onKeyDown,
      );

      globalThis.document.body.style
        .overflow =
        previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setMessage("");
    setSubmitted(false);
    setAnswers({});
    setAttemptId("");

    const previewEndpoint =
      mode === "TEACHER"
        ? "/api/teacher/book-questions/preview"
        : "/api/admin/book-questions/preview";

    const request =
      previewMode
        ? fetch(
            `${previewEndpoint}?exerciseId=${encodeURIComponent(
              exerciseId,
            )}&groupId=${encodeURIComponent(
              groupId,
            )}&questionType=${encodeURIComponent(questionType)}&questionIds=${encodeURIComponent(selectedIds.join(","))}`,
            {
              cache:
                "no-store",
            },
          )
        : fetch(
            "/api/student/practice/launcher",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    exerciseId,
                    groupId,
                    questionType,
                    questionIds:
                      selectedIds,
                  },
                ),
            },
          );

    void request
      .then(
        async (
          response,
        ) => {
          const body =
            (await response.json()) as LauncherResponse;

          if (
            !response.ok ||
            !body.ok
          ) {
            throw new Error(
              body.message ??
                "This practice collection is unavailable.",
            );
          }

          const previewRows =
            previewMode
              ? (
                  body.questions ??
                  []
                ).filter(
                  (
                    question,
                  ) =>
                    normalizeV2PracticeQuestionType(
                      question.questionType,
                    ) ===
                      questionType &&
                    (!selectedIds.length ||
                      selectedIds.includes(
                        question.id,
                      )),
                )
              : [];

          const source:
            RuntimeQuestion[] =
            previewMode
              ? previewRows.map(
                  mapPreviewQuestion,
                )
              : (
                  body.attempt
                    ?.questions ??
                  []
                ).map(
                  mapAttemptQuestion,
                );

          if (
            !source.length
          ) {
            throw new Error(
              "This practice activity is not available.",
            );
          }

          if (cancelled) {
            return;
          }

          setQuestions(
            source,
          );

          if (
            !previewMode
          ) {
            setAttemptId(
              body.attemptId ??
                body.attempt?.id ??
                "",
            );

            if (
              !body.attemptId &&
              !body.attempt?.id
            ) {
              throw new Error(
                "This practice activity is not available.",
              );
            }
          }
        },
      )
      .catch(
        (
          error: unknown,
        ) => {
          if (cancelled) {
            return;
          }

          setQuestions([]);

          setMessage(
            error instanceof
                Error &&
              error.message
              ? error.message
              : "This practice activity is not available.",
          );
        },
      )
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    exerciseId,
    groupId,
    mode,
    previewMode,
    questionType,
    selectedIds,
  ]);

  function hasAnswer(
    question: RuntimeQuestion,
  ) {
    const value =
      answers[
        question.questionId
      ];

    if (
      Array.isArray(value)
    ) {
      return (
        value.length > 0
      );
    }

    if (
      typeof value ===
      "string"
    ) {
      return Boolean(
        value.trim(),
      );
    }

    if (
      typeof value ===
      "boolean"
    ) {
      return true;
    }

    if (
      typeof value ===
      "number"
    ) {
      return true;
    }

    return (
      value !== null &&
      value !== undefined
    );
  }

  async function submit() {
    if (
      questions.some(
        (question) =>
          !hasAnswer(
            question,
          ),
      )
    ) {
      setMessage(
        "Please answer all questions before submitting.",
      );

      return;
    }

    setBusy(true);
    setMessage("");

    /*
     * Teacher and Publisher preview:
     *
     * Grade locally using the existing normalized
     * question evaluator.
     *
     * No StudentPracticeAttempt is created.
     */
    if (previewMode) {
      try {
        setQuestions(
          (current) =>
            current.map(
              (
                question,
              ) => {
                const answer =
                  answers[
                    question
                      .questionId
                  ];

                const practiceMode =
                  getBookQuestionPracticeMode(
                    question.questionType,
                  );

                if (
                  practiceMode ===
                  "MANUAL_RESPONSE"
                ) {
                  return {
                    ...question,

                    answered:
                      true,

                    studentAnswer:
                      answer,

                    feedback:
                      {
                        correct:
                          null,

                        explanation:
                          question.feedback
                            ?.explanation ??
                          null,
                      },
                  };
                }

                const correct =
                  previewCorrect(
                    question,
                    answer,
                  );

                return {
                  ...question,

                  answered:
                    true,

                  studentAnswer:
                    answer,

                  feedback:
                    {
                      correct,

                      correctAnswer:
                        correct
                          ? null
                          : question.correctAnswer ??
                            null,

                      explanation:
                        question.feedback
                          ?.explanation ??
                        null,
                    },
                };
              },
            ),
        );

        setSubmitted(
          true,
        );
      } catch {
        setMessage(
          "We could not check these answers. Please try again.",
        );
      } finally {
        setBusy(false);
      }

      return;
    }

    /*
     * Student mode retains the existing persistent
     * StudentPracticeAttempt workflow.
     *
     * Answers are stored first and the practice is
     * submitted once after all answers are saved.
     */
    if (!attemptId) {
      setMessage(
        "This practice activity is not available.",
      );

      setBusy(false);

      return;
    }

    try {
      const returnedFeedback =
        new Map<
          string,
          RuntimeFeedback
        >();

      for (
        const question of
        questions
      ) {
        const response =
          await fetch(
            `/api/student/practice/${encodeURIComponent(
              attemptId,
            )}/answer`,
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    questionId:
                      question.questionId,

                    answer:
                      answers[
                        question
                          .questionId
                      ],
                  },
                ),
            },
          );

        const body =
          (await response.json()) as {
            ok?: boolean;
            message?: string;
            correct?: boolean | null;
            correctAnswer?: string | null;
            explanation?: string | null;
          };

        if (
          !response.ok ||
          !body.ok
        ) {
          throw new Error(
            body.message ??
              "We could not save your answer. Please try again.",
          );
        }

        if (
          body.correct !==
            undefined ||
          body.correctAnswer !==
            undefined ||
          body.explanation !==
            undefined
        ) {
          returnedFeedback.set(
            question.questionId,
            {
              correct:
                body.correct ??
                null,

              correctAnswer:
                body.correctAnswer ??
                null,

              explanation:
                body.explanation ??
                null,
            },
          );
        }
      }

      const submitResponse =
        await fetch(
          `/api/student/practice/${encodeURIComponent(
            attemptId,
          )}/submit`,
          {
            method:
              "POST",
          },
        );

      const submitBody =
        (await submitResponse.json()) as {
          ok?: boolean;
          message?: string;
        };

      if (
        !submitResponse.ok ||
        !submitBody.ok
      ) {
        throw new Error(
          submitBody.message ??
            "Please answer all questions before submitting.",
        );
      }

      setQuestions(
        (current) =>
          current.map(
            (
              question,
            ) => ({
              ...question,

              answered:
                true,

              studentAnswer:
                answers[
                  question
                    .questionId
                ],

              feedback:
                returnedFeedback.get(
                  question.questionId,
                ) ??
                question.feedback ??
                {
                  correct:
                    null,
                },
            }),
          ),
      );

      setSubmitted(true);
    } catch (
      error
    ) {
      setMessage(
        error instanceof
            Error &&
          error.message
          ? error.message
          : "We could not submit this practice. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (
    typeof globalThis.document ===
    "undefined"
  ) {
    return null;
  }

  return createPortal(
    <div
      data-v2-assessment-launcher-overlay
      role="presentation"
      className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/70 p-4"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          titleId
        }
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(
          event,
        ) =>
          event.stopPropagation()
        }
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
              {mode ===
              "TEACHER"
                ? "Teacher Preview"
                : mode ===
                    "PREVIEW"
                  ? "Publisher Preview"
                  : "Practice"}
            </p>

            <h2
              id={titleId}
              className="text-lg font-bold text-slate-950"
            >
              {label}
            </h2>

            <p className="text-xs text-slate-500">
              {questions.length
                ? `${questions.length} question${questions.length === 1 ? "" : "s"} · answer all, then submit once.`
                : "Answer all questions, then submit once."}
            </p>
          </div>

          <button
            ref={closeRef}
            type="button"
            aria-label={`Close ${label}`}
            onClick={
              onClose
            }
            className="rounded-lg px-3 py-1 text-xl font-bold leading-none text-slate-600 hover:bg-slate-200"
          >
            ×
          </button>
        </header>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
          {loading ? (
            <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
              Loading
              questions…
            </p>
          ) : message ? (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800"
            >
              {message}
            </p>
          ) : (
            <>
              {questions.map(
                (
                  question,
                  index,
                ) => (
                  <article
                    key={
                      question.questionId
                    }
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="text-xs font-bold text-slate-500">
                      Question{" "}
                      {index +
                        1}{" "}
                      ·{" "}
                      {
                        question.marks
                      }{" "}
                      mark
                      {question.marks ===
                      1
                        ? ""
                        : "s"}
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-base font-semibold leading-7 text-slate-900">
                      {
                        question.questionText
                      }
                    </p>

                    {question.feedback &&
                    submitted ? (
                      <Feedback
                        feedback={
                          question.feedback
                        }
                      />
                    ) : (
                      <InteractiveQuestionRenderer
                        question={
                          question.interactiveQuestion
                        }
                        response={
                          answers[
                            question
                              .questionId
                          ] ??
                          ""
                        }
                        onChange={(
                          value,
                        ) =>
                          setAnswers(
                            (
                              current,
                            ) => ({
                              ...current,

                              [question.questionId]:
                                value,
                            }),
                          )
                        }
                        disabled={
                          submitted
                        }
                        showPrompt={
                          false
                        }
                      />
                    )}
                  </article>
                ),
              )}

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-500">
                  {
                    questions.length
                  }{" "}
                  question
                  {questions.length ===
                  1
                    ? ""
                    : "s"}
                </span>

                <div className="flex justify-end gap-2">
                  {submitted &&
                  onRetry ? (
                    <button
                      type="button"
                      onClick={
                        onRetry
                      }
                      className="rounded-xl border border-indigo-200 px-5 py-3 text-sm font-bold text-indigo-700"
                    >
                      Try Again
                    </button>
                  ) : null}

                  {!submitted ? (
                    <button
                      type="button"
                      disabled={
                        busy ||
                        questions.some(
                          (
                            question,
                          ) =>
                            !hasAnswer(
                              question,
                            ),
                        )
                      }
                      onClick={() =>
                        void submit()
                      }
                      className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
                    >
                      {busy
                        ? "Submitting…"
                        : "Submit"}
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>,
    globalThis.document
      .body,
  );
}

function Feedback({
  feedback,
}: {
  feedback: RuntimeFeedback;
}) {
  const manual =
    feedback.correct ===
    null;

  return (
    <div
      className={`mt-3 rounded-xl p-3 ${
        manual
          ? "bg-slate-50 text-slate-900"
          : feedback.correct
            ? "bg-emerald-50 text-emerald-900"
            : "bg-rose-50 text-rose-900"
      }`}
    >
      <p className="font-bold">
        {manual
          ? "Response recorded"
          : feedback.correct
            ? "Correct"
            : "Incorrect"}
      </p>

      {!manual &&
      !feedback.correct &&
      feedback.correctAnswer ? (
        <p className="mt-1 text-sm">
          Correct
          answer:{" "}
          {friendlyAnswer(
            feedback.correctAnswer,
          )}
        </p>
      ) : null}

      {feedback.explanation ? (
        <p className="mt-2 text-sm leading-6">
          {
            feedback.explanation
          }
        </p>
      ) : null}
    </div>
  );
}

function mapPreviewQuestion(
  question: {
    id: string;
    questionType?: string;
    questionText: string;
    options: unknown;
    marks: number;
    correctAnswer?:
      | string
      | null;
    explanation?:
      | string
      | null;
  },
): RuntimeQuestion {
  const questionType =
    normalizeV2PracticeQuestionType(
      question.questionType,
    );

  const previewQuestion =
    adaptBookQuestion({
      id: question.id,
      bookId: "",
      chapterId: "",
      questionType:
        question.questionType ??
        questionType,
      questionText:
        question.questionText,
      options:
        question.options,
      correctAnswer:
        question.correctAnswer ??
        null,
      explanation:
        question.explanation ??
        null,
      marks:
        question.marks,
    });

  const options =
    questionType ===
      "MCQ" ||
    questionType ===
      "MULTIPLE_SELECT"
      ? normalizeOptions(
          question.options,
        )
      : [];

  return {
    questionId:
      question.id,

    questionType,

    questionText:
      question.questionText,

    interactiveQuestion:
      previewQuestion,

    previewQuestion,

    options,

    marks:
      question.marks,

    answered:
      false,

    studentAnswer:
      null,

    feedback:
      question.explanation
        ? {
            correct:
              getBookQuestionPracticeMode(
                questionType,
              ) ===
              "MANUAL_RESPONSE"
                ? null
                : false,

            explanation:
              question.explanation,
          }
        : null,

    correctAnswer:
      getBookQuestionPracticeMode(
        questionType,
      ) ===
      "AUTO_GRADED"
        ? formatCorrectAnswer(
            previewQuestion,
          )
        : null,

    acceptedAnswers:
      questionType ===
      "FILL_BLANK"
        ? readAcceptedAnswers(
            question.options,
          )
        : [],
  };
}

function mapAttemptQuestion(
  question: {
    questionId: string;
    questionType?: string;
    questionText: string;
    options: string[];
    marks: number;
    answered: boolean;
    studentAnswer: unknown;
    feedback:
      RuntimeFeedback | null;
    interactiveQuestion:
      InteractiveQuestion;
  },
): RuntimeQuestion {
  return {
    ...question,

    questionType:
      normalizeV2PracticeQuestionType(
        question.questionType,
      ),

    options: (
      question.options ?? []
    ).map(
      (
        option,
      ) => ({
        value: option,
        text: option,
      }),
    ),
  };
}

function normalizeOptions(
  value: unknown,
): RuntimeOption[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value.flatMap(
    (
      option,
      index,
    ) => {
      if (
        typeof option ===
        "string"
      ) {
        return [
          {
            value:
              option,
            text:
              option,
          },
        ];
      }

      if (
        !option ||
        typeof option !==
          "object" ||
        Array.isArray(
          option,
        )
      ) {
        return [];
      }

      const record =
        option as Record<
          string,
          unknown
        >;

      const text = [
        record.text,
        record.label,
        record.value,
      ].find(
        (entry) =>
          typeof entry ===
            "string" &&
          entry.trim(),
      );

      if (
        typeof text !==
        "string"
      ) {
        return [];
      }

      return [
        {
          value:
            typeof record.id ===
              "string" &&
            record.id.trim()
              ? record.id
              : `option-${index + 1}`,

          text:
            text.trim(),
        },
      ];
    },
  );
}

function readAcceptedAnswers(
  value: unknown,
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    return [];
  }

  const accepted =
    (
      value as {
        acceptedAnswers?: unknown;
      }
    ).acceptedAnswers;

  return Array.isArray(
    accepted,
  )
    ? accepted.filter(
        (
          item,
        ): item is string =>
          typeof item ===
          "string",
      )
    : [];
}

function previewCorrect(
  question:
    RuntimeQuestion,
  answer: unknown,
) {
  if (
    getBookQuestionPracticeMode(
      question.questionType,
    ) !== "AUTO_GRADED"
  ) {
    return null;
  }

  return question.previewQuestion
    ? evaluateObjectiveQuestionResponse(
        question.previewQuestion,
        answer,
      ).correct === true
    : false;
}

function formatCorrectAnswer(
  question:
    NormalizedQuestion,
) {
  if (
    question.questionType ===
    "TRUE_FALSE"
  ) {
    return question.answer
      .correctBoolean ===
      undefined
      ? null
      : question.answer
            .correctBoolean
        ? "True"
        : "False";
  }

  if (
    question.answer
      .correctOptionIds
      ?.length
  ) {
    return question.answer.correctOptionIds
      .map(
        (id) =>
          question.options.find(
            (option) =>
              option.id === id,
          )?.text ??
          id,
      )
      .join(", ");
  }

  return (
    question.answer
      .acceptedAnswers?.join(
        " / ",
      ) ?? null
  );
}

function friendlyAnswer(
  value: string,
) {
  if (value === "true") {
    return "True";
  }

  if (
    value === "false"
  ) {
    return "False";
  }

  return value;
}
