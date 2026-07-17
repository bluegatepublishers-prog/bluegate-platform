import Link from "next/link";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import {
  GraduationCap,
  BookOpen,
  LibraryBig,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Master Data | Bluegate Admin",
};

const modules = [
  {
    title: "Classes",
    description:
      "Manage all academic classes used throughout the platform.",
    href: "/admin/master/classes",
    icon: GraduationCap,
    color: "bg-blue-100 text-blue-700",
  },
  {
    title: "Subjects",
    description:
      "Manage subjects available for books, teachers and resources.",
    href: "/admin/master/subjects",
    icon: BookOpen,
    color: "bg-green-100 text-green-700",
  },
  {
    title: "Book Series",
    description:
      "Create and manage Bluegate publication series.",
    href: "/admin/master/series",
    icon: LibraryBig,
    color: "bg-purple-100 text-purple-700",
  },
];

export default async function MasterDataPage() {
  await requireLivePublisherAdmin();
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Master Data
        </h1>

        <p className="mt-2 text-slate-600">
          Configure the master data used across the Bluegate Platform.
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <Link
              key={module.title}
              href={module.href}
              className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl ${module.color}`}
              >
                <Icon className="h-8 w-8" />
              </div>

              <h2 className="mt-6 text-2xl font-bold text-slate-900">
                {module.title}
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                {module.description}
              </p>

              <div className="mt-8 inline-flex items-center font-semibold text-blue-700">
                Open Module

                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
