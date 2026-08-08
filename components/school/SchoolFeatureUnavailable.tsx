export default function SchoolFeatureUnavailable({ label }: { label: string }) {
  return <main className="grid min-h-[55vh] place-items-center bg-slate-50 p-4 sm:p-6"><section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">School workspace</p><h1 className="mt-1 text-xl font-semibold text-slate-950">{label} unavailable</h1><p className="mt-2 text-sm text-slate-600">This feature is not enabled for your school.</p></section></main>;
}
