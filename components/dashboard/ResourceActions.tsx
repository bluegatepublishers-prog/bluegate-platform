"use client";

import { useState, useTransition } from "react";
import { Bookmark, Download } from "lucide-react";
import Link from "next/link";

export default function ResourceActions({ resourceId, bookmarked = false }: { resourceId: string; bookmarked?: boolean }) {
  const [isBookmarked, setIsBookmarked] = useState(bookmarked);
  const [pending, startTransition] = useTransition();

  function toggleBookmark() {
    startTransition(async () => {
      const response = await fetch(`/api/resources/${resourceId}/bookmark`, { method: isBookmarked ? "DELETE" : "POST" });
      if (response.ok) setIsBookmarked((value) => !value);
    });
  }

  function download() {
    startTransition(async () => {
      const response = await fetch(`/api/resources/${resourceId}/download`, { method: "POST" });
      if (!response.ok) return;
      const data = (await response.json()) as { url: string };
      window.open(data.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      <Link href={`/teacher-dashboard/resources/${resourceId}`} className="col-span-2 inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-blue-500">Preview</Link>
      <button type="button" onClick={toggleBookmark} disabled={pending} className={`inline-flex flex-1 items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition ${isBookmarked ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700 hover:border-blue-500"}`}>
        <Bookmark className={`mr-2 h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
        {isBookmarked ? "Bookmarked" : "Bookmark"}
      </button>
      <button type="button" onClick={download} disabled={pending} className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
        <Download className="mr-2 h-4 w-4" /> Download
      </button>
    </div>
  );
}
