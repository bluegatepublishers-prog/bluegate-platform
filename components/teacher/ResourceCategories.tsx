"use client";

import Link from "next/link";
import {
  BookOpen,
  Presentation,
  FileText,
  Video,
  BookMarked,
  FileCheck,
  ArrowRight,
} from "lucide-react";

const categories = [
  {
    title: "Lesson Plans",
    description:
      "Ready-to-teach lesson plans for every chapter.",
    href: "/teacher-login",
    icon: BookOpen,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Interactive PPTs",
    description:
      "Engaging classroom presentations.",
    href: "/teacher-login",
    icon: Presentation,
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Worksheets",
    description:
      "Practice and assessment worksheets.",
    href: "/teacher-login",
    icon: FileText,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Video Lessons",
    description:
      "Digital learning videos for classrooms.",
    href: "/teacher-login",
    icon: Video,
    color: "bg-purple-50 text-purple-600",
  },
  {
    title: "Teacher Manuals",
    description:
      "Teaching guides and instructional support.",
    href: "/teacher-login",
    icon: BookMarked,
    color: "bg-pink-50 text-pink-600",
  },
  {
    title: "Question Bank",
    description:
      "Question papers and assessment resources.",
    href: "/teacher-login",
    icon: FileCheck,
    color: "bg-indigo-50 text-indigo-600",
  },
];

export default function ResourceCategories() {
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto mb-14 max-w-3xl text-center">

          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-700">
            RESOURCE CATEGORIES
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Everything a Teacher Needs
          </h2>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            Bluegate provides a complete collection of classroom
            resources designed to simplify teaching and improve
            student learning outcomes.
          </p>

        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {categories.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >

                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${item.color}`}
                >
                  <Icon size={32} />
                </div>

                <h3 className="mt-6 text-2xl font-bold text-slate-900">
                  {item.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {item.description}
                </p>

                <div className="mt-8 inline-flex items-center gap-2 font-semibold text-[#0B5ED7] group-hover:gap-3 transition-all">
                  Unlock Resource

                  <ArrowRight size={18} />
                </div>

              </Link>
            );
          })}

        </div>

      </div>
    </section>
  );
}