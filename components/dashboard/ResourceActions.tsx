"use client";

import { useState } from "react";
import { Bookmark, Download } from "lucide-react";
import Link from "next/link";

export default function ResourceActions({
  resourceId,
  bookmarked = false,
}: {
  resourceId: string;
  bookmarked?: boolean;
}) {
  const [isBookmarked, setIsBookmarked] = useState(bookmarked);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const [downloadPending, setDownloadPending] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleBookmark() {
    if (bookmarkPending) return;
    setBookmarkPending(true);
    setMessage("");

    try {
      const response = await fetch(`/api/resources/${resourceId}/bookmark`, {
        method: isBookmarked ? "DELETE" : "POST",
      });
      const payload = await response.json().catch(() => ({ message: "" }));
      if (!response.ok) {
        setMessage(payload.message || "Could not update bookmark.");
        return;
      }
      setIsBookmarked((value) => !value);
      setMessage(isBookmarked ? "Bookmark removed." : "Bookmarked.");
    } catch {
      setMessage("Could not update bookmark.");
    } finally {
      setBookmarkPending(false);
    }
  }

  async function download() {
    if (downloadPending) return;
    setDownloadPending(true);
    setMessage("");

    try {
      const response = await fetch(`/api/resources/${resourceId}/download`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({ message: "" }))) as {
        url?: string;
        message?: string;
      };
      if (!response.ok || !payload.url) {
        setMessage(payload.message || "Could not prepare download.");
        return;
      }
      window.open(payload.url, "_blank", "noopener,noreferrer");
      setMessage("Download started.");
    } catch {
      setMessage("Could not prepare download.");
    } finally {
      setDownloadPending(false);
    }
  }

  return (
    <div className="mt-6 space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/teacher-dashboard/resources/${resourceId}`}
          className="col-span-2 inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-blue-500"
        >
          Preview
        </Link>

        <button
          type="button"
          onClick={toggleBookmark}
          disabled={bookmarkPending || downloadPending}
          className={`inline-flex flex-1 items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition ${
            isBookmarked
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-slate-300 text-slate-700 hover:border-blue-500"
          } disabled:opacity-60`}
        >
          <Bookmark className={`mr-2 h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
          {bookmarkPending
            ? "Saving..."
            : isBookmarked
              ? "Bookmarked"
              : "Bookmark"}
        </button>

        <button
          type="button"
          onClick={download}
          disabled={downloadPending || bookmarkPending}
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          <Download className="mr-2 h-4 w-4" />
          {downloadPending ? "Preparing..." : "Download"}
        </button>
      </div>

      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
