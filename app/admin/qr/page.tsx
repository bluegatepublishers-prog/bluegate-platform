import Link from "next/link";
import { BookOpen, QrCode, Workflow } from "lucide-react";

export const metadata = {
  title: "QR Manager | Bluegate Admin",
};

export default function QrManagerPage() {
  return (
    <main className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Edora Dynamic QR
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          QR Manager
        </h1>
        <p className="mt-2 text-slate-600">
          Create permanent dynamic QR codes for printed books and attach digital learning resources later.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2" aria-label="QR Manager areas">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <BookOpen className="h-5 w-5" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-950">Books</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review publisher books and plan the print editions that will own future QR sets.
          </p>
          <Link
            href="/admin/books"
            className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Open Books
          </Link>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <QrCode className="h-5 w-5" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-950">QR Codes</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            QR creation, edition assignment, print assets, and later resource attachments will be delivered in the next QR phase.
          </p>
          <button
            type="button"
            disabled
            className="mt-5 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500"
          >
            Coming in next QR phase
          </button>
        </article>
      </section>

      <section className="grid gap-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 md:grid-cols-[auto_minmax(0,1fr)] md:p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
          <Workflow className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Print-first workflow
          </p>
          <ol className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
            <li><span className="font-bold text-blue-700">1.</span> Generate QR</li>
            <li><span className="font-bold text-blue-700">2.</span> Place in printed book</li>
            <li><span className="font-bold text-blue-700">3.</span> Print book</li>
            <li><span className="font-bold text-blue-700">4.</span> Attach resources later</li>
          </ol>
          <p className="mt-4 text-xs leading-5 text-slate-600">
            QR Manager is a separate Publisher Admin workspace. Printed QR codes are permanent identifiers and do not depend on Content Studio authoring.
          </p>
        </div>
      </section>
    </main>
  );
}
