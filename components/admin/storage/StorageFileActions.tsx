"use client";

import { useState } from "react";

export default function StorageFileActions({ fileId, objectKey }: { fileId: string; objectKey: string }) {
  const [status, setStatus] = useState("");
  async function verify() {
    setStatus("Verifying…");
    const response = await fetch(`/api/admin/storage/files/${encodeURIComponent(fileId)}/verify`, { method: "POST" });
    const body = await response.json().catch(() => null) as { exists?: boolean } | null;
    setStatus(response.ok && body?.exists ? "Verified" : "Unavailable");
  }
  return <div className="flex flex-wrap gap-2"><a href={`/api/admin/storage/files/${encodeURIComponent(fileId)}/download`} className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white">Protected download</a><button type="button" onClick={verify} className="rounded-lg border px-3 py-2 font-semibold">Verify object</button><button type="button" onClick={() => navigator.clipboard.writeText(objectKey)} className="rounded-lg border px-3 py-2 font-semibold">Copy object key</button>{status ? <span role="status" className="self-center text-xs font-semibold">{status}</span> : null}</div>;
}
