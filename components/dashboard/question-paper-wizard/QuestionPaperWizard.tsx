"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { generateQuestionPaper } from "@/app/teacher-dashboard/ai/actions";
import BookSelector from "./BookSelector";
import ChapterSelector from "./ChapterSelector";
import GenerationProgress from "./GenerationProgress";
import PaperSettings from "./PaperSettings";
import ReviewPanel from "./ReviewPanel";
import WizardStep from "./WizardStep";
import type {
  PaperSettingsValue,
  WizardOptions,
  WizardTeachingContext,
} from "./types";

const labels = [
  "Select Book",
  "Exam Setup",
  "Review",
];

const initialSettings: PaperSettingsValue = {
  title: "Periodic Test",
  examType: "Periodic Test",
  pattern: "CBSE Pattern",
  totalMarks: 40,
  durationMode: "auto",
  duration: 60,
  difficulty: "Balanced",
  autoDistribution: true,
  questionTypes: [
    "MCQ",
    "Very Short",
    "Short",
    "Long",
    "Competency Based",
  ],
  questionCounts: {
    MCQ: 10,
    "Very Short": 5,
    Short: 5,
    Long: 2,
    "Competency Based": 2,
  },
  advanced: {
    bloomDistribution: false,
    internalChoices: true,
    caseBasedQuestions: false,
    competencyPercent: 20,
    creativeQuestions: false,
    applicationQuestions: true,
  },
};

export default function QuestionPaperWizard({
  options,
}: {
  options: WizardOptions;
}) {
  const [step, setStep] = useState(0);
  const [classId, setClassId] = useState("");
  const [contextId, setContextId] = useState("");
  const [bookId, setBookId] = useState("");
  const [search, setSearch] = useState("");
  const [coverage, setCoverage] =
    useState<"whole" | "selected">("whole");
  const [selectedChapterIds, setSelectedChapterIds] =
    useState<string[]>([]);
  const [settings, setSettings] =
    useState(initialSettings);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [pending, startTransition] = useTransition();

  const [generationId, setGenerationId] = useState(
    () => {
      if (typeof window === "undefined") return "";

      const stored = sessionStorage.getItem(
        "bluegate-question-paper-generation",
      );

      return stored &&
        /^[a-zA-Z0-9_-]{16,64}$/.test(stored)
        ? stored
        : crypto.randomUUID();
    },
  );

  const teachingContext = useMemo(
    () =>
      options.contexts.find(
        (context) => context.id === contextId,
      ) ?? null,
    [contextId, options.contexts],
  );

  const book = useMemo(() => {
    if (!teachingContext || !bookId) return undefined;

    const candidate = options.books.find(
      (item) => item.id === bookId,
    );

    if (!candidate) return undefined;

    const allowed = candidate.contexts.some(
      (context) =>
        context.id === teachingContext.id &&
        context.sectionId ===
          teachingContext.sectionId &&
        context.sectionSubjectId ===
          teachingContext.sectionSubjectId &&
        context.bookId === candidate.id,
    );

    return allowed ? candidate : undefined;
  }, [
    bookId,
    options.books,
    teachingContext,
  ]);

  const readyChapterIds = useMemo(
    () =>
      book?.chapters
        .filter((chapter) => chapter.releaseReady)
        .map((chapter) => chapter.id) ?? [],
    [book],
  );

  const chapterIds =
    coverage === "whole"
      ? readyChapterIds
      : selectedChapterIds.filter((id) =>
          readyChapterIds.includes(id),
        );

  const estimated = useMemo(
    () =>
      settings.autoDistribution
        ? Math.max(
            8,
            Math.ceil(settings.totalMarks / 2),
          )
        : settings.questionTypes.reduce(
            (count, type) =>
              count +
              (settings.questionCounts[type] ?? 1),
            0,
          ),
    [settings],
  );

  const canContinue =
    step === 0
      ? Boolean(
          teachingContext &&
            book &&
            chapterIds.length,
        )
      : step === 1
        ? Boolean(
            settings.title.trim() &&
              settings.totalMarks > 0 &&
              settings.duration >= 10 &&
              (settings.autoDistribution ||
                settings.questionTypes.length),
          )
        : true;

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      generationId
    ) {
      sessionStorage.setItem(
        "bluegate-question-paper-generation",
        generationId,
      );
    }
  }, [generationId]);

  function chooseClass(value: string) {
    setClassId(value);
    setContextId("");
    setBookId("");
    setCoverage("whole");
    setSelectedChapterIds([]);
  }

  function chooseContext(value: string) {
    const nextContext =
      options.contexts.find(
        (context) => context.id === value,
      ) ?? null;

    setContextId(value);
    setBookId(nextContext?.bookId ?? "");
    setCoverage("whole");
    setSelectedChapterIds([]);
  }

  function chooseBook(value: string) {
    if (!teachingContext) return;

    const allowed = options.books.some(
      (candidate) =>
        candidate.id === value &&
        candidate.contexts.some(
          (context) =>
            context.id === teachingContext.id,
        ),
    );

    if (!allowed) return;

    setBookId(value);
    setCoverage("whole");
    setSelectedChapterIds([]);
  }

  function generate() {
    if (
      !book ||
      !teachingContext ||
      !generationId ||
      pending ||
      !chapterIds.length
    ) {
      return;
    }

    setMessage("");
    setProgress(0);
    setStep(3);

    startTransition(async () => {
      const result = await generateQuestionPaper({
        generationId,

        /*
         * Browser values are context claims only.
         * Batch C will re-authorise these values and resolve
         * the exact immutable release again on the server.
         */
        sectionId: teachingContext.sectionId,
        sectionSubjectId:
          teachingContext.sectionSubjectId,

        bookId: book.id,
        chapterIds,
        coverage,
        examType: settings.examType,
        pattern: settings.pattern,
        title: settings.title,
        totalMarks: settings.totalMarks,
        duration: settings.duration,
        difficulty: settings.difficulty,
        autoDistribution:
          settings.autoDistribution,
        questionTypes: settings.questionTypes,
        questionCounts: settings.questionCounts,
        estimatedQuestions: estimated,
        advanced: settings.advanced,
      });

      if (result.ok) {
        sessionStorage.removeItem(
          "bluegate-question-paper-generation",
        );

        setProgress(5);

        setTimeout(
          () =>
            window.location.assign(
              result.draftUrl,
            ),
          500,
        );
      } else {
        const nextId = crypto.randomUUID();

        sessionStorage.setItem(
          "bluegate-question-paper-generation",
          nextId,
        );

        setGenerationId(nextId);
        setMessage(result.message);
        setStep(2);
      }
    });
  }

  return (
    <div className="space-y-6">
      <nav
        aria-label="Builder progress"
        className="rounded-2xl border bg-white p-4"
      >
        <ol className="grid grid-cols-3 gap-2">
          {labels.map((label, index) => (
            <li
              key={label}
              className="flex items-center"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  index <= Math.min(step, 2)
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {index < step || step === 3 ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </span>

              <span
                className={`ml-2 hidden text-sm font-semibold sm:block ${
                  index <= Math.min(step, 2)
                    ? "text-slate-900"
                    : "text-slate-400"
                }`}
              >
                {label}
              </span>

              {index < 2 && (
                <span
                  className={`mx-2 h-0.5 flex-1 sm:mx-4 ${
                    index < step
                      ? "bg-blue-500"
                      : "bg-slate-200"
                  }`}
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {step === 0 && (
        <WizardStep
          title="Select teaching context and book"
          description="Choose the class, section and subject you teach. Available chapters come from the published Smart Book V2 release."
        >
          <BookSelector
            classes={options.classes}
            contexts={options.contexts}
            books={options.books}
            classId={classId}
            contextId={contextId}
            bookId={bookId}
            search={search}
            onClass={chooseClass}
            onContext={chooseContext}
            onBook={chooseBook}
            onSearch={setSearch}
          />

          {book && teachingContext && (
            <div className="mt-8">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  Teaching context
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {teachingContext.className} -{" "}
                  {teachingContext.sectionName} -{" "}
                  {teachingContext.subjectName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Published Smart Book V2 release
                  {" "}#{teachingContext.releaseVersionNumber}
                </p>
              </div>

              <h3 className="mt-6 text-lg font-bold">
                Coverage
              </h3>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <CoverageCard
                  active={coverage === "whole"}
                  icon={BookOpen}
                  title="Whole Book"
                  description={`${readyChapterIds.length} released chapters - Recommended`}
                  onClick={() =>
                    setCoverage("whole")
                  }
                />

                <CoverageCard
                  active={coverage === "selected"}
                  icon={ListChecks}
                  title="Selected Chapters"
                  description="Choose specific chapters from the published release"
                  onClick={() =>
                    setCoverage("selected")
                  }
                />
              </div>

              {coverage === "selected" && (
                <div className="mt-5">
                  <ChapterSelector
                    chapters={book.chapters}
                    selected={selectedChapterIds}
                    onToggle={(id) =>
                      setSelectedChapterIds(
                        (ids) =>
                          ids.includes(id)
                            ? ids.filter(
                                (item) =>
                                  item !== id,
                              )
                            : [...ids, id],
                      )
                    }
                  />
                </div>
              )}
            </div>
          )}
        </WizardStep>
      )}

      {step === 1 && (
        <WizardStep
          title="Build your examination"
          description="Choose the exam format and paper pattern. Recommended defaults keep setup quick."
        >
          <PaperSettings
            value={settings}
            onChange={setSettings}
          />
        </WizardStep>
      )}

      {step === 2 &&
        book &&
        teachingContext && (
          <WizardStep
            title="Review your question paper"
            description={`Confirm the paper details for ${teachingContext.className} - ${teachingContext.sectionName} - ${teachingContext.subjectName} before using one daily generation.`}
          >
            <ReviewPanel
              book={book}
              chapterIds={chapterIds}
              coverage={coverage}
              settings={settings}
              entitlement={options.entitlement}
            />
          </WizardStep>
        )}

      {step === 3 && (
        <WizardStep
          title="Creating your question paper"
          description="Keep this page open while your editable draft is prepared."
        >
          <GenerationProgress
            progress={progress}
          />
        </WizardStep>
      )}

      {message && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700"
        >
          {message}
        </div>
      )}

      {step < 3 && (
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={step === 0}
            onClick={() =>
              setStep((current) => current - 1)
            }
            className="inline-flex min-h-12 items-center rounded-xl border bg-white px-5 py-3 font-semibold disabled:opacity-40"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </button>

          {step < 2 ? (
            <button
              type="button"
              disabled={!canContinue}
              onClick={() =>
                setStep(
                  (current) => current + 1,
                )
              }
              className="inline-flex min-h-12 items-center rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-40"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={
                pending ||
                !generationId ||
                !teachingContext ||
                !options.entitlement.canGenerate
              }
              onClick={generate}
              className="inline-flex min-h-12 items-center rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-40"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Question Paper
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CoverageCard({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: typeof BookOpen;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-24 items-center gap-4 rounded-2xl border p-5 text-left ${
        active
          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
          : "bg-white"
      }`}
    >
      <span
        className={`rounded-xl p-3 ${
          active
            ? "bg-blue-600 text-white"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        <Icon className="h-6 w-6" />
      </span>

      <span>
        <strong className="block">
          {title}
        </strong>
        <span className="mt-1 block text-sm text-slate-500">
          {description}
        </span>
      </span>
    </button>
  );
}
