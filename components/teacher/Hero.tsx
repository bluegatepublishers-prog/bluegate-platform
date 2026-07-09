"use client";

import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  BookOpen,
  FileText,
  Presentation,
  Video,
  FileCheck,
  BookMarked,
} from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-orange-50">

      {/* Background */}

      <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-sky-100 blur-3xl opacity-60" />

      <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-orange-100 blur-3xl opacity-70" />

      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">

        <div className="grid items-center gap-20 lg:grid-cols-2">

          {/* LEFT */}

          <div>

            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-[#0B5ED7]">

              <GraduationCap size={18} />

              Bluegate Teacher Hub

            </span>

            <h1 className="mt-8 text-5xl font-bold leading-tight text-slate-900 lg:text-6xl">

              Empowering Teachers

              <span className="block text-[#0B5ED7]">
                Inspiring Every Classroom
              </span>

            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-9 text-slate-600">

              Discover premium lesson plans, classroom
              presentations, worksheets, assessments,
              videos and teaching resources developed
              by experienced educators for modern
              classrooms.

            </p>

            {/* Buttons */}

            <div className="mt-10 flex flex-wrap gap-4">

              <Link
                href="/teacher-login"
                className="flex h-14 items-center rounded-xl bg-[#0B5ED7] px-8 font-semibold text-white transition hover:bg-[#083A75]"
              >
                Teacher Login

                <ArrowRight className="ml-2 h-5 w-5" />

              </Link>

              <Link
                href="#resources"
                className="flex h-14 items-center rounded-xl border border-slate-300 bg-white px-8 font-semibold text-slate-700 transition hover:border-[#0B5ED7] hover:text-[#0B5ED7]"
              >
                Browse Resources

              </Link>

            </div>

            {/* Statistics */}

            <div className="mt-14 grid grid-cols-2 gap-5 md:grid-cols-4">

              <StatCard
                value="450+"
                label="Resources"
                color="text-blue-600"
              />

              <StatCard
                value="120+"
                label="Lesson Plans"
                color="text-emerald-600"
              />

              <StatCard
                value="50+"
                label="Videos"
                color="text-orange-500"
              />

              <StatCard
                value="500+"
                label="Schools"
                color="text-purple-600"
              />

            </div>

          </div>

          {/* RIGHT */}

          <div>

            {/* Main Icon */}

            <div className="mx-auto flex h-72 w-72 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 via-white to-emerald-100 shadow-2xl">

              <div className="flex h-48 w-48 items-center justify-center rounded-full bg-white shadow-lg">

                <GraduationCap
                  size={110}
                  className="text-[#0B5ED7]"
                />

              </div>

            </div>

            {/* Resource Grid */}

            <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3">

              <ResourceCard
                icon={<BookOpen />}
                title="Lesson Plans"
                color="blue"
              />

              <ResourceCard
                icon={<Presentation />}
                title="PPTs"
                color="orange"
              />

              <ResourceCard
                icon={<Video />}
                title="Videos"
                color="purple"
              />

              <ResourceCard
                icon={<FileText />}
                title="Worksheets"
                color="emerald"
              />
                            <ResourceCard
                icon={<BookMarked />}
                title="Teacher Manuals"
                color="pink"
              />

              <ResourceCard
                icon={<FileCheck />}
                title="Question Bank"
                color="indigo"
              />

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}

interface StatCardProps {
  value: string;
  label: string;
  color: string;
}

function StatCard({
  value,
  label,
  color,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">

      <h3 className={`text-3xl font-bold ${color}`}>
        {value}
      </h3>

      <p className="mt-2 text-sm text-slate-600">
        {label}
      </p>

    </div>
  );
}

interface ResourceCardProps {
  icon: React.ReactNode;
  title: string;
  color:
    | "blue"
    | "orange"
    | "purple"
    | "emerald"
    | "pink"
    | "indigo";
}

function ResourceCard({
  icon,
  title,
  color,
}: ResourceCardProps) {
  const styles = {
    blue: {
      bg: "bg-blue-50",
      icon: "text-blue-600",
    },
    orange: {
      bg: "bg-orange-50",
      icon: "text-orange-600",
    },
    purple: {
      bg: "bg-purple-50",
      icon: "text-purple-600",
    },
    emerald: {
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
    },
    pink: {
      bg: "bg-pink-50",
      icon: "text-pink-600",
    },
    indigo: {
      bg: "bg-indigo-50",
      icon: "text-indigo-600",
    },
  };

  const style = styles[color];

  return (
    <div
      className={`rounded-2xl border border-slate-200 ${style.bg} p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
    >
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white ${style.icon}`}
      >
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        {title}
      </h3>
    </div>
  );
}