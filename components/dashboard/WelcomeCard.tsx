"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Sparkles,
  School,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";

export default function WelcomeCard() {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 shadow-xl">
      <div className="relative px-8 py-10 lg:px-12 lg:py-12">
        {/* Background Decorations */}
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-2">
          {/* Left */}
          <div>
            <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100 backdrop-blur">
              <Sparkles className="mr-2 h-4 w-4" />
              Welcome Back
            </span>

            <h1 className="mt-6 text-4xl font-bold text-white lg:text-5xl">
              Good Morning,
              <br />
              Teacher
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-blue-100">
              Welcome to your Bluegate Teacher Dashboard. Access teaching
              resources, manage downloads, discover new classroom materials,
              and stay updated with the latest academic content.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/teacher-hub"
                className="inline-flex items-center rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 transition hover:bg-slate-100"
              >
                Browse Resources
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>

              <Link
                href="/teacher-dashboard/downloads"
                className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                My Downloads
              </Link>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center">
            <div className="w-full rounded-3xl bg-white p-8 shadow-lg">
              <h2 className="text-xl font-bold text-slate-900">
                Teacher Overview
              </h2>

              <div className="mt-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <School className="h-5 w-5 text-blue-600" />
                    <span className="text-slate-600">School</span>
                  </div>

                  <span className="font-semibold text-slate-900">
                    ABC Public School
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    <span className="text-slate-600">Role</span>
                  </div>

                  <span className="font-semibold text-slate-900">
                    Verified Teacher
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <span className="text-slate-600">Assigned Books</span>
                  </div>

                  <span className="font-semibold text-slate-900">
                    12 Books
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                    <span className="text-slate-600">Today</span>
                  </div>

                  <span className="font-semibold text-slate-900">
                    {today}
                  </span>
                </div>
              </div>

              <div className="mt-8 rounded-2xl bg-green-50 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 text-green-600" />

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Teaching Tip of the Day
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Begin each lesson with a simple real-life example.
                      Connecting concepts to everyday experiences helps
                      students understand and remember ideas more effectively.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* End Grid */}
      </div>
    </section>
  );
}