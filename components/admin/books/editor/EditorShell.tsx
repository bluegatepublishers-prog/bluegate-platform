"use client";

import type {
  ReactNode,
  RefObject,
} from "react";

type EditorShellProps = {
  ribbon: ReactNode;
  periodTabs: ReactNode;
  ruler?: ReactNode;
  children: ReactNode;
  shellRef?: RefObject<HTMLDivElement | null>;
};

export default function EditorShell({
  ribbon,
  periodTabs,
  ruler,
  children,
  shellRef,
}: EditorShellProps) {
  return (
    <div
      ref={shellRef}
      className="flex h-full min-h-0 flex-col overflow-hidden bg-[#e9edf2]"
    >
      <div className="sticky top-0 z-50 shrink-0 bg-white shadow-sm">
        <div className="border-b border-slate-300 bg-white">
          {ribbon}
        </div>

        <div className="border-b border-slate-300 bg-white">
          {periodTabs}
        </div>

        {ruler ? (
          <div className="border-b border-slate-300 bg-[#f8fafc]">
            {ruler}
          </div>
        ) : null}
      </div>

      <main className="min-h-0 flex-1 overflow-x-auto overflow-y-auto bg-[#e9edf2]">
        {children}
      </main>
    </div>
  );
}
