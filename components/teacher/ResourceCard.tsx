"use client";

import Link from "next/link";
import {
  Download,
  Eye,
  FileText,
  Presentation,
  Video,
  Lock,
} from "lucide-react";

import { TeacherResource } from "@/types/teacher";

interface ResourceCardProps {
  resource: TeacherResource;
}

export default function ResourceCard({
  resource,
}: ResourceCardProps) {
  const getFileIcon = () => {
    switch (resource.fileType) {
      case "PPT":
        return Presentation;

      case "VIDEO":
        return Video;

      default:
        return FileText;
    }
  };

  const FileIcon = getFileIcon();

  return (
    <div className="group overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-xl">
      {/* Thumbnail */}
      <div className="relative flex h-56 items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-100">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-md">
          <FileIcon className="h-10 w-10 text-blue-700" />
        </div>

        <span className="absolute left-5 top-5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
          {resource.fileType}
        </span>

        {resource.premium && (
          <span className="absolute right-5 top-5 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-slate-900">
            Premium
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {resource.classLevel}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {resource.subject}
          </span>
        </div>

        <h3 className="mt-5 text-xl font-semibold text-slate-900">
          {resource.title}
        </h3>

        <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">
          {resource.description}
        </p>

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-500">
          {resource.pages && <span>{resource.pages} Pages</span>}

          {resource.fileSize && <span>{resource.fileSize}</span>}

          {resource.downloads && (
            <span>{resource.downloads.toLocaleString()} Downloads</span>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <Link
            href={`/teacher-hub/resources/${resource.id}`}
            className="flex flex-1 items-center justify-center rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Link>

          <button
            className="flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
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
}