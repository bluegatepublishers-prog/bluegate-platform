"use client";

import {
  ClipboardCheck,
  FileText,
  BookCheck,
  BarChart3,
  Target,
  CheckCircle2,
} from "lucide-react";

const assessmentFeatures = [
  {
    icon: ClipboardCheck,
    title: "Competency-Based Assessment",
    description:
      "Assessment resources designed according to NEP 2020 to evaluate conceptual understanding, application and higher-order thinking.",
    bg: "bg-blue-50",
    color: "text-blue-600",
  },
  {
    icon: FileText,
    title: "Worksheets & Practice Sheets",
    description:
      "Ready-to-use worksheets, reinforcement exercises and classroom practice activities for every chapter.",
    bg: "bg-orange-50",
    color: "text-orange-600",
  },
  {
    icon: BookCheck,
    title: "Question Banks",
    description:
      "Comprehensive question banks with MCQs, short answers, competency-based and HOTS questions.",
    bg: "bg-emerald-50",
    color: "text-emerald-600",
  },
  {
    icon: Target,
    title: "Learning Outcomes",
    description:
      "Every assessment is aligned with clearly defined learning outcomes to monitor student achievement.",
    bg: "bg-purple-50",
    color: "text-purple-600",
  },
  {
    icon: BarChart3,
    title: "Progress Monitoring",
    description:
      "Track student performance through continuous evaluation, periodic assessments and feedback.",
    bg: "bg-cyan-50",
    color: "text-cyan-600",
  },
  {
    icon: CheckCircle2,
    title: "Exam Readiness",
    description:
      "Structured revision resources and practice papers help students prepare confidently for school examinations.",
    bg: "bg-pink-50",
    color: "text-pink-600",
  },
];

export default function AssessmentSupport() {
  return (
    <section className="bg-white py-24">

      <div className="mx-auto max-w-7xl px-6">

        {/* Heading */}

        <div className="mx-auto max-w-3xl text-center">

          <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
            Assessment & Academic Support
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Measuring Progress. Improving Learning.
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Bluegate Publishers provides assessment resources that help
            teachers evaluate learning, identify gaps and support every
            student&rsquo;s academic growth through continuous assessment.
          </p>

        </div>

        {/* Cards */}

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {assessmentFeatures.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
              >

                <div className={`inline-flex rounded-2xl p-4 ${item.bg}`}>

                  <Icon
                    className={item.color}
                    size={34}
                  />

                </div>

                <h3 className="mt-6 text-2xl font-bold text-slate-900">
                  {item.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-600">
                  {item.description}
                </p>

              </div>
            );
          })}

        </div>

        {/* Bottom CTA */}

        <div className="mt-20 rounded-3xl bg-gradient-to-r from-orange-500 to-red-500 p-10 text-white shadow-xl">

          <div className="grid items-center gap-10 lg:grid-cols-2">

            <div>

              <h3 className="text-3xl font-bold">
                Comprehensive Assessment Support
              </h3>

              <p className="mt-5 text-lg leading-8 text-orange-100">
                From classroom practice to final examinations, our
                assessment resources help schools build confident learners
                and measure meaningful progress.
              </p>

            </div>

            <div className="grid gap-4">

              {[
                "Competency-Based Questions",
                "Periodic Assessments",
                "Worksheets",
                "Question Banks",
                "Practice Papers",
              ].map((item) => (

                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl bg-white/10 p-4 backdrop-blur"
                >

                  <CheckCircle2 size={22} />

                  <span className="text-lg">
                    {item}
                  </span>

                </div>

              ))}

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}