"use client";

import { useTransition } from "react";

export default function PublisherLifecycleButton({
  action,
  label,
  confirmMessage,
  tone = "default",
}: {
  action: () => Promise<void>;
  label: string;
  confirmMessage: string;
  tone?: "default" | "danger";
}) {
  const [pending, startTransition] = useTransition();
  const classes = tone === "danger"
    ? "border-red-200 text-red-700 hover:bg-red-50"
    : "border-slate-200 text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          try {
            await action();
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "Publisher action failed.");
          }
        });
      }}
      className={`rounded-xl border px-4 py-2 text-sm font-bold transition disabled:opacity-60 ${classes}`}
    >
      {pending ? "Working…" : label}
    </button>
  );
}
