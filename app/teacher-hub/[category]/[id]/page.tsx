import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Presentation,
  Video,
  Lock,
  Calendar,
  BookOpen,
  GraduationCap,
} from "lucide-react";

import {
  featuredResources,
  resourceCategories,
} from "@/data/teacherResources";

const FILE_ICONS = {
  PPT: Presentation,
  VIDEO: Video,
  DEFAULT: FileText,
} as const;

interface Props {
  params: {
    category: string;
    id: string;
  };
}

export async function generateMetadata({ params }: Props) {
  const resource = featuredResources.find(
    (item) =>
      item.category === params.category &&
      item.id === params.id
  );

  if (!resource) {
    return {
      title: "Teacher Resource",
    };
  }

  return {
    title: `${resource.title} | Bluegate Publishers`,
    description: resource.description,
  };
}

export default function TeacherResourceDetails({
  params,
}: Props) {
  const resource = featuredResources.find(
    (item) =>
      item.category === params.category &&
      item.id === params.id
  );

  if (!resource) {
    notFound();
  }

  const category = resourceCategories.find(
    (item) => item.id === resource.category
  );

  const relatedResources = featuredResources.filter(
    (item) =>
      item.category === resource.category &&
      item.id !== resource.id
  );

  const Icon =
    FILE_ICONS[resource.fileType as keyof typeof FILE_ICONS] ?? FILE_ICONS.DEFAULT;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <Link
            href={`/teacher-hub/${resource.category}`}
            className="inline-flex items-center text-blue-700 hover:text-blue-800"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {category?.title}
          </Link>

          <div className="mt-10 grid gap-14 lg:grid-cols-2">
            {/* Left */}
            <div>
              <div className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                {resource.fileType}
              </div>

              <h1 className="mt-6 text-5xl font-bold text-slate-900">
                {resource.title}
              </h1>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                {resource.description}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm">
                  {resource.classLevel}
                </span>

                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm">
                  {resource.subject}
                </span>

                {resource.premium && (
                  <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                    Premium Resource
                  </span>
                )}
              </div>

              <div className="mt-10 flex gap-4">
                <button className="flex items-center rounded-xl border border-slate-300 px-6 py-3 font-semibold hover:border-blue-600">
                  <Eye className="mr-2 h-5 w-5" />
                  Preview
                </button>

                <button className="flex items-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700">
                  <Download className="mr-2 h-5 w-5" />
                  Download
                </button>
              </div>

              <div className="mt-5 flex items-center text-sm text-slate-500">
                <Lock className="mr-2 h-4 w-4" />
                Teacher Login Required
              </div>
            </div>

            {/* Preview Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
              <div className="flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100">
                <Icon className="h-20 w-20 text-blue-700" />
              </div>

              <div className="mt-8 space-y-5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pages</span>
                  <span>{resource.pages ?? "-"}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">File Size</span>
                  <span>{resource.fileSize ?? "-"}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Downloads</span>
                  <span>{resource.downloads ?? 0}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Published</span>
                  <span>{resource.createdAt}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Information */}
      <section className="py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-3 lg:px-8">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <BookOpen className="h-8 w-8 text-blue-700" />

            <h3 className="mt-5 text-xl font-bold">
              Classroom Ready
            </h3>

            <p className="mt-3 text-slate-600">
              Designed according to the latest curriculum with
              teacher-friendly activities and assessments.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <GraduationCap className="h-8 w-8 text-blue-700" />

            <h3 className="mt-5 text-xl font-bold">
              Teacher Support
            </h3>

            <p className="mt-3 text-slate-600">
              Prepared by experienced educators to simplify
              classroom teaching.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <Calendar className="h-8 w-8 text-blue-700" />

            <h3 className="mt-5 text-xl font-bold">
              Updated Resources
            </h3>

            <p className="mt-3 text-slate-600">
              Resources are regularly reviewed and updated
              according to academic requirements.
            </p>
          </div>
        </div>
      </section>

      {/* Related Resources */}
      {relatedResources.length > 0 && (
        <section className="pb-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold">
                Related Resources
              </h2>

              <Link
                href={`/teacher-hub/${resource.category}`}
                className="text-blue-700 hover:text-blue-800"
              >
                View All
              </Link>
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {relatedResources.map((item) => (
                <Link
                  key={item.id}
                  href={`/teacher-hub/${item.category}/${item.id}`}
                  className="rounded-3xl border border-slate-200 bg-white p-8 transition hover:-translate-y-2 hover:shadow-xl"
                >
                  <h3 className="text-xl font-semibold">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-slate-600 line-clamp-3">
                    {item.description}
                  </p>

                  <div className="mt-6 flex justify-between text-sm text-slate-500">
                    <span>{item.classLevel}</span>
                    <span>{item.subject}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}