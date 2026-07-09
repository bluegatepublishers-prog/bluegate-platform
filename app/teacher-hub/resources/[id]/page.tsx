import Link from "next/link";
import { teacherResources } from "@/data/teacherResourcesLocal";

export const metadata = {
  title: "Resource Details | Bluegate Publishers",
};

export default function ResourceDetailPage({ params }: { params: { id: string } }) {
  const resource = teacherResources.find((r) => r.id === params.id);

  if (!resource) {
    return (
      <main className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold">Resource not found</h2>
          <p className="mt-3 text-slate-600">We couldn't find the resource you're looking for.</p>
          <Link href="/teacher-hub/resources" className="mt-6 inline-block text-[#0B5ED7]">Back to resources</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="py-12">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex items-start gap-8">
          <img src={resource.thumbnail} alt={resource.title} className="h-40 w-40 rounded-md object-cover" />

          <div>
            <h1 className="text-2xl font-bold text-slate-900">{resource.title}</h1>
            <p className="mt-3 text-slate-600">{resource.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-md bg-slate-100 px-2 py-1">{resource.classLevel}</span>
              <span className="rounded-md bg-slate-100 px-2 py-1">{resource.subject}</span>
              <span className="rounded-md bg-slate-100 px-2 py-1">{resource.type}</span>
              <span className="rounded-md bg-slate-100 px-2 py-1">{resource.category}</span>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold">Preview</h3>
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-6">
                <p className="text-slate-600">Preview is available to all visitors. Full download requires teacher login.</p>
                {/* Basic preview: show fileUrl if it's an external video or link */}
                {resource.type === "VIDEO" ? (
                  <div className="mt-4">
                    <a href={resource.fileUrl} target="_blank" rel="noreferrer" className="text-[#0B5ED7]">
                      Watch video
                    </a>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-slate-600">Document preview: {resource.type} (thumbnail shown)</div>
                )}
              </div>

              <div className="mt-6">
                <Link href="/teacher-login" className="rounded-md bg-[#0B5ED7] px-4 py-2 text-sm font-semibold text-white">
                  Login to Download
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
