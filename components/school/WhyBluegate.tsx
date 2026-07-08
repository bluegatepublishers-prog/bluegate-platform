"use client";

import {
  BookOpen,
  GraduationCap,
  MonitorSmartphone,
  ClipboardCheck,
  Users,
  BadgeCheck,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Curriculum-Aligned Books",
    description:
      "Carefully developed textbooks aligned with CBSE, NEP 2020 and competency-based learning standards.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: GraduationCap,
    title: "Teacher Empowerment",
    description:
      "Lesson plans, teaching guides, orientation programs and continuous academic support for educators.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: MonitorSmartphone,
    title: "Digital Learning",
    description:
      "QR-enabled resources, eBooks, videos and interactive digital content for blended classrooms.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: ClipboardCheck,
    title: "Assessment Support",
    description:
      "Worksheets, question banks, competency-based assessments and periodic evaluation resources.",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: Users,
    title: "School Partnership",
    description:
      "We work closely with schools through training, implementation support and continuous collaboration.",
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
  {
    icon: BadgeCheck,
    title: "Quality Publishing",
    description:
      "Premium design, engaging content and high production standards that enhance classroom learning.",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
];

export default function WhyBluegate() {
  return (
    <section className="bg-slate-50 py-24">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto max-w-3xl text-center">

          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Why Bluegate Publishers
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Why Schools Choose Bluegate
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            We go beyond publishing textbooks. Our goal is to provide
            schools with a complete teaching and learning ecosystem
            that supports teachers, engages students and improves
            learning outcomes.
          </p>

        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {features.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="group rounded-3xl bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
              >

                <div
                  className={`mb-6 inline-flex rounded-2xl p-4 ${item.bg}`}
                >
                  <Icon
                    className={item.color}
                    size={34}
                  />
                </div>

                <h3 className="text-2xl font-bold text-slate-900">
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