import { Suspense } from "react";

import QrWorkspace from "@/components/admin/qr/QrWorkspace";

function WorkspaceLoading() {
  return (
    <div
      className="grid h-[calc(100dvh-7rem)] min-h-[32rem] animate-pulse gap-3 xl:grid-cols-[16rem_minmax(0,1fr)_22rem]"
      aria-label="Loading QR Center"
    >
      <div className="rounded-xl border border-slate-200 bg-white" />
      <div className="rounded-xl border border-slate-200 bg-white" />
      <div className="rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}

export default function QrCenterPage() {
  return (
    <main className="min-w-0 space-y-4 p-4 sm:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Edora Dynamic QR
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          QR Center
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Find, review, and maintain permanent book-content redirects.
        </p>
      </header>

      <Suspense fallback={<WorkspaceLoading />}>
        <QrWorkspace />
      </Suspense>
    </main>
  );
}
