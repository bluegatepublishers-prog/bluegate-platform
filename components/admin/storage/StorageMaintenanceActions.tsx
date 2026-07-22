"use client";

import { useState } from "react";

export default function StorageMaintenanceActions({ retryFileId }: { retryFileId?: string }) {
  const [status, setStatus] = useState("");
  async function run(label: string, url: string, body?: object) {
    setStatus(`${label}…`);
    const response = await fetch(url, { method: "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    setStatus(response.ok ? `${label} complete.` : `${label} could not complete.`);
  }
  return <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Safe maintenance tools</h2><p className="mt-2 text-sm text-slate-600">These actions verify, report, or retry a copy. They never delete source or destination objects.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => run("Recalculate storage", "/api/admin/storage/recalculate")} className="rounded-xl border px-4 py-2 font-semibold">Recalculate storage</button><button type="button" onClick={() => run("Verify bucket", "/api/admin/storage/verify-bucket")} className="rounded-xl border px-4 py-2 font-semibold">Verify bucket</button>{retryFileId ? <button type="button" onClick={() => run("Retry migration", "/api/admin/storage/retry", { fileId: retryFileId })} className="rounded-xl border px-4 py-2 font-semibold">Retry failed migration</button> : null}<a href="/api/admin/storage/report" className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">Export report</a></div>{status ? <p role="status" className="mt-4 text-sm font-semibold">{status}</p> : null}</section>;
}
