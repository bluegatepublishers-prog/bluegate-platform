"use client";

import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  MonitorSmartphone,
  School,
  Brain,
  ArrowRight,
} from "lucide-react";

const solutions = [
  {
    icon: BookOpen,
    title: "Curriculum Textbooks",
    description:
      "NCERT, CBSE and NEP 2020 aligned textbooks designed to build strong conceptual understanding.",
    color: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: ClipboardCheck,
    title: "Assessment Solutions",
    description:
      "Worksheets, question banks, periodic tests, competency-based assessments and evaluation tools.",
    color: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    icon: GraduationCap,
    title: "Teacher Resources",
    description:
      "Teacher manuals, lesson plans, classroom activities, answer keys and professional development support.",
    color: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    icon: MonitorSmartphone,
    title: "Digital Learning",
    description:
      "QR-enabled books, videos, eBooks, interactive resources and blended learning support.",
    color: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    icon: School,
    title: "School Academic Support",
    description:
      "Curriculum planning, implementation guidance, orientation programmes and academic consultancy.",
    color: "bg-pink-50",
    iconColor: "text-pink-600",
  },
  {
    icon: Brain,
    title: "Competency-Based Learning",
    description:
      "Experiential learning, critical thinking, life skills and project-based activities aligned with NEP 2020.",
    color: "bg-cyan-50",
    iconColor: "text-cyan-600",
  },
];

export default function SolutionsGrid() {
  return (
    <section className="bg-white py-24">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto max-w-3xl text-center">

          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Complete School Solutions
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Everything Your School Needs
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Bluegate Publishers offers a comprehensive ecosystem of
            educational resources that support schools, teachers and
            students at every stage of the learning journey.
          </p>

        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {solutions.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
              >

                <div
                  className={`inline-flex rounded-2xl p-4 ${item.color}`}
                >
                  <Icon
                    className={item.iconColor}
                    size={34}
                  />
                </div>

                <h3 className="mt-6 text-2xl font-bold text-slate-900">
                  {item.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-600">
                  {item.description}
                </p>

                <button
                  className="mt-8 inline-flex items-center gap-2 font-semibold text-blue-600 transition group-hover:gap-3"
                >
                  Learn More

                  <ArrowRight size={18} />
                </button>

              </div>
            );
          })}

        </div>

      </div>

    </section>
  );
}