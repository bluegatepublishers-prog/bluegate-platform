export default function TeacherDashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8" aria-label="Loading teacher dashboard">
      <div className="h-28 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-lg bg-slate-200" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2"><div className="h-56 animate-pulse rounded-lg bg-slate-200" /><div className="h-56 animate-pulse rounded-lg bg-slate-200" /></div>
    </div>
  );
}