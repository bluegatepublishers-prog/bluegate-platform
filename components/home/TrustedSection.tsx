import {
  ShieldCheck,
  BookOpen,
  Users,
  GraduationCap,
  Brain,
  BadgeCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    title: "Curriculum Excellence",
    description:
      "Comprehensive textbooks designed according to NEP 2020 and the latest curriculum framework.",
    icon: BookOpen,
    color: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    title: "Teacher Empowerment",
    description:
      "Lesson plans, worksheets, presentations and continuous classroom support.",
    icon: Users,
    color: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    title: "Digital Learning",
    description:
      "Interactive resources, videos and digital teaching support for modern classrooms.",
    icon: GraduationCap,
    color: "bg-purple-50",
    iconColor: "text-violet-600",
  },
  {
    title: "Assessment Support",
    description:
      "Question banks, competency-based assessments and practice resources.",
    icon: ShieldCheck,
    color: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    title: "Future Skills",
    description:
      "Artificial Intelligence, Coding, Financial Literacy and 21st Century Skills.",
    icon: Brain,
    color: "bg-pink-50",
    iconColor: "text-pink-600",
  },
  {
    title: "Academic Partnership",
    description:
      "Long-term collaboration helping schools achieve academic excellence.",
    icon: BadgeCheck,
    color: "bg-cyan-50",
    iconColor: "text-cyan-600",
  },
];

const trustPoints = [
  "NEP 2020 Aligned Curriculum",
  "Competency Based Learning",
  "Activity Based Pedagogy",
  "Teacher Friendly Resources",
  "Digital Learning Support",
  "Future Ready Education",
];

export default function TrustedSection() {
  return (
    <section className="bg-gradient-to-br from-slate-50 via-white to-blue-50 py-24">

      <div className="mx-auto max-w-7xl px-6">

        {/* Heading */}

        <div className="mx-auto max-w-4xl text-center">

          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-700">
            WHY LEADING SCHOOLS CHOOSE BLUEGATE
          </span>

          <h2 className="mt-6 text-5xl font-bold text-[#083A75]">
            More Than a Publisher,
            <br />
            Your Academic Partner
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            We don't simply publish textbooks. We create complete
            educational experiences that empower teachers,
            engage learners and help schools deliver meaningful,
            future-ready education.
          </p>

        </div>

        {/* Story + Trust */}

        <div className="mt-20 grid gap-14 lg:grid-cols-[1.3fr_0.7fr]">

          {/* Story */}

          <div>

            <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-2 font-semibold text-yellow-700">

              <Sparkles size={18} />

              Our Commitment

            </div>

            <h3 className="mt-6 text-3xl font-bold text-slate-900">
              Every Book is Created with Purpose
            </h3>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              Bluegate Publishers believes that education should
              inspire curiosity, creativity and confidence.
              Every publication is carefully developed by
              experienced educators to make classroom learning
              engaging, practical and enjoyable.
            </p>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              Beyond textbooks, we support schools with teacher
              resources, digital learning materials, assessments
              and innovative academic solutions that prepare
              students for tomorrow's challenges.
            </p>

          </div>

          {/* Trust Panel */}

          <div className="rounded-[32px] bg-white p-8 shadow-xl">

            <h3 className="text-2xl font-bold text-slate-900">
              Why Schools Trust Us
            </h3>

            <div className="mt-8 space-y-5">

              {trustPoints.map((point) => (

                <div
                  key={point}
                  className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4"
                >

                  <CheckCircle2
                    className="text-emerald-500"
                    size={22}
                  />

                  <span className="font-medium text-slate-700">
                    {point}
                  </span>

                </div>

              ))}

            </div>

          </div>

        </div>

        {/* Feature Cards */}

        <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-xl"
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${feature.color}`}
                >
                  <Icon
                    size={30}
                    className={feature.iconColor}
                  />
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

        {/* Quote Section */}

        <div className="mt-24 overflow-hidden rounded-[36px] bg-gradient-to-r from-[#083A75] via-blue-700 to-sky-600 p-12 text-center text-white shadow-2xl">

          <div className="mx-auto max-w-4xl">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15">

              <Sparkles size={36} />

            </div>

            <blockquote className="mt-8 text-3xl font-bold leading-relaxed lg:text-4xl">
              “Education is not about completing a syllabus.
              It is about inspiring curiosity, confidence
              and lifelong learning.”
            </blockquote>

            <div className="mt-8 h-1 w-24 rounded-full bg-white/40 mx-auto" />

            <p className="mt-8 text-xl font-semibold tracking-wide">
              — Bluegate Publishers
            </p>

            <p className="mt-3 text-blue-100">
              Inspiring Minds • Empowering Teachers • Transforming Education
            </p>

          </div>

        </div>

      </div>
    </section>
  );
}