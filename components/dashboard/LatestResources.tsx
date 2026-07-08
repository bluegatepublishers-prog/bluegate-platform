"use client";

import Link from "next/link";
import {
  ArrowRight,
  Download,
  Eye,
  FileText,
  Presentation,
  Video,
  Sparkles,
} from "lucide-react";

const resources = [
  {
    id: 1,
    title: "Class 6 Science Lesson Plan",
    subject: "Science",
    class: "Class 6",
    type: "PDF",
    date: "2 days ago",
    premium: true,
  },
  {
    id: 2,
    title: "Mathematics Practice Worksheet",
    subject: "Mathematics",
    class: "Class 7",
    type: "PDF",
    date: "Yesterday",
    premium: false,
  },
  {
    id: 3,
    title: "AI Classroom Presentation",
    subject: "Artificial Intelligence",
    class: "Class 8",
    type: "PPT",
    date: "Today",
    premium: true,
  },
  {
    id: 4,
    title: "Environmental Studies Activity",
    subject: "EVS",
    class: "Class 5",
    type: "VIDEO",
    date: "Today",
    premium: false,
  },
];

export default function LatestResources() {
  const getTypeIcon = (type: string) => {
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
    <section className="py-10">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-5 border-b border-slate-200 p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              <Sparkles className="mr-2 h-4 w-4" />
              Recently Added
            </span>

            <h2 className="mt-5 text-3xl font-bold text-slate-900">
              Latest Teaching Resources
            </h2>

            <p className="mt-3 text-slate-600">
              Newly published classroom resources from Bluegate Publishers.
            </p>
          </div>

          <Link
            href="/teacher-hub"
            className="inline-flex items-center font-semibold text-blue-700 hover:text-blue-800"
          >
            View Library

            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {/* Resource List */}
        <div className="divide-y divide-slate-100">
          {resources.map((resource) => {
            const Icon = getTypeIcon(resource.type);

            return (
              <div
                key={resource.id}
                className="flex flex-col gap-6 p-8 transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
              >
                {/* Left */}
                <div className="flex items-start gap-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
                    <Icon className="h-8 w-8 text-blue-700" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-slate-900">
                        {resource.title}
                      </h3>

                      {resource.premium && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          Premium
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                        {resource.class}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                        {resource.subject}
                      </span>

                      <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                        {resource.type}
                      </span>
                    </div>

                    <p className="mt-4 text-sm text-slate-500">
                      Added {resource.date}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button className="inline-flex items-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-700">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </button>

                  <button className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}