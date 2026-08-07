"use client";

import type { ReactNode } from "react";
import type { CanvasConfig } from "@/lib/content-document";

type DocumentPageProps = {
  moduleTitle: string;
  children: ReactNode;
  className?: string;
  readOnly?: boolean;
  canvas?: CanvasConfig;
};

export default function DocumentPage({
  moduleTitle,
  children,
  className = "",
  readOnly = false,
  canvas,
}: DocumentPageProps) {
  const width = canvas?.width ?? 794;
  const height = canvas?.height ?? 1123;
  const pageStyle = canvas?.preset === "WEB" || canvas?.preset === "STUDENT" || canvas?.preset === "TEACHER"
    ? { width: "min(100%, 1024px)", minHeight: `${height}px` }
    : { width: `${width}px`, minHeight: `${height}px` };
  return (
    <main
      style={pageStyle}
      className={`mx-auto bg-white shadow-[0_2px_14px_rgba(15,23,42,0.18)] ring-1 ring-slate-300 ${className}`}
      aria-label={
        readOnly
          ? "Manuscript preview page"
          : "Manuscript editor page"
      }
    >
      <div className="h-full px-[76px] py-[68px]">
        <header className="mb-8 min-w-0 border-b border-slate-200 pb-4">
          <h1 className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[28px] font-bold leading-tight tracking-tight text-slate-950">
            {moduleTitle || "Untitled module"}
          </h1>
        </header>

        <section className="min-w-0">
          {children}
        </section>
      </div>
    </main>
  );
}
