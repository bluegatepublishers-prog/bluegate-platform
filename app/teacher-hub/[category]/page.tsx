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
} from "lucide-react";

import { featuredResources, resourceCategories } from "@/data/teacherResources";

interface Props {
  params: {
    category: string;
  };
}

export async function generateMetadata({ params }: Props) {
  const category = resourceCategories.find(
    (item) => item.id === params.category
  );

  if (!category) {
    return {
      title: "Teacher Hub",
    };
  }

  return {
    title: `${category.title} | Teacher Hub | Bluegate Publishers`,
    description: category.description,
  };
}

export default function TeacherCategoryPage({ params }: Props) {
  const category = resourceCategories.find(
    (item) => item.id === params.category
  );

  if (!category) {
    notFound();
  }

  const resources = featuredResources.filter(
    (item) => item.category === params.category
  );

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
    <main className="min-h-screen bg-slate-50">

      {/* Hero */}

      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">

          <Link
            href="/teacher-hub"
            className="inline-flex items-center text-blue-700 hover:text-blue-800"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />

            Back to Teacher Hub

          </Link>

          <div className="mt-8 flex items-center gap-5">

            <div className={`rounded-2xl p-5 ${category.color}`}>
              <category.icon className="h-10 w-10" />
            </div>

            <div>

              <h1 className="text-5xl font-bold text-slate-900">
                {category.title}
              </h1>

              <p className="mt-3 max-w-2xl text-lg text-slate-600">
                {category.description}
              </p>

            </div>

          </div>

        </div>
      </section>

      {/* Resources */}

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">

            {resources.map((resource) => {

              const Icon = getFileIcon(resource.fileType);

              return (

                <div
                  key={resource.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:-translate-y-2 hover:shadow-xl"
                >

                  <div className="relative flex h-56 items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">

                    <div className="rounded-2xl bg-white p-6 shadow">

                      <Icon className="h-10 w-10 text-blue-700" />

                    </div>

                    <span className="absolute left-5 top-5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                      {resource.fileType}
                    </span>

                  </div>

                  <div className="p-8">

                    <div className="flex flex-wrap gap-2">

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                        {resource.classLevel}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                        {resource.subject}
                      </span>

                    </div>

                    <h3 className="mt-5 text-2xl font-semibold">
                      {resource.title}
                    </h3>

                    <p className="mt-3 line-clamp-3 text-slate-600">
                      {resource.description}
                    </p>

                    <div className="mt-6 flex gap-4 text-sm text-slate-500">

                      {resource.pages && (
                        <span>{resource.pages} Pages</span>
                      )}

                      {resource.fileSize && (
                        <span>{resource.fileSize}</span>
                      )}

                    </div>

                    <div className="mt-8 flex gap-3">

                      <button className="flex flex-1 items-center justify-center rounded-xl border border-slate-300 px-4 py-3 font-semibold">

                        <Eye className="mr-2 h-4 w-4" />

                        Preview

                      </button>

                      <button className="flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">

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

          {resources.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center">
              <h2 className="text-2xl font-bold text-slate-900">
                Resources Coming Soon
              </h2>

              <p className="mt-4 text-slate-600">
                We are preparing high-quality teaching resources for this
                category.
              </p>
            </div>
          )}

        </div>
      </section>

    </main>
  );
}