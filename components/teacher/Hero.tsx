"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Background Decoration */}
      <div className="absolute inset-0">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-100/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left Content */}
          <div>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              <GraduationCap className="mr-2 h-4 w-4" />
              Bluegate Teacher Hub
            </span>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
              Empowering
              <span className="block text-blue-700">
                Teachers to Inspire
              </span>
              Every Classroom
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Access professionally developed lesson plans, worksheets,
              presentations, question banks, teacher manuals, and classroom
              resources designed to make teaching more engaging, effective,
              and inspiring.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/teacher-login"
                className="inline-flex items-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Teacher Login
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>

              <Link
                href="#resources"
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
              >
                Browse Resources
              </Link>
            </div>

            {/* Quick Highlights */}
            <div className="mt-12 grid grid-cols-3 gap-6">
              <div>
                <p className="text-3xl font-bold text-blue-700">450+</p>
                <p className="mt-1 text-sm text-slate-600">
                  Teaching Resources
                </p>
              </div>

              <div>
                <p className="text-3xl font-bold text-blue-700">120+</p>
                <p className="mt-1 text-sm text-slate-600">
                  Lesson Plans
                </p>
              </div>

              <div>
                <p className="text-3xl font-bold text-blue-700">50+</p>
                <p className="mt-1 text-sm text-slate-600">
                  Training Videos
                </p>
              </div>
            </div>
          </div>

          {/* Right Card */}
          <div className="relative">
            <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-xl">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100">
                <BookOpen className="h-10 w-10 text-blue-700" />
              </div>

              <h2 className="mt-8 text-2xl font-bold text-slate-900">
                Professional Teacher Resources
              </h2>

              <p className="mt-4 leading-7 text-slate-600">
                Explore curriculum-aligned teaching materials created by
                experienced educators to support classroom instruction,
                assessment, and professional development.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Lesson Plans",
                  "Printable Worksheets",
                  "Question Banks",
                  "Answer Keys",
                  "Interactive PPTs",
                  "Teacher Manuals",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <div className="mr-3 h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span className="font-medium text-slate-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href="#resources"
                className="mt-8 inline-flex items-center font-semibold text-blue-700 hover:text-blue-800"
              >
                Explore Resources
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}