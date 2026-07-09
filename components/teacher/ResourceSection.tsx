"use client";

import Link from "next/link";
import {
  ArrowRight,
  Eye,
  Lock,
  BookOpen,
} from "lucide-react";

interface Resource {
  title: string;
  className: string;
  subject: string;
}

interface Props {
  title: string;
  subtitle: string;
  category: string;
  resources: Resource[];
}

export default function ResourceSection({
  title,
  subtitle,
  category,
  resources,
}: Props) {
  return (
    <section className="py-20">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-12 flex items-end justify-between">

          <div>

            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">

              {category}

            </span>

            <h2 className="mt-5 text-4xl font-bold text-slate-900">
              {title}
            </h2>

            <p className="mt-3 max-w-2xl text-lg text-slate-600">
              {subtitle}
            </p>

          </div>

          <Link
            href="/teacher-login"
            className="hidden items-center gap-2 font-semibold text-[#0B5ED7] md:flex"
          >
            View All

            <ArrowRight size={18} />

          </Link>

        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {resources.map((item) => (

            <div
              key={item.title}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
            >

              <div className="flex h-44 items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-50">

                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-100">

                  <BookOpen
                    size={38}
                    className="text-blue-600"
                  />

                </div>

              </div>

              <div className="p-7">

                <div className="mb-4 flex gap-2">

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">

                    {item.className}

                  </span>

                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">

                    {item.subject}

                  </span>

                </div>

                <h3 className="text-2xl font-bold text-slate-900">
                  {item.title}
                </h3>

                <p className="mt-3 text-slate-600">
                  {category}
                </p>

                <div className="mt-8 flex gap-3">

                  <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 hover:bg-slate-50">

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

          ))}

        </div>

      </div>

    </section>
  );
}