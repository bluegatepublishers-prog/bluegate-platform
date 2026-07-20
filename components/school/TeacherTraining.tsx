"use client";

import {
  GraduationCap,
  Users,
  Video,
  FileText,
  Award,
  BookOpen,
} from "lucide-react";

const programs = [
  {
    icon: Users,
    title: "Teacher Workshops",
    description:
      "Interactive workshops that introduce teachers to effective classroom strategies, competency-based teaching and best practices.",
    bg: "bg-blue-50",
    color: "text-blue-600",
  },
  {
    icon: BookOpen,
    title: "Lesson Planning Support",
    description:
      "Ready-to-use lesson plans, annual planners and classroom activities that save teachers valuable preparation time.",
    bg: "bg-emerald-50",
    color: "text-emerald-600",
  },
  {
    icon: Video,
    title: "Training Videos",
    description:
      "Recorded demonstrations and subject-specific training videos to support continuous professional learning.",
    bg: "bg-purple-50",
    color: "text-purple-600",
  },
  {
    icon: FileText,
    title: "Teaching Resources",
    description:
      "Teacher manuals, worksheets, answer keys and classroom presentations to enhance lesson delivery.",
    bg: "bg-orange-50",
    color: "text-orange-600",
  },
  {
    icon: GraduationCap,
    title: "Academic Mentoring",
    description:
      "Continuous guidance from our academic team to help teachers successfully implement our learning programmes.",
    bg: "bg-pink-50",
    color: "text-pink-600",
  },
  {
    icon: Award,
    title: "Professional Development",
    description:
      "Regular orientation sessions and professional learning opportunities to support long-term teacher growth.",
    bg: "bg-cyan-50",
    color: "text-cyan-600",
  },
];

export default function TeacherTraining() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
            Teacher Development
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Supporting Teachers Beyond the Textbook
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            We believe empowered teachers create better learning experiences. Bluegate Publishers provides continuous academic support, professional development and classroom-ready teaching resources.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {programs.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className={`inline-flex rounded-2xl p-4 ${item.bg}`}>
                  <Icon className={item.color} size={34} />
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
      </div>
    </section>
  );
}