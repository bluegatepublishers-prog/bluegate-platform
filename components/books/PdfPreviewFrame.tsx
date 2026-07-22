"use client";

import { useEffect, useState } from "react";

type PreviewState = "loading" | "ready" | "missing" | "denied" | "unavailable";

export default function PdfPreviewFrame({ src, title, className = "h-full w-full" }: { src: string; title: string; className?: string }) {
  const [state, setState] = useState<PreviewState>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(src, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Range: "bytes=0-0" },
      signal: controller.signal,
    }).then((response) => {
      if (response.ok) setState("ready");
      else if (response.status === 401 || response.status === 403) setState("denied");
      else if (response.status === 404) setState("missing");
      else setState("unavailable");
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setState("unavailable");
    });
    return () => controller.abort();
  }, [attempt, src]);

  if (state === "ready") {
    return <iframe src={`${src}#toolbar=0&navpanes=0&scrollbar=1&zoom=page-fit`} title={title} className={className} />;
  }

  const message = state === "loading"
    ? "Loading PDF preview…"
    : state === "denied"
      ? "You do not have access to this PDF preview."
      : state === "missing"
        ? "This PDF preview is not available."
        : "The preview link expired or the file is temporarily unavailable.";

  return (
    <div className={`${className} flex min-h-80 items-center justify-center bg-slate-50 p-8 text-center`} role={state === "loading" ? "status" : "alert"}>
      <div>
        <p className="font-semibold text-slate-700">{message}</p>
        {state === "unavailable" && (
          <button type="button" onClick={() => { setState("loading"); setAttempt((value) => value + 1); }} className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700">
            Request a fresh link
          </button>
        )}
      </div>
    </div>
  );
}
