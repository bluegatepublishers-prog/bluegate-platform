"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  School,
  GraduationCap,
  CheckCircle2,
  ChevronRight,
  PlayCircle,
} from "lucide-react";

export default function SchoolHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-emerald-50">

      {/* Background */}

      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="absolute -bottom-32 -right-20 h-[450px] w-[450px] rounded-full bg-emerald-200/30 blur-3xl" />

      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* Breadcrumb */}

        <div className="mb-10 flex items-center gap-2 text-sm text-slate-500">

          <Link
            href="/"
            className="hover:text-blue-600"
          >
            Home
          </Link>

          <ChevronRight size={16} />

          <span className="font-medium text-slate-800">
            School Solutions
          </span>

        </div>

        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* LEFT */}

          <div>

            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">

              <School size={18} />

              School Solutions

            </span>

            <h1 className="mt-8 text-5xl font-bold leading-tight text-slate-900 lg:text-6xl">

              Empowering Schools with

              <span className="mt-2 block text-blue-600">

                Future-Ready Learning

              </span>

            </h1>

            <p className="mt-8 text-lg leading-8 text-slate-600">

              Bluegate Publishers partners with schools to deliver
              curriculum-aligned textbooks, teacher resources,
              digital learning, assessments and continuous
              academic support for modern classrooms.

            </p>

            {/* Features */}

            <div className="mt-10 grid gap-4 sm:grid-cols-2">

              <div className="flex items-center gap-3">

                <CheckCircle2
                  className="text-emerald-600"
                  size={22}
                />

                <span>CBSE & NEP 2020 Aligned</span>

              </div>

              <div className="flex items-center gap-3">

                <CheckCircle2
                  className="text-emerald-600"
                  size={22}
                />

                <span>Teacher Resources</span>

              </div>

              <div className="flex items-center gap-3">

                <CheckCircle2
                  className="text-emerald-600"
                  size={22}
                />

                <span>Digital Learning</span>

              </div>

              <div className="flex items-center gap-3">

                <CheckCircle2
                  className="text-emerald-600"
                  size={22}
                />

                <span>Assessment Support</span>

              </div>

            </div>

            {/* CTA */}

            <div className="mt-12 flex flex-wrap gap-5">

              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-blue-700"
              >

                Become a Partner School

                <ArrowRight size={20} />

              </Link>

              <Link
                href="/books"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-8 py-4 font-semibold text-slate-700 transition hover:bg-slate-100"
              >

                <BookOpen size={20} />

                Explore Books

              </Link>

              <button className="inline-flex items-center gap-2 rounded-2xl px-6 py-4 font-semibold text-blue-600">

                <PlayCircle size={22} />

                Watch Overview

              </button>

            </div>

          </div>

          {/* RIGHT */}

          <div className="relative">

            <div className="overflow-hidden rounded-[40px] bg-white shadow-2xl">

              <Image
                src="/images/school-hero.jpg"
                alt="Bluegate School Solutions"
                width={700}
                height={700}
                className="h-[620px] w-full object-cover"
              />
                            {/* Floating Card 1 */}

              <div className="absolute left-6 top-8 rounded-2xl bg-white p-5 shadow-xl">

                <div className="flex items-center gap-4">

                  <div className="rounded-xl bg-blue-100 p-3">

                    <BookOpen
                      className="text-blue-600"
                      size={28}
                    />

                  </div>

                  <div>

                    <h3 className="text-xl font-bold text-slate-900">
                      100+
                    </h3>

                    <p className="text-sm text-slate-500">
                      Educational Titles
                    </p>

                  </div>

                </div>

              </div>

              {/* Floating Card 2 */}

              <div className="absolute -right-5 top-1/3 rounded-2xl bg-white p-5 shadow-xl">

                <div className="flex items-center gap-4">

                  <div className="rounded-xl bg-emerald-100 p-3">

                    <GraduationCap
                      className="text-emerald-600"
                      size={28}
                    />

                  </div>

                  <div>

                    <h3 className="text-lg font-bold text-slate-900">
                      Teacher Support
                    </h3>

                    <p className="text-sm text-slate-500">
                      Workshops & Resources
                    </p>

                  </div>

                </div>

              </div>

              {/* Floating Card 3 */}

              <div className="absolute bottom-8 left-10 rounded-2xl bg-white p-5 shadow-xl">

                <div className="flex items-center gap-4">

                  <div className="rounded-xl bg-orange-100 p-3">

                    <School
                      className="text-orange-600"
                      size={28}
                    />

                  </div>

                  <div>

                    <h3 className="text-xl font-bold text-slate-900">
                      Trusted
                    </h3>

                    <p className="text-sm text-slate-500">
                      By Progressive Schools
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* Trusted Strip */}

        <div className="mt-24 rounded-[30px] border border-slate-200 bg-white px-10 py-8 shadow-sm">

          <div className="flex flex-col items-center justify-between gap-8 lg:flex-row">

            <div>

              <p className="text-sm font-semibold uppercase tracking-[4px] text-slate-500">
                Trusted Educational Solutions
              </p>

              <h3 className="mt-2 text-2xl font-bold text-slate-900">
                Supporting Schools Across India
              </h3>

            </div>

            <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">

              <div>

                <h4 className="text-3xl font-bold text-blue-600">
                  CBSE
                </h4>

                <p className="mt-2 text-sm text-slate-500">
                  Curriculum
                </p>

              </div>

              <div>

                <h4 className="text-3xl font-bold text-emerald-600">
                  NEP
                </h4>

                <p className="mt-2 text-sm text-slate-500">
                  2020 Ready
                </p>

              </div>

              <div>

                <h4 className="text-3xl font-bold text-purple-600">
                  K–12
                </h4>

                <p className="mt-2 text-sm text-slate-500">
                  Learning
                </p>

              </div>

              <div>

                <h4 className="text-3xl font-bold text-orange-600">
                  24×7
                </h4>

                <p className="mt-2 text-sm text-slate-500">
                  Academic Support
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}