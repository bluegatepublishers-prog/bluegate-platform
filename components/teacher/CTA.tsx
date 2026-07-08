"use client";

import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  School,
  Mail,
  CheckCircle2,
} from "lucide-react";

export default function CTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 py-24">
      {/* Background Decoration */}
      <div className="absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          {/* Badge */}
          <span className="inline-flex items-center rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-blue-100 backdrop-blur">
            <GraduationCap className="mr-2 h-4 w-4" />
            Join the Bluegate Teaching Community
          </span>

          {/* Heading */}
          <h2 className="mt-8 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Empower Your Classroom
            <br />
            With Premium Teaching Resources
          </h2>

          {/* Description */}
          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-blue-100">
            Bluegate Teacher Hub provides educators with curriculum-aligned
            lesson plans, worksheets, presentations, assessments, teacher
            manuals, and professional support designed to make every classroom
            more engaging and effective.
          </p>

          {/* Features */}
          <div className="mt-12 grid gap-6 text-left md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
              <CheckCircle2 className="h-8 w-8 text-green-300" />

              <h3 className="mt-4 text-lg font-semibold text-white">
                Premium Resources
              </h3>

              <p className="mt-2 text-sm leading-6 text-blue-100">
                Access professionally developed teaching materials for every
                classroom.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
              <CheckCircle2 className="h-8 w-8 text-green-300" />

              <h3 className="mt-4 text-lg font-semibold text-white">
                Teacher Training
              </h3>

              <p className="mt-2 text-sm leading-6 text-blue-100">
                Participate in workshops, webinars and continuous professional
                development.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
              <CheckCircle2 className="h-8 w-8 text-green-300" />

              <h3 className="mt-4 text-lg font-semibold text-white">
                Academic Support
              </h3>

              <p className="mt-2 text-sm leading-6 text-blue-100">
                Receive expert guidance from the Bluegate academic team whenever
                you need assistance.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-14 flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Link
              href="/teacher-login"
              className="inline-flex items-center rounded-xl bg-white px-8 py-4 text-lg font-semibold text-blue-700 transition hover:bg-slate-100"
            >
              <GraduationCap className="mr-2 h-5 w-5" />
              Teacher Login
            </Link>

            <Link
              href="/contact"
              className="inline-flex items-center rounded-xl border border-white/30 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <School className="mr-2 h-5 w-5" />
              Partner With Us
            </Link>

            <Link
              href="/contact"
              className="inline-flex items-center rounded-xl border border-white/30 bg-transparent px-8 py-4 text-lg font-semibold text-white transition hover:bg-white/10"
            >
              <Mail className="mr-2 h-5 w-5" />
              Contact Us
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>

          {/* Bottom Note */}
          <div className="mt-14 border-t border-white/10 pt-8">
            <p className="text-sm text-blue-200">
              Trusted by educators and partner schools across India for
              high-quality educational content and classroom excellence.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}