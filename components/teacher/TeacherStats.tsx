"use client";

import { BookOpen, FileText, Video, School, ArrowRight } from "lucide-react";
import Link from "next/link";

const stats = [
  {
    title: "Teaching Resources",
    value: "450+",
    description: "Curriculum-aligned teaching materials",
    icon: BookOpen,
    color: "bg-blue-100 text-blue-700",
  },
  {
    title: "Lesson Plans",
    value: "120+",
    description: "Ready-to-use classroom lesson plans",
    icon: FileText,
    color: "bg-green-100 text-green-700",
  },
  {
    title: "Training Videos",
    value: "50+",
    description: "Professional teacher development videos",
    icon: Video,
    color: "bg-red-100 text-red-700",
  },
  {
    title: "Partner Schools",
    value: "200+",
    description: "Schools using Bluegate resources",
    icon: School,
    color: "bg-purple-100 text-purple-700",
  },
];

export default function TeacherStats() {
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Bluegate Community
          </span>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">
            Supporting Teachers Across India
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Bluegate Publishers is committed to empowering educators with
            high-quality teaching resources, professional development, and
            innovative classroom support.
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-xl"
              >
                <div
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${stat.color}`}
                >
                  <Icon className="h-8 w-8" />
                </div>

                <h3 className="mt-6 text-4xl font-bold text-slate-900">
                  {stat.value}
                </h3>

                <h4 className="mt-3 text-lg font-semibold text-slate-900">
                  {stat.title}
                </h4>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-20 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 p-10 lg:p-14">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="rounded-full bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300">
                Join Our Teaching Community
              </span>

              <h3 className="mt-6 text-3xl font-bold text-white">
                Become Part of the Bluegate Teacher Network
              </h3>

              <p className="mt-5 text-lg leading-8 text-slate-300">
                Gain access to premium educational resources, teacher training,
                classroom activities, assessments, and exclusive academic
                support designed to enhance teaching and learning.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
              <Link
                href="/teacher-login"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Teacher Login
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-transparent px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                Partner With Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}