"use client";

import {
  BookOpen,
  GraduationCap,
  Users,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function LoginHero() {
  const features = [
    "Access premium teaching resources",
    "Download lesson plans & worksheets",
    "Question banks and answer keys",
    "Teacher manuals & presentations",
    "Training videos and webinars",
  ];

  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 lg:flex lg:flex-col lg:justify-between">
      {/* Background Decoration */}
      <div className="absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative flex h-full flex-col justify-between p-14">
        {/* Top */}
        <div>
          <div className="inline-flex items-center rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-blue-100 backdrop-blur">
            <GraduationCap className="mr-2 h-4 w-4" />
            Bluegate Teacher Portal
          </div>

          <h1 className="mt-8 text-5xl font-bold leading-tight text-white">
            Empowering
            <br />
            Teachers
            <br />
            Every Day
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-8 text-blue-100">
            Access curriculum-aligned teaching resources, classroom
            presentations, worksheets, lesson plans, question banks,
            assessment materials and professional development tools from
            Bluegate Publishers.
          </p>

          {/* Features */}
          <div className="mt-12 space-y-5">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center"
              >
                <CheckCircle2 className="mr-4 h-6 w-6 text-green-300" />

                <span className="text-blue-50">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Cards */}
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <BookOpen className="h-8 w-8 text-blue-200" />

            <h3 className="mt-4 text-3xl font-bold text-white">
              450+
            </h3>

            <p className="mt-2 text-sm text-blue-100">
              Teaching Resources
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <Users className="h-8 w-8 text-blue-200" />

            <h3 className="mt-4 text-3xl font-bold text-white">
              200+
            </h3>

            <p className="mt-2 text-sm text-blue-100">
              Partner Schools
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <ShieldCheck className="h-8 w-8 text-blue-200" />

            <h3 className="mt-4 text-3xl font-bold text-white">
              Secure
            </h3>

            <p className="mt-2 text-sm text-blue-100">
              Teacher Access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}