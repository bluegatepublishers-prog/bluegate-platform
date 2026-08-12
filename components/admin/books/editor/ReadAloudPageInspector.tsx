"use client";

import { useState } from "react";

import type { LayoutV2Page } from "@/lib/content-layout-v2";

export default function ReadAloudPageInspector({ page, onSave }: { page: LayoutV2Page; onSave: (text: string) => void }) {
  const [draft, setDraft] = useState(page.readAloud?.text ?? "");
  return (
    <details className="mt-2 rounded-lg border border-blue-200 text-xs">
      <summary className="cursor-pointer px-3 py-2 font-bold text-blue-950">READING TEXT</summary>
      <div className="space-y-2 border-t border-blue-100 p-3">
        <textarea aria-label="Reading text" value={draft} onChange={(event) => setDraft(event.target.value)} rows={6} className="w-full resize-y rounded border border-blue-200 px-2 py-1.5" placeholder="Reading text for this page" />
        <p className="text-[11px] text-slate-500">Source: {page.readAloud?.source === "MANUAL" ? "Manual" : "Extracted from PDF"} · Reviewed: {page.readAloud?.reviewed ? "Yes" : "No"}</p>
        <button type="button" onClick={() => onSave(draft.trim())} className="rounded border border-blue-300 bg-blue-50 px-2 py-1.5 font-semibold text-blue-900">Save Reading Text</button>
      </div>
    </details>
  );
}
