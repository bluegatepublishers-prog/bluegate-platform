"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { canLaunchBookQuestionPractice } from "@/lib/normalized-question";
import PublisherQuestionAuthoringEditor from "@/components/admin/books/PublisherQuestionAuthoringEditor";
import type { V2PracticeQuestionType } from "@/lib/v2-assessment-launcher";

const BOOK_QUESTION_TYPES = [
  ["MCQ", "MCQ", true],
  ["TRUE_FALSE", "True / False", true],
  ["FILL_BLANK", "Fill in the blank", true],
  ["MATCH", "Match the following", true],
  ["MULTIPLE_SELECT", "Multiple select", true],
  ["ORDERING", "Ordering / sequence", true],
  ["PICTURE_BASED", "Picture-based", true],
  ["SHORT_ANSWER", "Short answer", true],
  ["LONG_ANSWER", "Long answer", true],
  ["CASE_BASED", "Case-based", true],
  ["COMPETENCY", "Competency", true],
  ["HOTS", "HOTS", true],
  [
    "ASSERTION_REASON",
    "Assertion / reason",
    true,
  ],
  ["PRACTICAL", "Practical", true],
  ["PROJECT", "Project", true],
  ["CUSTOM", "Custom", true],
] as const;
type BookQuestionType = (typeof BOOK_QUESTION_TYPES)[number][0];

type Group = {
  id: string;
  exerciseId: string;
  title: string;
  instructions: string | null;
  sortOrder: number;
  active: boolean;
};

type QuestionRow = {
  id: string;
  bookId: string;
  chapterId: string;
  exerciseId: string | null;
  exerciseGroupId: string | null;
  moduleId: string | null;
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
  approved: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

type Options = {
  book: { id: string };
  chapters: Array<{
    id: string;
    title: string;
    chapterNumber?: number;
  }>;
  modules: Array<{
    id: string;
    chapterId?: string;
    title: string;
  }>;
  images: Array<{
    id: string;
    title: string;
  }>;
};

type EditorQuestion = {
  id: string;
  context: {
    chapterId: string;
    moduleId: string | null;
  };
  question: {
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
  };
  imageResource: {
    id: string;
  } | null;
};

type LauncherTarget = {
  exerciseId: string;
  groupId: string;
  questionType?: V2PracticeQuestionType;
  questionIds?: string[];
};

type Props = {
  bookId?: string;
  chapterId?: string | null;
  moduleId?: string | null;
  exerciseId?: string | null;
  exerciseTitle?: string | null;
  initialLauncherTarget?: LauncherTarget | null;
  onInsert?: (
    target: LauncherTarget,
  ) => void;
  onClose: () => void;
};

export default function V2BookQuestionsAuthoring({
  bookId,
  chapterId,
  moduleId = null,
  exerciseId = null,
  exerciseTitle = null,
  initialLauncherTarget = null,
  onInsert: onInsertProp,
  onClose,
}: Props) {
  const onInsert =
    onInsertProp ?? (() => undefined);

  const initialType =
    normalizeBookQuestionType(
      initialLauncherTarget
        ?.questionType,
    );

  const [activeQuestionType, setActiveQuestionType] =
    useState<BookQuestionType>(
      initialType,
    );

  const [group, setGroup] =
    useState<Group | null>(null);

  const [questions, setQuestions] =
    useState<QuestionRow[]>([]);

  const [options, setOptions] =
    useState<Options | null>(null);

  const [editing, setEditing] =
    useState<
      EditorQuestion | null | undefined
    >(undefined);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [
    approvalBusyId,
    setApprovalBusyId,
  ] = useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const [
    selectingLauncher,
    setSelectingLauncher,
  ] = useState(
    Boolean(initialLauncherTarget),
  );

  const [
    selectedQuestionIds,
    setSelectedQuestionIds,
  ] = useState<string[]>(
    initialLauncherTarget
      ?.questionIds ?? [],
  );

  const refresh =
    useCallback(async () => {
      if (!bookId || !chapterId) {
        return;
      }

      setLoading(true);
      setMessage("");

      try {
        const response = await fetch(
          `/api/admin/book-questions?bookId=${encodeURIComponent(
            bookId,
          )}&chapterId=${encodeURIComponent(
            chapterId,
          )}${
            exerciseId
              ? `&exerciseId=${encodeURIComponent(
                  exerciseId,
                )}`
              : ""
          }`,
          {
            cache: "no-store",
          },
        );

        const body =
          (await response.json()) as {
            ok?: boolean;
            message?: string;
            group?: Group | null;
            questions?: QuestionRow[];
            options?: Options;
          };

        if (
          !response.ok ||
          !body.ok
        ) {
          throw new Error(
            body.message ??
              "Book Questions are unavailable.",
          );
        }

        setGroup(body.group ?? null);
        setQuestions(
          body.questions ?? [],
        );
        setOptions(
          body.options ?? null,
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Book Questions are unavailable.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      bookId,
      chapterId,
      exerciseId,
    ]);

  useEffect(() => {
    const frame =
      globalThis.requestAnimationFrame(
        () => {
          void refresh();
        },
      );

    return () =>
      globalThis.cancelAnimationFrame(
        frame,
      );
  }, [refresh]);

  useEffect(() => {
    if (!initialLauncherTarget) {
      return;
    }

    const frame = globalThis.requestAnimationFrame(() => {
      setActiveQuestionType(normalizeBookQuestionType(initialLauncherTarget.questionType));
      setSelectingLauncher(true);
      setSelectedQuestionIds(initialLauncherTarget.questionIds ?? []);
    });

    return () => globalThis.cancelAnimationFrame(frame);
  }, [
    initialLauncherTarget
      ?.exerciseId,
    initialLauncherTarget?.groupId,
    initialLauncherTarget
      ?.questionType,
    initialLauncherTarget?.questionIds?.join(
      "|",
    ),
  ]);

  async function ensureGroup() {
    if (
      group ||
      !bookId ||
      !chapterId
    ) {
      return group;
    }

    setBusy(true);

    try {
      const response = await fetch(
        "/api/admin/book-questions",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            bookId,
            chapterId,
            exerciseId,
          }),
        },
      );

      const body =
        (await response.json()) as {
          ok?: boolean;
          message?: string;
          group?: Group;
          exercise?: {
            id: string;
          };
        };

      if (
        !response.ok ||
        !body.ok ||
        !body.group ||
        !body.exercise
      ) {
        throw new Error(
          body.message ??
            "Unable to prepare the Book Questions collection.",
        );
      }

      setGroup(body.group);
      return body.group;
    } finally {
      setBusy(false);
    }
  }

  async function addQuestion() {
    setMessage("");

    try {
      const next =
        await ensureGroup();

      if (next) {
        setEditing(null);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : `Unable to prepare the ${typeLabel(activeQuestionType)} editor.`,
      );
    }
  }

  function chooseType(
    type: string,
    active: boolean,
  ) {
    if (!active) {
      return;
    }

    const next =
      normalizeBookQuestionType(type);

    setActiveQuestionType(next);
    setSelectingLauncher(false);
    setSelectedQuestionIds([]);
    setEditing(undefined);
    setMessage("");
  }

  async function editQuestion(
    question: QuestionRow,
  ) {
    if (!options) {
      return;
    }

    setActiveQuestionType(
      normalizeBookQuestionType(
        question.questionType,
      ),
    );

    setEditing({
      id: question.id,
      context: {
        chapterId:
          question.chapterId,
        moduleId:
          question.moduleId,
      },
      question: {
        questionType:
          question.questionType,
        questionText:
          question.questionText,
        options:
          question.options,
        correctAnswer:
          question.correctAnswer,
        explanation:
          question.explanation,
        marks: question.marks,
        difficulty:
          question.difficulty,
        bloomLevel:
          question.bloomLevel,
        competency:
          question.competency,
        tags: question.tags,
      },
      imageResource: null,
    });
  }

  async function setQuestionApproval(
    question: QuestionRow,
    approved: boolean,
  ) {
    if (
      !bookId ||
      !chapterId ||
      !group
    ) {
      return;
    }

    setApprovalBusyId(
      question.id,
    );
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/book-questions",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            bookId,
            chapterId,
            exerciseId:
              group.exerciseId,
            groupId: group.id,
            questionId:
              question.id,
            questionType:
              question.questionType,
            approved,
          }),
        },
      );

      const body =
        (await response.json()) as {
          ok?: boolean;
          message?: string;
        };

      if (
        !response.ok ||
        !body.ok
      ) {
        throw new Error(
          body.message ??
            (approved
              ? "Unable to approve this question."
              : "Unable to unapprove this question."),
        );
      }

      setQuestions((current) =>
        current.map((item) =>
          item.id ===
          question.id
            ? {
                ...item,
                approved,
              }
            : item,
        ),
      );

      if (!approved) {
        setSelectedQuestionIds(
          (current) =>
            current.filter(
              (id) =>
                id !==
                question.id,
            ),
        );
      }

      setMessage(
        approved
          ? `${typeLabel(activeQuestionType)} approved. It can now be selected for a student launcher.`
          : `${typeLabel(activeQuestionType)} moved back to Draft.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to change question approval.",
      );
    } finally {
      setApprovalBusyId(null);
    }
  }

  const typeQuestions = useMemo(
    () =>
      questions.filter(
        (question) =>
          question.questionType ===
            activeQuestionType &&
          !question.archived,
      ),
    [
      questions,
      activeQuestionType,
    ],
  );

  const approvedQuestions =
    useMemo(
      () =>
        typeQuestions.filter(
          (question) =>
            question.approved,
        ),
      [typeQuestions],
    );

  function toggleQuestion(
    questionId: string,
  ) {
    setSelectedQuestionIds(
      (current) =>
        current.includes(questionId)
          ? current.filter(
              (id) =>
                id !== questionId,
            )
          : [
              ...current,
              questionId,
            ],
    );
  }

  function beginLauncherSelection() {
    setMessage("");
    if (!canLaunchBookQuestionPractice(activeQuestionType)) {
      setMessage(`Practice player coming next for ${typeLabel(activeQuestionType)}.`);
      return;
    }


    if (!group) {
      setMessage(
        `Add at least one ${typeLabel(activeQuestionType)} question before inserting a launcher.`,
      );
      return;
    }

    if (
      !approvedQuestions.length
    ) {
      setMessage(
        `Approve at least one ${typeLabel(activeQuestionType)} question before inserting a student practice launcher.`,
      );
      return;
    }

    if (
      !selectedQuestionIds.length
    ) {
      setSelectedQuestionIds(
        approvedQuestions.map(
          (question) =>
            question.id,
        ),
      );
    }

    setSelectingLauncher(true);
  }

  function insertLauncher() {
    if (!group) {
      return;
    }
    if (!canLaunchBookQuestionPractice(activeQuestionType)) {
      setMessage(`Practice player coming next for ${typeLabel(activeQuestionType)}.`);
      return;
    }


    const validIds =
      selectedQuestionIds.filter(
        (id) =>
          approvedQuestions.some(
            (question) =>
              question.id === id,
          ),
      );

    if (!validIds.length) {
      setMessage(
        `Select at least one approved ${typeLabel(activeQuestionType)} question.`,
      );
      return;
    }

    onInsert({
      exerciseId:
        group.exerciseId,
      groupId: group.id,
      questionType:
        activeQuestionType as V2PracticeQuestionType,
      questionIds: validIds,
    });
  }

  if (!bookId || !chapterId) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900"
      >
        Book Questions require a
        containing chapter. Select a
        chapter or module in the
        Content Studio hierarchy before
        saving a question.
      </p>
    );
  }

  const resolvedChapter =
    options?.chapters.find(
      (chapter) =>
        chapter.id === chapterId,
    );

  const scopedOptions = options
    ? {
        ...options,
        chapters:
          options.chapters.filter(
            (chapter) =>
              chapter.id ===
              chapterId,
          ),
        modules:
          options.modules.filter(
            (module) =>
              module.chapterId ===
              chapterId,
          ),
      }
    : null;

  const label =
    typeLabel(activeQuestionType);
  const practiceCapable = canLaunchBookQuestionPractice(activeQuestionType);

  return (
    <div data-v2-book-questions-authoring>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">
            Book Questions
          </p>
          <p className="text-xs text-slate-500">
            Choose a question type,
            build its bank, then insert
            one or more independent
            launchers.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
        >
          Close
        </button>
      </div>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        aria-label="Book Question types"
      >
        {BOOK_QUESTION_TYPES.map(
          ([
            type,
            typeName,
            active,
          ]) => (
            <button
              key={type}
              type="button"
              disabled={!active}
              aria-disabled={!active}
              aria-pressed={
                active &&
                activeQuestionType ===
                  type
              }
              onClick={() =>
                chooseType(
                  type,
                  active,
                )
              }
              className={`rounded-lg border px-2 py-2 text-left text-xs font-bold ${
                !active
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                  : activeQuestionType ===
                      type
                    ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                    : "border-indigo-200 bg-indigo-50 text-indigo-800 hover:border-indigo-400"
              }`}
            >
              <span className="block">
                {typeName}
              </span>
              <span className="mt-1 block text-[10px] font-semibold">
                {active
                  ? activeQuestionType ===
                    type
                    ? "Selected"
                    : "Available"
                  : "Coming next"}
              </span>
            </button>
          ),
        )}
      </div>

      {exerciseTitle ? (
        <p className="mb-3 mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          Exercise:{" "}
          {exerciseTitle}
        </p>
      ) : null}

      {message ? (
        <p
          role="status"
          className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-700"
        >
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
          Loading Book Questions...
        </p>
      ) : (
        <>
          <div className="sticky top-0 z-10 mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {label} question bank
              </p>
              <p className="text-xs text-slate-500">
                {
                  typeQuestions.length
                }{" "}
                question
                {typeQuestions.length ===
                1
                  ? ""
                  : "s"}{" "}
                in this chapter
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void addQuestion()
                }
                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                Add {label}
              </button>

              {group ? (
                <button
                  type="button"
                  disabled={!practiceCapable}
                  onClick={
                    beginLauncherSelection
                  }
                  className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700"
                >
                  {practiceCapable
                    ? initialLauncherTarget ? "Edit launcher" : `Insert ${label} launcher`
                    : "Practice player coming next"}
                </button>
              ) : null}
            </div>
          </div>

          {selectingLauncher ? (
            <section
              data-v2-book-question-launcher-picker
              className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-indigo-900">
                    Select questions
                    for this {label}{" "}
                    button
                  </p>
                  <p className="mt-0.5 text-[11px] text-indigo-700">
                    Only approved{" "}
                    {label} questions
                    can be delivered
                    to students.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedQuestionIds(
                      approvedQuestions.map(
                        (question) =>
                          question.id,
                      ),
                    )
                  }
                  className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-[10px] font-bold text-indigo-700"
                >
                  Select all
                </button>
              </div>

              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                {approvedQuestions.map(
                  (
                    question,
                    index,
                  ) => (
                    <label
                      key={
                        question.id
                      }
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.includes(
                          question.id,
                        )}
                        onChange={() =>
                          toggleQuestion(
                            question.id,
                          )
                        }
                        className="mt-0.5 h-4 w-4"
                      />

                      <span className="min-w-0">
                        <span className="block text-[10px] font-bold text-slate-500">
                          Question{" "}
                          {index + 1}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold text-slate-900">
                          {
                            question.questionText
                          }
                        </span>
                      </span>
                    </label>
                  ),
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-600">
                  {
                    selectedQuestionIds.filter(
                      (id) =>
                        approvedQuestions.some(
                          (
                            question,
                          ) =>
                            question.id ===
                            id,
                        ),
                    ).length
                  }{" "}
                  questions selected
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectingLauncher(
                        false,
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={
                      insertLauncher
                    }
                    className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white"
                  >
                    {initialLauncherTarget
                      ? "Save changes"
                      : "Insert launcher"}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          <div className="mt-3 space-y-2">
            {typeQuestions.map(
              (
                question,
                index,
              ) => (
                <div
                  key={question.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500">
                      Question{" "}
                      {index + 1} ·{" "}
                      {question.approved
                        ? "Approved"
                        : "Draft"}
                    </p>

                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
                      {
                        question.questionText
                      }
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                      <span>
                        {resolvedChapter
                          ? formatChapter(
                              resolvedChapter.chapterNumber,
                              resolvedChapter.title,
                            )
                          : "Chapter"}
                      </span>

                      {question.moduleId ? (
                        <span>
                          {options?.modules.find(
                            (
                              module,
                            ) =>
                              module.id ===
                              question.moduleId,
                          )?.title ??
                            "Module"}
                        </span>
                      ) : null}

                      {question.difficulty ? (
                        <span>
                          {difficultyLabel(
                            question.difficulty,
                          )}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void editQuestion(
                          question,
                        )
                      }
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={
                        approvalBusyId ===
                        question.id
                      }
                      onClick={() =>
                        void setQuestionApproval(
                          question,
                          !question.approved,
                        )
                      }
                      className={`rounded-lg px-2 py-1 text-xs font-bold disabled:opacity-50 ${
                        question.approved
                          ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {approvalBusyId ===
                      question.id
                        ? "Saving..."
                        : question.approved
                          ? "Unapprove"
                          : "✓ Approve"}
                    </button>
                  </div>
                </div>
              ),
            )}

            {!typeQuestions.length ? (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                No {label} questions
                yet. Add the first
                question to this
                chapter’s collection.
              </p>
            ) : null}
          </div>
        </>
      )}

      {editing !== undefined &&
      scopedOptions &&
      group ? (
        <PublisherQuestionAuthoringEditor
          options={scopedOptions}
          question={editing}
          chapterId={chapterId}
          fixedQuestionType={
            activeQuestionType
          }
          scope={{
            exerciseId:
              group.exerciseId,
            exerciseGroupId:
              group.id,
            chapterId,
            moduleId,
            exerciseTitle,
          }}
          onClose={() =>
            setEditing(undefined)
          }
          onSaved={() => {
            setEditing(undefined);
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function normalizeBookQuestionType(value: unknown): BookQuestionType {
  return BOOK_QUESTION_TYPES.some(([type]) => type === value)
    ? value as BookQuestionType
    : "MCQ";
}

function typeLabel(value: BookQuestionType) {
  return BOOK_QUESTION_TYPES.find(([type]) => type === value)?.[1] ?? value.replaceAll("_", " ");
}


function formatChapter(
  chapterNumber: number | undefined,
  title: string,
) {
  return chapterNumber === undefined
    ? title
    : `Chapter ${chapterNumber}: ${title}`;
}

function difficultyLabel(
  value: string,
) {
  return value === "EASY"
    ? "Easy"
    : value === "HARD"
      ? "Difficult"
      : value === "MEDIUM"
        ? "Moderate"
        : value;
}