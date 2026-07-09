export default function EmptyState({ query }: { query?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
      <h3 className="text-2xl font-semibold text-slate-900">No resources found</h3>
      <p className="mt-3 text-slate-600">Try adjusting your search or filters to find what you need.</p>
      {query ? <p className="mt-2 text-sm text-slate-500">Searched for: "{query}"</p> : null}
    </div>
  );
}
