"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type NodeType = "PART" | "UNIT" | "CHAPTER" | "MODULE" | "TOPIC";
type ParentType = "BOOK" | "PART" | "UNIT" | "CHAPTER" | "MODULE";
type OrderField = "displayOrder" | "sortOrder";

export type HierarchyMoveDestination = {
  parentType: ParentType;
  parentId: string;
  parentTitle: string;
  bookTitle: string;
  siblingCount: number;
};

export type HierarchyMoveConfig = {
  nodeId: string;
  nodeType: NodeType;
  nodeTitle: string;
  endpoint: string;
  orderField: OrderField;
  parentType: ParentType;
  parentId: string;
  siblingIndex: number;
  siblingCount: number;
  destinations: HierarchyMoveDestination[];
};

export default function HierarchyMoveDialog({
  config,
}: {
  config: HierarchyMoveConfig | null;
}) {
  const router = useRouter();
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const [open, setOpen] = useState(false);
  const [destinationKey, setDestinationKey] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const destinations = useMemo(
    () =>
      config?.destinations.filter(
        (destination) =>
          destination.parentType !== config.parentType ||
          destination.parentId !== config.parentId,
      ) ?? [],
    [config],
  );
  const selectedDestination =
    destinations.find(
      (destination) => destinationId(destination) === destinationKey,
    ) ?? destinations[0];

  useEffect(() => {
    setOpen(false);
    setDestinationKey(
      config?.destinations
        .filter(
          (destination) =>
            destination.parentType !== config.parentType ||
            destination.parentId !== config.parentId,
        )
        .map(destinationId)[0] ?? "",
    );
    setError("");
    setSuccess("");
  }, [config]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => selectRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!config) return null;

  async function patch(
    parentType: ParentType,
    parentId: string,
    order: number,
    pendingKey: string,
    successMessage: string,
  ) {
    if (pending || !config) return false;
    setPending(pendingKey);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(config.endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentType,
          parentId,
          [config.orderField]: order,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to update hierarchy.");
      }
      setSuccess(successMessage);
      router.refresh();
      return true;
    } catch (patchError) {
      setError(
        patchError instanceof Error
          ? patchError.message
          : "Unable to update hierarchy.",
      );
      return false;
    } finally {
      setPending("");
    }
  }

  function reorder(index: number, action: string) {
    if (!config) return;
    void patch(
      config.parentType,
      config.parentId,
      index,
      action,
      `${config.nodeTitle} reordered.`,
    );
  }

  async function move(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config || !selectedDestination) {
      setError("Select a valid destination.");
      return;
    }
    const moved = await patch(
      selectedDestination.parentType,
      selectedDestination.parentId,
      selectedDestination.siblingCount,
      "move",
      `${config.nodeTitle} moved.`,
    );
    if (moved) setOpen(false);
  }

  const first = config.siblingIndex <= 0;
  const last = config.siblingIndex >= config.siblingCount - 1;
  const disabled = Boolean(pending);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <ActionButton
        label="Move to top"
        title="Send to Top"
        disabled={disabled || first}
        onClick={() => reorder(0, "top")}
      >
        ⇈
      </ActionButton>
      <ActionButton
        label="Move up"
        title="Move Up"
        disabled={disabled || first}
        onClick={() => reorder(config.siblingIndex - 1, "up")}
      >
        ↑
      </ActionButton>
      <ActionButton
        label="Move down"
        title="Move Down"
        disabled={disabled || last}
        onClick={() => reorder(config.siblingIndex + 1, "down")}
      >
        ↓
      </ActionButton>
      <ActionButton
        label="Move to bottom"
        title="Send to Bottom"
        disabled={disabled || last}
        onClick={() => reorder(Math.max(0, config.siblingCount - 1), "bottom")}
      >
        ⇊
      </ActionButton>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError("");
          setSuccess("");
        }}
        disabled={disabled || destinations.length === 0}
        aria-haspopup="dialog"
        title={
          destinations.length
            ? "Move to another parent"
            : "No other valid destination"
        }
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40"
      >
        Move
      </button>

      {error ? (
        <p role="alert" className="basis-full pt-1 text-[11px] font-semibold text-rose-600">
          {error}
        </p>
      ) : null}
      {success ? (
        <span role="status" className="sr-only">
          {success}
        </span>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !pending) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="move-node-title"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !pending) setOpen(false);
            }}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div className="min-w-0">
                <h2 id="move-node-title" className="font-bold text-slate-950">
                  Move {nodeLabel(config.nodeType)}
                </h2>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {config.nodeTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={disabled}
                aria-label="Close move hierarchy node dialog"
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={move} className="space-y-4 p-4">
              <label className="block text-xs font-semibold text-slate-600">
                Destination parent
                <select
                  ref={selectRef}
                  value={selectedDestination ? destinationId(selectedDestination) : ""}
                  onChange={(event) => {
                    setDestinationKey(event.target.value);
                    setError("");
                  }}
                  disabled={disabled}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {destinations.map((destination) => (
                    <option
                      key={destinationId(destination)}
                      value={destinationId(destination)}
                    >
                      {parentLabel(destination.parentType)} ·{" "}
                      {destination.parentTitle} — {destination.bookTitle}
                    </option>
                  ))}
                </select>
              </label>

              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                The node will be inserted at the end of the selected parent.
              </p>

              {error ? (
                <p
                  role="alert"
                  className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={disabled}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disabled || !selectedDestination}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-45"
                >
                  {pending === "move" ? "Moving…" : "Move"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  title,
  disabled,
  onClick,
  children,
}: {
  label: string;
  title: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function destinationId(destination: HierarchyMoveDestination) {
  return `${destination.parentType}:${destination.parentId}`;
}

function nodeLabel(type: NodeType) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function parentLabel(type: ParentType) {
  return type === "BOOK" ? "Book" : nodeLabel(type);
}
