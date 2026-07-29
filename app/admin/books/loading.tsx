import { BookOpen } from "lucide-react";

export default function BooksLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Loading books workspace">
      <div className="flex items-end justify-between border-b border-slate-200 pb-5">
        <div className="space-y-3">
          <div className="h-3 w-32 rounded bg-slate-200" />
          <div className="h-9 w-44 rounded bg-slate-200" />
          <div className="h-4 w-80 max-w-full rounded bg-slate-100" />
        </div>
        <div className="hidden h-10 w-28 rounded-xl bg-slate-200 sm:block" />
      </div>
      <div className="grid min-h-[680px] gap-5 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <div className="hidden rounded-2xl border bg-white p-4 xl:block">
          <div className="flex items-center gap-3 border-b pb-4">
            <BookOpen className="h-5 w-5 text-slate-300" />
            <div className="h-5 w-20 rounded bg-slate-200" />
          </div>
          <div className="mt-4 space-y-3">
            {Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-14 rounded-xl bg-slate-100" />)}
          </div>
        </div>
        <div className="rounded-2xl border bg-slate-50 p-4">
          <div className="h-16 rounded-xl bg-slate-200" />
          <div className="mt-4 h-[520px] rounded-2xl bg-white" />
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="h-6 w-36 rounded bg-slate-200" />
          <div className="mt-6 space-y-5">
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-10 rounded bg-slate-100" />)}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading books…</span>
    </div>
  );
}
