"use client";

import Link from "next/link";
import {
  BookOpen,
  FileText,
 ClipboardList,
  Presentation,
  Video,
 FileQuestion,
  ArrowRight,
} from "lucide-react";

const actions = [
  {
    title: "Browse Resources",
    description: "Explore all teaching resources",
    href: "/teacher-hub",
    icon: BookOpen,
    color: "bg-blue-100 text-blue-700",
  },
  {
    title: "Lesson Plans",
    description: "Ready-to-use classroom plans",
    href: "/teacher-hub/lesson-plans",
    icon: FileText,
    color: "bg-green-100 text-green-700",
  },
  {
    title: "Worksheets",
    description: "Printable classroom worksheets",
    href: "/teacher-hub/worksheets",
    icon: ClipboardList,
    color: "bg-orange-100 text-orange-700",
  },
  {
    title: "Presentations",
    description: "Interactive PPT resources",
    href: "/teacher-hub/ppt",
    icon: Presentation,
    color: "bg-purple-100 text-purple-700",
  },
  {
    title: "Training Videos",
    description: "Professional development videos",
    href: "/teacher-hub/videos",
    icon: Video,
    color: "bg-red-100 text-red-700",
  },
  {
    title: "Question Banks",
    description: "Assessment & practice questions",
    href: "/teacher-hub/question-banks",
    icon: FileQuestion,
    color: "bg-cyan-100 text-cyan-700",
  },
];

export default function QuickActions() {
  return (
    <section className="py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              Quick Actions
            </span>

            <h2 className="mt-5 text-3xl font-bold text-slate-900">
              Start Teaching Faster
            </h2>

            <p className="mt-3 max-w-2xl text-slate-600">
              Quickly access the teaching resources you use most often without
              searching through the entire library.
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.title}
                href={action.href}
                className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-lg"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-xl ${action.color}`}
                >
                  <Icon className="h-7 w-7" />
                </div>

                <h3 className="mt-6 text-xl font-semibold text-slate-900">
                  {action.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {action.description}
                </p>

                <div className="mt-6 flex items-center font-semibold text-blue-700">
                  Open

                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}