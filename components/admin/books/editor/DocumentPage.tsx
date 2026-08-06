"use client";

import type { ReactNode } from "react";

type DocumentPageProps = {
  moduleTitle: string;
  children: ReactNode;
  className?: string;
  readOnly?: boolean;
};

export default function DocumentPage({
  moduleTitle,
  children,
  className = "",
  readOnly = false,
}: DocumentPageProps) {
  return (
    <main
      className={`mx-auto min-h-[1123px] w-[794px] bg-white shadow-[0_2px_14px_rgba(15,23,42,0.18)] ring-1 ring-slate-300 ${className}`}
      aria-label={
        readOnly
          ? "Manuscript preview page"
          : "Manuscript editor page"
      }
    >
      <div className="min-h-[1123px] px-[76px] py-[68px]">
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