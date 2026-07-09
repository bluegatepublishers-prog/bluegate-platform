"use client";

import {
  CheckCircle2,
  Clock3,
  BookOpen,
  Laptop,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    title: "Curriculum Aligned",
    description:
      "Resources mapped to CBSE, NEP 2020 and modern classroom practices.",
    icon: BookOpen,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Ready to Teach",
    description:
      "Use lesson plans, PPTs and worksheets instantly in your classroom.",
    icon: CheckCircle2,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Save Teaching Time",
    description:
      "Reduce preparation time with professionally designed resources.",
    icon: Clock3,
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Digital Learning",
    description:
      "QR-enabled videos and digital teaching support for every subject.",
    icon: Laptop,
    color: "bg-purple-50 text-purple-600",
  },
  {
    title: "Professional Growth",
    description:
      "Teacher training, webinars and academic development resources.",
    icon: GraduationCap,
    color: "bg-pink-50 text-pink-600",
  },
  {
    title: "Verified Resources",
    description:
      "Content reviewed by experienced educators and subject experts.",
    icon: ShieldCheck,
    color: "bg-indigo-50 text-indigo-600",
  },
];

export default function WhyTeacherHub() {
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto mb-16 max-w-3xl text-center">

          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-700">
            WHY BLUEGATE
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Designed for Modern Teachers
          </h2>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            Bluegate Teacher Hub is more than a download portal.
            It is a complete teaching support platform that helps
            educators plan lessons, engage students and save time.
          </p>

        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${feature.color}`}
                >
                  <Icon size={30} />
                </div>

                <h3 className="mt-6 text-2xl font-bold text-slate-900">
                  {feature.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-600">
                  {feature.description}
                </p>
              </div>
            );
          })}

        </div>

      </div>
    </section>
  );
}