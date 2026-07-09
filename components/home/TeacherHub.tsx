"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  FileText,
  MonitorPlay,
  Presentation,
  Sparkles,
} from "lucide-react";

const resources = [
  {
    icon: BookOpen,
    title: "Lesson Plans",
    description: "Ready-to-use chapter-wise lesson plans for effective classroom teaching.",
  },
  {
    icon: FileText,
    title: "Worksheets",
    description: "Printable practice worksheets with competency-based activities.",
  },
  {
    icon: Presentation,
    title: "PPT Presentations",
    description: "Interactive classroom presentations for every chapter.",
  },
  {
    icon: ClipboardCheck,
    title: "Assessments",
    description: "Question banks, tests and assessment resources for teachers.",
  },
  {
    icon: MonitorPlay,
    title: "Teaching Videos",
    description: "Engaging video content to make learning interactive.",
  },
  {
    icon: Sparkles,
    title: "AI Teaching Resources",
    description: "Smart classroom resources powered by Artificial Intelligence.",
  },
];

export default function TeacherHub() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-24">
      {/* Background Effects */}
      <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left */}
          <div>
            <span className="inline-flex rounded-full bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-200">
              Teacher Hub
            </span>

            <h2 className="mt-6 text-4xl font-bold leading-tight text-white md:text-5xl">
              Everything Teachers Need
              <span className="block text-blue-400">
                All in One Place
              </span>
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-300">
              Bluegate Teacher Hub is designed to empower teachers with
              lesson plans, worksheets, presentations, assessments,
              teaching videos and AI-powered classroom resources.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/teacher-hub"
                className="inline-flex items-center rounded-xl bg-blue-600 px-7 py-4 font-semibold text-white transition hover:bg-blue-700"
              >
                Explore Teacher Hub
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>

              <Link
                href="/teacher-login"
                className="inline-flex items-center rounded-xl border border-white/30 px-7 py-4 font-semibold text-white transition hover:bg-white hover:text-slate-900"
              >
                Teacher Login
              </Link>
            </div>
          </div>

          {/* Right */}
          <div className="grid gap-6 sm:grid-cols-2">
            {resources.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-blue-400 hover:bg-white/15"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    <Icon size={28} />
                  </div>

                  <h3 className="text-xl font-bold text-white">
                    {item.title}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-300">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}