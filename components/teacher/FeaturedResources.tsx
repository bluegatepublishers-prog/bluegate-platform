"use client";

import Link from "next/link";
import {
  ArrowRight,
  Lock,
  Eye,
  BookOpen,
  Presentation,
  FileText,
} from "lucide-react";

const resources = [
  {
    title: "Living Things",
    type: "Lesson Plan",
    class: "Class 5",
    subject: "Science",
    icon: BookOpen,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Fractions",
    type: "Interactive PPT",
    class: "Class 4",
    subject: "Mathematics",
    icon: Presentation,
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Grammar Practice",
    type: "Worksheet",
    class: "Class 6",
    subject: "English",
    icon: FileText,
    color: "bg-emerald-50 text-emerald-600",
  },
];

export default function FeaturedResources() {
  return (
    <section
      id="resources"
      className="bg-white py-20"
    >
      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto mb-14 max-w-3xl text-center">

          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-700">
            SAMPLE RESOURCES
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Explore Teaching Resources
          </h2>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            Preview premium teaching resources created by experienced educators.
            Login to unlock the complete Bluegate Teacher Library.
          </p>

        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {resources.map((resource) => {
            const Icon = resource.icon;

            return (
              <div
                key={resource.title}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
              >

                <div className="h-44 bg-gradient-to-br from-slate-100 via-white to-slate-50 flex items-center justify-center">

                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-3xl ${resource.color}`}
                  >
                    <Icon size={38} />
                  </div>

                </div>

                <div className="p-7">

                  <div className="mb-4 flex flex-wrap gap-2">

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {resource.class}
                    </span>

                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                      {resource.subject}
                    </span>

                  </div>

                  <h3 className="text-2xl font-bold text-slate-900">
                    {resource.title}
                  </h3>

                  <p className="mt-2 text-slate-600">
                    {resource.type}
                  </p>

                  <div className="mt-8 flex gap-3">

                    <button
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye size={18} />
                      Preview
                    </button>

                    <Link
                      href="/teacher-login"
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0B5ED7] py-3 font-semibold text-white hover:bg-[#083A75]"
                    >
                      <Lock size={18} />
                      Unlock
                    </Link>

                  </div>

                </div>

              </div>
            );
          })}

        </div>

        <div className="mt-16 text-center">

          <Link
            href="/teacher-login"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-4 font-semibold text-white transition hover:bg-slate-800"
          >
            Explore Complete Teacher Library

            <ArrowRight size={18} />
          </Link>

        </div>

      </div>
    </section>
  );
}