"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function ResourceRowActions({
  id,
  published,
}: {
  id: string;
  published: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function remove() {
    if (!confirm("Delete this resource and its managed files?")) return;
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/resources/${id}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({ message: "" }));
      if (!response.ok) {
        setMessage(payload.message || "Unable to delete resource.");
        return;
      }
      setMessage("Resource deleted.");
      router.refresh();
    });
  }

  function togglePublished(next: boolean) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: next }),
      });
      const payload = await response.json().catch(() => ({ message: "" }));
      if (!response.ok) {
        setMessage(payload.message || "Unable to update publish status.");
        return;
      }
      setMessage(next ? "Resource published." : "Resource unpublished.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/resources/${id}/edit`}
          className="rounded-lg border px-2 py-1 text-xs font-semibold text-blue-700"
        >
          Edit
        </Link>

        <Link
          href={`/admin/resources/${id}`}
          className="rounded-lg border px-2 py-1 text-xs font-semibold text-slate-700"
        >
          Preview
        </Link>

        <a
          href={`/api/resources/${encodeURIComponent(id)}/download?disposition=attachment`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border px-2 py-1 text-xs font-semibold text-slate-700"
        >
          Download
        </a>

        <button
          type="button"
          disabled={pending}
          onClick={() => togglePublished(!published)}
          className="rounded-lg border px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60"
        >
          {published ? "Unpublish" : "Publish"}
        </button>

        <button
          disabled={pending}
          onClick={remove}
          className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 disabled:opacity-60"
        >
          {pending ? "Working..." : "Delete"}
        </button>
      </div>

      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
