const styles: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  DISPATCHED: "bg-purple-100 text-purple-700",
  CLOSED: "bg-slate-100 text-slate-700",
};

export default function InspectionStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
