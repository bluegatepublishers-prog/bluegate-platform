"use client";

import {
  BookOpen,
  GraduationCap,
  Laptop,
  Medal,
  School,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "NCF & NEP Aligned",
    description:
      "Books carefully developed according to the latest National Education Policy and NCF guidelines.",
  },
  {
    icon: GraduationCap,
    title: "Competency-Based Learning",
    description:
      "Designed to develop conceptual understanding, critical thinking and real-life application.",
  },
  {
    icon: School,
    title: "Trusted by Schools",
    description:
      "Schools across India rely on Bluegate for quality educational content and academic excellence.",
  },
  {
    icon: Laptop,
    title: "Digital Resources",
    description:
      "Teacher manuals, lesson plans, worksheets, PPTs and digital support for effective teaching.",
  },
  {
    icon: Medal,
    title: "Experienced Authors",
    description:
      "Created by experienced educators, subject experts and curriculum specialists.",
  },
  {
    icon: ShieldCheck,
    title: "Academic Support",
    description:
      "Continuous support for principals, coordinators and teachers throughout the academic year.",
  },
];

export default function WhyBluegate() {
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="inline-block rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-700">
            Why Bluegate Publishers
          </span>

          <h2 className="mt-5 text-4xl font-bold text-slate-900 md:text-5xl">
            Building Better Learning
            <span className="block text-blue-700">
              for Every Classroom
            </span>
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Bluegate Publishers combines quality content, innovative teaching
            resources and academic excellence to help schools create meaningful
            learning experiences for every student.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {features.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-600 hover:shadow-xl"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white transition group-hover:scale-110">
                  <Icon size={30} />
                </div>

                <h3 className="mb-3 text-2xl font-bold text-slate-900">
                  {item.title}
                </h3>

                <p className="leading-7 text-slate-600">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}