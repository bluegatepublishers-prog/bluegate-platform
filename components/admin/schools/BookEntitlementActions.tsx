"use client";

import { ContentEntitlementStatus } from "@prisma/client";
import {
  Archive,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  ShieldX,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import { changeSchoolBookEntitlementAction } from "@/app/admin/schools/[id]/content-actions";

export default function BookEntitlementActions({
  schoolId,
  entitlementId,
  status,
}: {
  schoolId: string;
  entitlementId: string;
  status: ContentEntitlementStatus;
}) {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const [revokeOpen, setRevokeOpen] =
    useState(false);

  const menuRef =
    useRef<HTMLDivElement | null>(null);

  const action =
    changeSchoolBookEntitlementAction.bind(
      null,
      schoolId,
      entitlementId,
    );

  useEffect(() => {
    if (!menuOpen) return;

    function handleMouseDown(
      event: MouseEvent,
    ) {
      if (
        !menuRef.current?.contains(
          event.target as Node,
        )
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setRevokeOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleMouseDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleMouseDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [menuOpen]);

  return (
    <>
      <div
        ref={menuRef}
        className="relative"
      >
        <button
          type="button"
          onClick={() =>
            setMenuOpen(
              (current) => !current,
            )
          }
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          aria-label="Book entitlement actions"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {menuOpen ? (
          <div className="absolute right-0 z-40 mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {status ===
            ContentEntitlementStatus.ACTIVE ? (
              <ActionButton
                action={action}
                value="pause"
                label="Pause"
                icon={Pause}
              />
            ) : null}

            {status ===
            ContentEntitlementStatus.PAUSED ? (
              <ActionButton
                action={action}
                value="resume"
                label="Resume"
                icon={Play}
              />
            ) : null}

            {status ===
              ContentEntitlementStatus.REVOKED ||
            status ===
              ContentEntitlementStatus.ARCHIVED ? (
              <ActionButton
                action={action}
                value="restore"
                label="Restore"
                icon={RotateCcw}
              />
            ) : null}

            {status !==
            ContentEntitlementStatus.ARCHIVED ? (
              <ActionButton
                action={action}
                value="archive"
                label="Archive"
                icon={Archive}
              />
            ) : null}

            {status !==
              ContentEntitlementStatus.REVOKED &&
            status !==
              ContentEntitlementStatus.ARCHIVED ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setRevokeOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[10px] font-semibold text-rose-700 hover:bg-rose-50"
              >
                <ShieldX className="h-3.5 w-3.5" />
                Revoke
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {revokeOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            action={action}
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-950">
                  Revoke Book Access
                </h2>

                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  Access will be removed,
                  but entitlement history is
                  retained.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRevokeOpen(false)
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              type="hidden"
              name="action"
              value="revoke"
            />

            <label className="mt-4 block">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
                Reason
              </span>

              <textarea
                name="reason"
                required
                rows={3}
                placeholder="Reason for revoking access..."
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-rose-300"
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setRevokeOpen(false)
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-rose-600 px-3 py-2 text-[10px] font-bold text-white"
              >
                Revoke Access
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function ActionButton({
  action,
  value,
  label,
  icon: Icon,
}: {
  action: (
    formData: FormData,
  ) => void | Promise<void>;

  value:
    | "pause"
    | "resume"
    | "restore"
    | "archive";

  label: string;

  icon: typeof Pause;
}) {
  return (
    <form action={action}>
      <input
        type="hidden"
        name="action"
        value={value}
      />

      <button
        type="submit"
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    </form>
  );
}