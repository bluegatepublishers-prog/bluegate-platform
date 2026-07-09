"use client";

import {
  Users,
  BookOpen,
  School,
  Download,
  Star,
  Award,
} from "lucide-react";

const stats = [
  {
    value: "5,000+",
    label: "Registered Teachers",
    icon: Users,
    color: "bg-blue-50 text-blue-600",
  },
  {
    value: "450+",
    label: "Teaching Resources",
    icon: BookOpen,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    value: "500+",
    label: "Partner Schools",
    icon: School,
    color: "bg-orange-50 text-orange-600",
  },
  {
    value: "25,000+",
    label: "Resource Downloads",
    icon: Download,
    color: "bg-purple-50 text-purple-600",
  },
  {
    value: "98%",
    label: "Teacher Satisfaction",
    icon: Star,
    color: "bg-pink-50 text-pink-600",
  },
  {
    value: "100%",
    label: "NEP 2020 Aligned",
    icon: Award,
    color: "bg-indigo-50 text-indigo-600",
  },
];

export default function TeacherStats() {
  return (
    <section className="bg-gradient-to-br from-[#083A75] via-[#0B5ED7] to-[#2F80ED] py-20">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto max-w-3xl text-center">

          <span className="rounded-full bg-white/20 px-5 py-2 text-sm font-semibold text-white">
            BLUEGATE IMPACT
          </span>

          <h2 className="mt-6 text-4xl font-bold text-white">
            Supporting Teachers Across India
          </h2>

          <p className="mt-4 text-lg leading-8 text-blue-100">
            Bluegate Teacher Hub is helping educators save time,
            improve classroom engagement and deliver better
            learning experiences every day.
          </p>

        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-3xl bg-white p-8 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
              >

                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${stat.color}`}
                >
                  <Icon size={30} />
                </div>

                <h3 className="mt-8 text-4xl font-bold text-slate-900">
                  {stat.value}
                </h3>

                <p className="mt-3 text-lg text-slate-600">
                  {stat.label}
                </p>

              </div>
            );
          })}

        </div>

      </div>

    </section>
  );
}