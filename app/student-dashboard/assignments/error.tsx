"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="p-4 sm:p-6"><section className="rounded-2xl border bg-white p-8 text-center"><h1 className="text-xl font-bold">Assignments could not be loaded</h1><p className="mt-2 text-slate-600">Try again in a moment.</p><button onClick={reset} className="mt-5 min-h-11 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white">Try again</button></section></main>; }

