interface StatusBadgeProps {
  active: boolean;
}

export default function StatusBadge({
  active,
}: StatusBadgeProps) {
  return active ? (
    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
      Active
    </span>
  ) : (
    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
      Inactive
    </span>
  );
}