"use client";

import { GraduationCap } from "lucide-react";

const outcomes = [
  "Develop scientific thinking and curiosity.",
  "Strengthen observation and experimental skills.",
  "Improve logical reasoning and problem-solving abilities.",
  "Understand real-life applications of scientific concepts.",
  "Promote environmental awareness and responsible citizenship.",
  "Encourage collaborative and activity-based learning.",
];

export default function LearningOutcomes() {
  if (!outcomes.length) return null;

  return (
    <section className="py-8">

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

        <span className="inline-flex rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-700">
          LEARNING OUTCOMES
        </span>

        <h2 className="mt-4 text-3xl font-bold text-slate-900">
          What Students Will Learn
        </h2>

        <p className="mt-2 text-slate-600">
          Key competencies developed through this book.
        </p>

        <div className="mt-8 divide-y divide-slate-100">

          {outcomes.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-4 py-4 transition hover:bg-emerald-50"
            >

              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">

                <GraduationCap
                  size={18}
                  className="text-emerald-600"
                />

              </div>

              <p className="text-[15px] font-medium leading-6 text-slate-700">
                {item}
              </p>

            </div>
          ))}

        </div>

      </div>

    </section>
  );
}