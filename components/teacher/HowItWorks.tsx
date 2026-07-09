"use client";

import {
  UserPlus,
  BadgeCheck,
  Download,
  GraduationCap,
} from "lucide-react";

const steps = [
  {
    title: "Register",
    description:
      "Create your Bluegate Teacher account using your school details.",
    icon: UserPlus,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "School Verification",
    description:
      "Our academic team verifies your school and teacher profile.",
    icon: BadgeCheck,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Unlock Resources",
    description:
      "Get access to lesson plans, PPTs, worksheets and manuals.",
    icon: GraduationCap,
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Download Anytime",
    description:
      "Access premium teaching resources whenever you need them.",
    icon: Download,
    color: "bg-purple-50 text-purple-600",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-white py-20">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto mb-16 max-w-3xl text-center">

          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-700">
            HOW IT WORKS
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Start Teaching Smarter
          </h2>

          <p className="mt-4 text-lg text-slate-600">
            Join Bluegate Teacher Hub in four simple steps.
          </p>

        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">

          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="relative rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
              >

                <div className="absolute right-6 top-6 text-5xl font-bold text-slate-100">
                  {index + 1}
                </div>

                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${step.color}`}
                >
                  <Icon size={30} />
                </div>

                <h3 className="mt-6 text-2xl font-bold text-slate-900">
                  {step.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-600">
                  {step.description}
                </p>

              </div>
            );
          })}

        </div>

      </div>

    </section>
  );
}