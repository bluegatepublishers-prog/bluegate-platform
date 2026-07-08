"use client";

import Link from "next/link";
import {
  Download,
  FileText,
  Presentation,
  Video,
  ExternalLink,
  Clock,
} from "lucide-react";

const downloads = [
  {
    id: 1,
    title: "Class 6 Science Lesson Plan",
    type: "PDF",
    subject: "Science",
    downloaded: "Today",
    size: "4.8 MB",
  },
  {
    id: 2,
    title: "Mathematics Assessment Worksheet",
    type: "PDF",
    subject: "Mathematics",
    downloaded: "Yesterday",
    size: "2.3 MB",
  },
  {
    id: 3,
    title: "AI Classroom Presentation",
    type: "PPT",
    subject: "Artificial Intelligence",
    downloaded: "3 Days Ago",
    size: "12.4 MB",
  },
  {
    id: 4,
    title: "Environmental Studies Video",
    type: "VIDEO",
    subject: "EVS",
    downloaded: "Last Week",
    size: "48 MB",
  },
];

export default function RecentDownloads() {
  const getIcon = (type: string) => {
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
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-5 border-b border-slate-200 p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
              <Download className="mr-2 h-4 w-4" />
              Download History
            </span>

            <h2 className="mt-5 text-3xl font-bold text-slate-900">
              Recent Downloads
            </h2>

            <p className="mt-3 text-slate-600">
              Quickly reopen your recently downloaded teaching resources.
            </p>
          </div>

          <Link
            href="/teacher-dashboard/downloads"
            className="font-semibold text-blue-700 hover:text-blue-800"
          >
            View All Downloads →
          </Link>
        </div>

        {/* Desktop Table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-8 py-5 text-left text-sm font-semibold text-slate-600">
                  Resource
                </th>

                <th className="px-6 py-5 text-left text-sm font-semibold text-slate-600">
                  Subject
                </th>

                <th className="px-6 py-5 text-left text-sm font-semibold text-slate-600">
                  File
                </th>

                <th className="px-6 py-5 text-left text-sm font-semibold text-slate-600">
                  Size
                </th>

                <th className="px-6 py-5 text-left text-sm font-semibold text-slate-600">
                  Downloaded
                </th>

                <th className="px-8 py-5 text-right text-sm font-semibold text-slate-600">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {downloads.map((item) => {
                const Icon = getIcon(item.type);

                return (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                          <Icon className="h-6 w-6 text-blue-700" />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {item.title}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Bluegate Publishers
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-6 text-slate-700">
                      {item.subject}
                    </td>

                    <td className="px-6 py-6">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {item.type}
                      </span>
                    </td>

                    <td className="px-6 py-6 text-slate-600">
                      {item.size}
                    </td>

                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="h-4 w-4" />
                        {item.downloaded}
                      </div>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <button className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-4 p-6 lg:hidden">
          {downloads.map((item) => {
            const Icon = getIcon(item.type);

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                    <Icon className="h-6 w-6 text-blue-700" />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      {item.subject}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                      <span>{item.type}</span>
                      <span>{item.size}</span>
                      <span>{item.downloaded}</span>
                    </div>

                    <button className="mt-5 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Resource
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}