"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Archive,
  Download,
  Eye,
  Link2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Send,
} from "lucide-react";

export default function ResourceMoreMenu({
  id,
  published,
  archived,
  returnTo,
  type,
}: {
  id: string;
  published: boolean;
  archived: boolean;
  returnTo: string;
  type?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function update(action: "publish" | "unpublish" | "archive" | "restore") {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => ({ message: "" }));
      if (!response.ok) {
        setMessage(payload.message || "Unable to update resource.");
        return;
      }
      setMessage(payload.message || "Resource updated.");
      router.refresh();
    });
  }

  async function copyLink() {
    const url = `${window.location.origin}/admin/resources/${id}`;
    await navigator.clipboard.writeText(url);
    setMessage("Resource link copied.");
  }

  function removeVideoFromLibrary() {
    if (!confirm("Remove this unused Video from the library? Referenced videos are protected and cannot be removed.")) return;
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/resources/${id}?library=video`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({ message: "" }));
      setMessage(payload.message || (response.ok ? "Video archived from the library." : "Unable to remove Video."));
      if (response.ok) router.refresh();
    });
  }

  function removeImageFromLibrary() {
    if (!confirm("Delete this unused Image from the library? Images currently used in book content are protected.")) return;
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/resources/${id}?library=image`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({ message: "" }));
      setMessage(payload.message || (response.ok ? "Image archived from the library." : "Unable to delete Image."));
      if (response.ok) router.refresh();
    });
  }

  return (
    <div className="relative">
      <details className="group">
        <summary
          aria-label="More resource actions"
          className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </summary>
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <MenuLink href={`/admin/resources/${id}?returnTo=${encodeURIComponent(returnTo)}`}>
            <Eye className="h-4 w-4" /> View and usage
          </MenuLink>
          <MenuLink href={`/admin/resources/${id}/edit`}>
            <Pencil className="h-4 w-4" /> Edit metadata
          </MenuLink>
          <MenuLink href={`/admin/resources/${id}?attach=1&returnTo=${encodeURIComponent(returnTo)}`}>
            <Link2 className="h-4 w-4" /> Attach to content
          </MenuLink>
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
          >
            <Link2 className="h-4 w-4" /> Copy resource link
          </button>
          <a
            href={`/api/resources/${id}/download`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            <Download className="h-4 w-4" /> Download / open
          </a>
          <button
            type="button"
            disabled={pending || archived}
            onClick={() => update(published ? "unpublish" : "publish")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {published ? "Unpublish" : "Publish"}
          </button>
          {type === "VIDEO" ? <button type="button" disabled={pending || archived} onClick={removeVideoFromLibrary} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"><Archive className="h-4 w-4" />Delete Video from Library</button> : type === "IMAGE" ? <button type="button" disabled={pending || archived} onClick={removeImageFromLibrary} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"><Archive className="h-4 w-4" />Delete Image from Library</button> : <button
            type="button"
            disabled={pending}
            onClick={() => update(archived ? "restore" : "archive")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {archived ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            {archived ? "Restore" : "Archive"}
          </button>}
          <p className="px-3 pb-1 pt-2 text-xs text-slate-400">
            Permanent deletion is unavailable until durable storage cleanup is configured.
          </p>
        </div>
      </details>
      {message ? <p role="status" aria-live="polite" className="absolute right-0 z-40 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-lg">{message}</p> : null}
    </div>
  );
}

function MenuLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
    >
      {children}
    </Link>
  );
}
