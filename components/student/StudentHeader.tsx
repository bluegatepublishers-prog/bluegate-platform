import LogoutButton from "@/components/dashboard/LogoutButton";

export default function StudentHeader({ name, plan }: { name: string; plan?: string }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between border-b bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Student Dashboard</p>
        <p className="mt-1 font-semibold text-slate-800">{name}</p>
      </div>
      <div className="flex items-center gap-3">
        {plan ? (
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 sm:inline-flex">
            {formatPlan(plan)}
          </span>
        ) : null}
        <LogoutButton />
      </div>
    </header>
  );
}

function formatPlan(plan: string) {
  return plan.split("_").map((part) => part[0] + part.slice(1).toLowerCase()).join(" ");
}
