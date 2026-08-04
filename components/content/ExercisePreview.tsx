import { parseInstructionText, type ExerciseStudioData } from "@/lib/exercise-authoring-types";

export default function ExercisePreview({
  exercise,
  showAnswers = false,
}: {
  exercise: ExerciseStudioData;
  showAnswers?: boolean;
}) {
  const groupsById = new Map(exercise.questionGroups.map((group) => [group.id, group]));
  const grouped = new Map<string, typeof exercise.questions>();
  for (const question of exercise.questions) {
    const key = question.exerciseGroupId ?? "ungrouped";
    grouped.set(key, [...(grouped.get(key) ?? []), question]);
  }

  return (
    <article className="space-y-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          {exercise.type} · {exercise.published ? "Published" : "Draft"}
        </p>
        <h3 className="mt-2 text-2xl font-bold text-slate-950">{exercise.title}</h3>
        {parseInstructionText(exercise.instructions) ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
            {parseInstructionText(exercise.instructions)}
          </p>
        ) : null}
      </header>

      {[...grouped.entries()].map(([groupId, questions]) => {
        const group = groupsById.get(groupId);
        return (
          <section key={groupId} className="space-y-4">
            {group ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <h4 className="font-bold text-slate-900">{group.title}</h4>
                {group.instructions ? <p className="mt-1 text-sm text-slate-500">{group.instructions}</p> : null}
              </div>
            ) : null}
            {questions.map((question, index) => (
              <div key={question.id} className="rounded-[1.35rem] border border-slate-200 bg-[#fcfaf5] px-4 py-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                    Q{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap font-semibold leading-7 text-slate-900">{question.questionText}</p>
                    <QuestionOptions options={question.options} />
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {question.questionType} · {question.marks} marks · {question.difficulty}
                    </p>
                    {showAnswers ? (
                      <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                        {question.correctAnswer ? <p><strong>Answer:</strong> {question.correctAnswer}</p> : null}
                        {question.explanation ? <p className="mt-2"><strong>Explanation:</strong> {question.explanation}</p> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </article>
  );
}

function QuestionOptions({ options }: { options: unknown }) {
  if (!Array.isArray(options) || !options.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {options.map((option, index) => (
        <div key={index} className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
          {typeof option === "string"
            ? option
            : isRecord(option) && "label" in option
              ? `${String(option.id ?? index + 1)}. ${String(option.label ?? "")}`
              : isRecord(option) && "left" in option
                ? `${String(option.left ?? "")} -> ${String(option.right ?? "")}`
                : JSON.stringify(option)}
        </div>
      ))}
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
