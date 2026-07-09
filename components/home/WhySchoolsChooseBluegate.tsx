"use client";

import {
  Award,
  BookOpen,
  Building2,
  GraduationCap,
  Headphones,
  Users,
} from "lucide-react";

const reasons = [
  {
    icon: Building2,
    title: "Trusted School Partner",
    description:
      "Building long-term relationships with schools through quality educational solutions and academic support.",
  },
  {
    icon: BookOpen,
    title: "Comprehensive Book Series",
    description:
      "A complete range of textbooks developed for holistic learning across multiple subjects and grades.",
  },
  {
    icon: GraduationCap,
    title: "Expert Academic Team",
    description:
      "Experienced educators and subject specialists create content aligned with modern educational practices.",
  },
  {
    icon: Award,
    title: "Quality First",
    description:
      "Every publication is carefully designed to deliver clarity, creativity and better classroom outcomes.",
  },
  {
    icon: Users,
    title: "Teacher Empowerment",
    description:
      "Teachers receive lesson plans, worksheets, assessments and classroom support to make teaching easier.",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description:
      "Our academic and customer support teams work closely with schools throughout the academic session.",
  },
];

export default function TrustedSection() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-700">
            Why Leading Schools Choose Bluegate
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900 md:text-5xl">
            Empowering Schools with
            <span className="block text-blue-700">
              Quality Education Solutions
            </span>
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Schools trust Bluegate Publishers because we combine innovative
            educational content, experienced academic expertise and dedicated
            support to create better learning experiences for every classroom.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {reasons.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="group rounded-3xl border border-slate-200 bg-slate-50 p-8 transition-all duration-300 hover:-translate-y-2 hover:border-blue-600 hover:bg-white hover:shadow-2xl"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white transition-transform duration-300 group-hover:scale-110">
                  <Icon size={30} />
                </div>

                <h3 className="mb-4 text-2xl font-bold text-slate-900">
                  {item.title}
                </h3>

                <p className="leading-7 text-slate-600">
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