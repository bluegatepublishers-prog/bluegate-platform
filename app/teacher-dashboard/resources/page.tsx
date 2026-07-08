import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  Presentation,
  Video,
} from "lucide-react";

export const metadata: Metadata = {
  title: "My Resources | Bluegate Teacher Dashboard",
  description:
    "Browse and download teaching resources assigned to your account.",
};

const resources = [
  {
    id: "1",
    title: "Class 6 Science Lesson Plan",
    class: "Class 6",
    subject: "Science",
    type: "PDF",
    updated: "2 days ago",
  },
  {
    id: "2",
    title: "Mathematics Worksheet",
    class: "Class 7",
    subject: "Mathematics",
    type: "PDF",
    updated: "Yesterday",
  },
  {
    id: "3",
    title: "Artificial Intelligence PPT",
    class: "Class 8",
    subject: "AI",
    type: "PPT",
    updated: "Today",
  },
  {
    id: "4",
    title: "EVS Classroom Video",
    class: "Class 5",
    subject: "EVS",
    type: "VIDEO",
    updated: "3 days ago",
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

export default function TeacherResourcesPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl space-y-8 p-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900">
            My Resources
          </h1>

          <p className="mt-3 text-slate-600">
            Browse all teaching resources assigned to your
            account.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="Search resources..."
                className="w-full rounded-2xl border border-slate-300 py-3 pl-12 pr-4 outline-none focus:border-blue-600"
              />
            </div>

            <select className="rounded-2xl border border-slate-300 px-4 py-3 outline-none">
              <option>All Classes</option>
              <option>Class 5</option>
              <option>Class 6</option>
              <option>Class 7</option>
              <option>Class 8</option>
            </select>

            <button className="flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50">
              <Filter className="mr-2 h-5 w-5" />
              More Filters
            </button>
          </div>
        </div>

        {/* Resource Grid */}
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => {
            const Icon = getIcon(resource.type);

            return (
              <div
                key={resource.id}
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
                  <Icon className="h-8 w-8 text-blue-700" />
                </div>

                <h2 className="mt-6 text-xl font-bold text-slate-900">
                  {resource.title}
                </h2>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                    {resource.class}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                    {resource.subject}
                  </span>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                    {resource.type}
                  </span>
                </div>

                <p className="mt-5 text-sm text-slate-500">
                  Updated {resource.updated}
                </p>

                <div className="mt-8 flex gap-3">
                  <Link
                    href={`/teacher-hub/resources/${resource.id}`}
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

        {/* Pagination */}
        <div className="flex items-center justify-center gap-3 pt-4">
          <button className="rounded-xl border border-slate-300 px-5 py-3 font-medium hover:bg-slate-50">
            Previous
          </button>

          <button className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white">
            1
          </button>

          <button className="rounded-xl border border-slate-300 px-5 py-3 font-medium hover:bg-slate-50">
            2
          </button>

          <button className="rounded-xl border border-slate-300 px-5 py-3 font-medium hover:bg-slate-50">
            Next
          </button>
        </div>
      </div>
    </main>
  );
}