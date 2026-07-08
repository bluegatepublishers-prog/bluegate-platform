import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  Download,
  ExternalLink,
  FileText,
  Presentation,
  Video,
  Clock,
} from "lucide-react";

export const metadata: Metadata = {
  title: "My Downloads | Bluegate Teacher Dashboard",
  description:
    "View and manage all downloaded teaching resources.",
};

const downloads = [
  {
    id: "1",
    title: "Class 6 Science Lesson Plan",
    subject: "Science",
    classLevel: "Class 6",
    type: "PDF",
    size: "4.8 MB",
    downloaded: "Today",
  },
  {
    id: "2",
    title: "Mathematics Worksheet",
    subject: "Mathematics",
    classLevel: "Class 7",
    type: "PDF",
    size: "2.4 MB",
    downloaded: "Yesterday",
  },
  {
    id: "3",
    title: "AI Classroom Presentation",
    subject: "Artificial Intelligence",
    classLevel: "Class 8",
    type: "PPT",
    size: "12.7 MB",
    downloaded: "2 Days Ago",
  },
  {
    id: "4",
    title: "Environmental Studies Video",
    subject: "EVS",
    classLevel: "Class 5",
    type: "VIDEO",
    size: "52 MB",
    downloaded: "Last Week",
  },
];

function getIcon(type: string) {
  switch (type) {
    case "PPT":
      return Presentation;

    case "VIDEO":
      return Video;

    default:
      return FileText;
  }
}

export default function DownloadsPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl p-8">

        {/* Header */}

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            My Downloads
          </h1>

          <p className="mt-3 text-slate-600">
            Access all resources you've downloaded from the
            Bluegate Teacher Hub.
          </p>
        </div>

        {/* Search */}

        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="relative max-w-lg">

            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Search downloads..."
              className="w-full rounded-2xl border border-slate-300 py-3 pl-12 pr-4 outline-none focus:border-blue-600"
            />

          </div>

        </div>

        {/* Table */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

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
                  Actions
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

                          <h3 className="font-semibold text-slate-900">
                            {item.title}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {item.classLevel}
                          </p>

                        </div>

                      </div>

                    </td>

                    <td className="px-6 py-6">
                      {item.subject}
                    </td>

                    <td className="px-6 py-6">

                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {item.type}
                      </span>

                    </td>

                    <td className="px-6 py-6">
                      {item.size}
                    </td>

                    <td className="px-6 py-6">

                      <div className="flex items-center gap-2 text-slate-600">

                        <Clock className="h-4 w-4" />

                        {item.downloaded}

                      </div>

                    </td>

                    <td className="px-8 py-6">

                      <div className="flex justify-end gap-3">

                        <Link
                          href={`/teacher-hub/resources/${item.id}`}
                          className="rounded-xl border border-slate-300 p-3 transition hover:border-blue-600"
                        >
                          <ExternalLink className="h-5 w-5 text-slate-700" />
                        </Link>

                        <button className="rounded-xl bg-blue-600 p-3 text-white transition hover:bg-blue-700">
                          <Download className="h-5 w-5" />
                        </button>

                      </div>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>

      </div>
    </main>
  );
}