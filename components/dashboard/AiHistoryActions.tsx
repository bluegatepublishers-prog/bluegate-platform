"use client";

type ExportRecord = { title: string; tool: string; prompt: string; output: string | null; status: string; createdAt: string };

export default function AiHistoryActions({ generation }: { generation: ExportRecord }) {
  function download(kind: "txt" | "json") {
    const body = kind === "json" ? JSON.stringify(generation, null, 2) : `${generation.title}\n${generation.tool} · ${generation.status}\n${generation.createdAt}\n\nPrompt\n${generation.prompt}\n\nOutput\n${generation.output || "No output recorded."}`;
    const blob = new Blob([body], { type: kind === "json" ? "application/json" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeName(generation.title)}.${kind}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return <div className="flex gap-2"><button onClick={() => download("txt")} className="rounded-lg border px-3 py-2 font-semibold text-blue-700">TXT</button><button onClick={() => download("json")} className="rounded-lg border px-3 py-2 font-semibold text-blue-700">JSON</button></div>;
}

function safeName(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "ai-generation"; }
