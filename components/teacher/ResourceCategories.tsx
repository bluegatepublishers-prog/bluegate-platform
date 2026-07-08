"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { resourceCategories } from "@/data/teacherResources";

export default function ResourceCategories() {
  return (
    <section
      id="resources"
      className="bg-slate-50 py-20"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Resource Centre
          </span>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">
            Browse Teaching Resources
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Discover professionally developed classroom resources designed to
            support effective teaching, student engagement, and better learning
            outcomes across all grades and subjects.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {resourceCategories.map((category) => {
            const Icon = category.icon;

            return (
              <Link
                key={category.id}
                href={`/teacher-hub/${category.id}`}
                className="group rounded-3xl border border-slate-200 bg-white p-8 transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-xl"
              >
                {/* Icon */}
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${category.color}`}
                >
                  <Icon className="h-8 w-8" />
                </div>

                {/* Title */}
                <h3 className="mt-6 text-xl font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
                  {category.title}
                </h3>

                {/* Description */}
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {category.description}
                </p>

                {/* CTA */}
                <div className="mt-8 flex items-center font-semibold text-blue-700">
                  Explore

                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-20 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10 text-center text-white lg:px-16">
          <h3 className="text-3xl font-bold">
            Everything a Teacher Needs — In One Place
          </h3>

          <p className="mx-auto mt-4 max-w-3xl text-blue-100">
            From lesson planning to classroom assessments, Bluegate Teacher Hub
            provides high-quality educational resources created by experienced
            educators to make teaching easier, more engaging, and more
            effective.
          </p>

          <Link
            href="/teacher-login"
            className="mt-8 inline-flex items-center rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 transition hover:bg-slate-100"
          >
            Access Teacher Hub

            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}