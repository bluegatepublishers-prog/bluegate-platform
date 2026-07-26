"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="rounded-2xl border bg-white p-8 text-center"><h2 className="text-xl font-bold">Assignments could not be loaded</h2><p className="mt-2 text-slate-600">Try again. If this continues, ask your school administrator to check assignment access.</p><button onClick={reset} className="mt-5 min-h-11 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white">Try again</button></section>;
}

