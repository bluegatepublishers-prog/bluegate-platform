"use client";

type Action = (formData: FormData) => void | Promise<void>;

export default function EntitlementActionForm({
  action,
  currentStatus,
  kind,
}: {
  action: Action;
  currentStatus: "ACTIVE" | "PAUSED" | "REVOKED" | "ARCHIVED";
  kind: "book" | "resource";
}) {
  const actions =
    currentStatus === "ACTIVE"
      ? ["pause", "revoke", "archive"]
      : currentStatus === "PAUSED"
        ? ["resume", "revoke", "archive"]
        : currentStatus === "REVOKED"
          ? ["restore", "archive"]
          : ["restore"];

  return (
    <form
      action={action}
      className="flex min-w-0 flex-wrap items-end gap-2"
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const requested = submitter?.value;
        if (
          requested &&
          !window.confirm(
            `${requested[0]?.toUpperCase()}${requested.slice(1)} this school ${kind} entitlement?`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      {actions.includes("revoke") ? (
        <label className="min-w-[12rem] flex-1 text-xs font-semibold text-slate-600">
          Revoke reason
          <input
            name="reason"
            maxLength={500}
            placeholder="Required when revoking"
            className="mt-1 min-h-10 w-full rounded-lg border px-3 font-normal"
          />
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {actions.map((item) => (
          <button
            key={item}
            type="submit"
            name="action"
            value={item}
            className="min-h-10 rounded-lg border px-3 text-sm font-semibold capitalize hover:bg-slate-50"
          >
            {item}
          </button>
        ))}
      </div>
    </form>
  );
}
