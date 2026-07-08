import type { Metadata } from "next";
import Link from "next/link";
import {
  Bookmark,
  Search,
  Eye,
  Download,
  Trash2,
  FileText,
  Presentation,
  Video,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Bookmarks | Bluegate Teacher Dashboard",
  description: "View your bookmarked teaching resources.",
};

const bookmarks = [
  {
    id: "1",
    title: "Class 6 Science Lesson Plan",
    subject: "Science",
    classLevel: "Class 6",
    type: "PDF",
    updated: "Today",
  },
  {
    id: "2",
    title: "Mathematics Practice Worksheet",
    subject: "Mathematics",
    classLevel: "Class 7",
    type: "PDF",
    updated: "Yesterday",
  },
  {
    id: "3",
    title: "Artificial Intelligence Presentation",
    subject: "AI",
    classLevel: "Class 8",
    type: "PPT",
    updated: "3 Days Ago",
  },
  {
    id: "4",
    title: "Environmental Studies Activity Video",
    subject: "EVS",
    classLevel: "Class 5",
    type: "VIDEO",
    updated: "Last Week",
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

export default function BookmarksPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl p-8">

        {/* Header */}

        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Bookmark className="h-8 w-8 text-blue-700" />
            <h1 className="text-4xl font-bold text-slate-900">
              My Bookmarks
            </h1>
          </div>

          <p className="mt-3 text-slate-600">
            Quickly access your favourite teaching resources.
          </p>
        </div>

        {/* Search */}

        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="relative max-w-lg">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Search bookmarks..."
              className="w-full rounded-2xl border border-slate-300 py-3 pl-12 pr-4 outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Cards */}

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {bookmarks.map((item) => {
            const Icon = getIcon(item.type);

            return (
              <div
                key={item.id}
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="flex items-center justify-between">

                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
                    <Icon className="h-8 w-8 text-blue-700" />
                  </div>

                  <button className="rounded-xl bg-red-50 p-3 text-red-600 transition hover:bg-red-100">
                    <Trash2 className="h-5 w-5" />
                  </button>

                </div>

                <h2 className="mt-6 text-xl font-bold text-slate-900">
                  {item.title}
                </h2>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                    {item.classLevel}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                    {item.subject}
                  </span>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                    {item.type}
                  </span>
                </div>

                <p className="mt-5 text-sm text-slate-500">
                  Updated {item.updated}
                </p>

                <div className="mt-8 flex gap-3">

                  <Link
                    href={`/teacher-hub/resources/${item.id}`}
                    className="flex flex-1 items-center justify-center rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Link>

                  <button className="flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </button>

                </div>

              </div>
            );
          })}

        </div>

      </div>
    </main>
  );
}