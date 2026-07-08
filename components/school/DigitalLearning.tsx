"use client";

import {
  QrCode,
  MonitorPlay,
  BookOpen,
  Laptop,
  Cloud,
  Smartphone,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "QR Enabled Books",
    description:
      "Every chapter can connect learners to videos, activities and additional learning resources through QR codes.",
    color: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: MonitorPlay,
    title: "Educational Videos",
    description:
      "Concept-based videos help students understand topics visually and make classroom learning more engaging.",
    color: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    icon: BookOpen,
    title: "Digital eBooks",
    description:
      "Access textbooks anytime on digital devices, making learning flexible both in school and at home.",
    color: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    icon: Laptop,
    title: "Interactive Learning",
    description:
      "Digital worksheets, quizzes and classroom activities encourage active participation and self-learning.",
    color: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    icon: Cloud,
    title: "Online Teacher Resources",
    description:
      "Teachers receive presentations, lesson plans, answer keys and classroom support through online resources.",
    color: "bg-cyan-50",
    iconColor: "text-cyan-600",
  },
  {
    icon: Smartphone,
    title: "Learning Anywhere",
    description:
      "Students can continue learning beyond the classroom using mobile-friendly digital resources.",
    color: "bg-pink-50",
    iconColor: "text-pink-600",
  },
];

export default function DigitalLearning() {
  return (
    <section className="bg-slate-50 py-24">

      <div className="mx-auto max-w-7xl px-6">

        {/* Heading */}

        <div className="mx-auto max-w-3xl text-center">

          <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700">
            Digital Learning Solutions
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Learning Beyond the Printed Page
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Bluegate Publishers combines quality textbooks with digital
            resources to create engaging, technology-enabled learning
            experiences for modern classrooms.
          </p>

        </div>

        {/* Feature Cards */}

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {features.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="rounded-3xl bg-white p-8 shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
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

              </div>
            );
          })}

        </div>

        {/* Bottom Banner */}

        <div className="mt-20 rounded-3xl bg-gradient-to-r from-purple-600 to-blue-600 p-10 text-white">

          <div className="grid items-center gap-10 lg:grid-cols-2">

            <div>

              <h3 className="text-3xl font-bold">
                A Complete Blended Learning Experience
              </h3>

              <p className="mt-5 text-lg leading-8 text-purple-100">
                Our print and digital resources work together to create
                engaging classrooms where students learn through books,
                videos, activities and interactive practice.
              </p>

            </div>

            <div className="space-y-5">

              {[
                "QR Enabled Chapters",
                "Interactive Activities",
                "Video Lessons",
                "Teacher Resources",
                "Digital Worksheets",
              ].map((item) => (

                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl bg-white/10 p-4 backdrop-blur"
                >

                  <CheckCircle2 size={22} />

                  <span className="text-lg">
                    {item}
                  </span>

                </div>

              ))}

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}