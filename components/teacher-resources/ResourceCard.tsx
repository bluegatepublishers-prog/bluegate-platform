"use client";

import Link from "next/link";
import { Resource } from "@/data/teacherResourcesLocal";

export default function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <img src={resource.thumbnail} alt={resource.title} className="h-20 w-20 rounded-md object-cover" />

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900">{resource.title}</h3>
          <p className="mt-1 text-sm text-slate-600 line-clamp-2">{resource.description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-slate-100 px-2 py-1">{resource.classLevel}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1">{resource.subject}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1">{resource.type}</span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Link href={`/teacher-hub/resources/${resource.id}`} className="text-sm font-medium text-[#0B5ED7]">
              Preview
            </Link>

            <Link href="/teacher-login" className="ml-3 rounded-md bg-[#0B5ED7] px-3 py-2 text-sm font-semibold text-white">
              Login to Download
            </Link>

          </div>
        </div>
      </div>
    </article>
  );
}
