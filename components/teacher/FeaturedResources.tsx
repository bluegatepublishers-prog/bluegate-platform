"use client";

import Link from "next/link";
import {
  ArrowRight,
  Download,
  Eye,
  FileText,
  Presentation,
  Video,
  Lock,
} from "lucide-react";

import { featuredResources } from "@/data/teacherResources";

export default function FeaturedResources() {
  const getFileIcon = (type: string) => {
    switch (type) {
      case "PPT":
        return Presentation;

      case "VIDEO":
        return Video;

      default:
        return FileText;
    }
  };

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <span className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              Featured Resources
            </span>

            <h2 className="mt-5 text-4xl font-bold tracking-tight text-slate-900">
              Popular Teaching Resources
            </h2>

            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              Carefully curated classroom resources developed by experienced
              educators to support engaging, effective and modern teaching.
            </p>
          </div>

          <Link
            href="/teacher-hub/resources"
            className="inline-flex items-center font-semibold text-blue-700 transition hover:text-blue-800"
          >
            View All Resources
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {/* Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {featuredResources.map((resource) => {
            const Icon = getFileIcon(resource.fileType);

            return (
              <div
                key={resource.id}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-xl"
              >
                {/* Thumbnail */}
                <div className="relative flex h-56 items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-100">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-md">
                    <Icon className="h-10 w-10 text-blue-700" />
                  </div>

                  <span className="absolute left-5 top-5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    {resource.fileType}
                  </span>

                  {resource.premium && (
                    <span className="absolute right-5 top-5 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-slate-900">
                      Premium
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-8">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {resource.classLevel}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {resource.subject}
                    </span>
                  </div>

                  <h3 className="mt-5 text-2xl font-semibold text-slate-900">
                    {resource.title}
                  </h3>

                  <p className="mt-3 line-clamp-3 leading-7 text-slate-600">
                    {resource.description}
                  </p>

                  {/* Stats */}
                  <div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-500">
                    {resource.pages && (
                      <span>{resource.pages} Pages</span>
                    )}

                    {resource.fileSize && (
                      <span>{resource.fileSize}</span>
                    )}

                    {resource.downloads && (
                      <span>
                        {resource.downloads.toLocaleString()} Downloads
                      </span>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="mt-8 flex gap-3">
                    <button className="flex flex-1 items-center justify-center rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-700">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </button>

                    <button className="flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </button>
                  </div>

                  <div className="mt-5 flex items-center text-sm text-slate-500">
                    <Lock className="mr-2 h-4 w-4" />
                    Teacher Login Required
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-10 text-center text-white">
          <h3 className="text-3xl font-bold">
            Discover More Professional Teaching Resources
          </h3>

          <p className="mx-auto mt-4 max-w-3xl text-blue-100">
            Explore hundreds of curriculum-aligned lesson plans, worksheets,
            presentations, assessments and teacher manuals developed by Bluegate
            Publishers.
          </p>

          <Link
            href="/teacher-login"
            className="mt-8 inline-flex items-center rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 transition hover:bg-slate-100"
          >
            Teacher Login
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}