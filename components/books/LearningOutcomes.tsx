import { GraduationCap } from "lucide-react";

const outcomes = [
  "Develop scientific thinking and curiosity.",
  "Strengthen observation and experimentation skills.",
  "Improve logical reasoning and problem-solving abilities.",
  "Understand real-life applications of scientific concepts.",
  "Promote environmental awareness and responsible citizenship.",
  "Encourage collaborative and activity-based learning."
];

export default function LearningOutcomes() {
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Learning Outcomes
          </h2>

          <p className="mt-3 text-slate-600">
            Students will achieve the following competencies after
            completing this book.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">

          {outcomes.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="rounded-full bg-blue-100 p-3">
                <GraduationCap
                  size={22}
                  className="text-blue-600"
                />
              </div>

              <p className="text-slate-700 leading-relaxed">
                {item}
              </p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}