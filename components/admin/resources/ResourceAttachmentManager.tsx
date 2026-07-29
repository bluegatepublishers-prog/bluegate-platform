"use client";

import { ResourceAudience } from "@prisma/client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { getResourceAudienceLabel } from "@/lib/resource-audience-ui";

type TargetType = "BOOK" | "PART" | "UNIT" | "CHAPTER" | "MODULE" | "TOPIC";
type Target = { id: string; title: string };
type Targets = {
  parts: Target[];
  units: Target[];
  chapters: Target[];
  modules: Target[];
  topics: Target[];
};
type LinkItem = {
  id: string;
  bookId: string;
  bookTitle: string;
  targetType: TargetType;
  targetId: string | null;
  targetLabel: string;
  audienceOverride: ResourceAudience | null;
  qrEligible: boolean;
};

const EMPTY_TARGETS: Targets = {
  parts: [],
  units: [],
  chapters: [],
  modules: [],
  topics: [],
};

export default function ResourceAttachmentManager({
  resourceId,
  books,
  links,
  initiallyOpen = false,
}: {
  resourceId: string;
  books: { id: string; title: string }[];
  links: LinkItem[];
  initiallyOpen?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(initiallyOpen);
  const [bookId, setBookId] = useState(books[0]?.id ?? "");
  const [targetType, setTargetType] = useState<TargetType>("BOOK");
  const [targetId, setTargetId] = useState("");
  const [audienceOverride, setAudienceOverride] = useState("");
  const [qrEligible, setQrEligible] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [targets, setTargets] = useState<Targets>(EMPTY_TARGETS);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!bookId) return;
    const controller = new AbortController();
    fetch(
      `/api/admin/resources/${resourceId}/attachment-targets?bookId=${encodeURIComponent(bookId)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setTargets((await response.json()) as Targets);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage("Unable to load book targets.");
      });
    return () => controller.abort();
  }, [bookId, resourceId]);

  const availableTargets = useMemo(() => {
    if (targetType === "PART") return targets.parts;
    if (targetType === "UNIT") return targets.units;
    if (targetType === "CHAPTER") return targets.chapters;
    if (targetType === "MODULE") return targets.modules;
    if (targetType === "TOPIC") return targets.topics;
    return [];
  }, [targetType, targets]);

  function save() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/resources/${resourceId}/attachments`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId: editing,
          bookId,
          targetType,
          targetId: targetType === "BOOK" ? null : targetId,
          audienceOverride: audienceOverride || null,
          qrEligible,
        }),
      });
      const payload = await response.json().catch(() => ({ message: "" }));
      if (!response.ok) {
        setMessage(payload.message || "Unable to save attachment.");
        return;
      }
      reset();
      setMessage(editing ? "Attachment updated." : "Resource attached.");
      router.refresh();
    });
  }

  function mutate(link: LinkItem, input: { direction?: -1 | 1; remove?: boolean }) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/resources/${resourceId}/attachments`, {
        method: input.remove ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId: link.id,
          bookId: link.bookId,
          direction: input.direction,
        }),
      });
      const payload = await response.json().catch(() => ({ message: "" }));
      if (!response.ok) {
        setMessage(payload.message || "Unable to update attachment.");
        return;
      }
      router.refresh();
    });
  }

  function edit(link: LinkItem) {
    setOpen(true);
    setEditing(link.id);
    setBookId(link.bookId);
    setTargetType(link.targetType);
    setTargetId(link.targetId ?? "");
    setAudienceOverride(link.audienceOverride ?? "");
    setQrEligible(link.qrEligible);
  }

  function reset() {
    setEditing(null);
    setTargetType("BOOK");
    setTargetId("");
    setAudienceOverride("");
    setQrEligible(false);
  }

  return (
    <section id="usage" className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Book and content usage</h2>
          <p className="text-sm text-slate-500">
            One resource can be placed in many books without duplicating its file.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          {open ? "Close" : "Attach to content"}
        </button>
      </div>

      {open ? (
        <div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <Select label="Book" value={bookId} onChange={(value) => { setBookId(value); setTargetId(""); }}>
            {books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
          </Select>
          <Select label="Placement" value={targetType} onChange={(value) => { setTargetType(value as TargetType); setTargetId(""); }}>
            {(["BOOK", "PART", "UNIT", "CHAPTER", "MODULE", "TOPIC"] as const).map((type) => (
              <option key={type} value={type}>{type === "BOOK" ? "Whole book" : type[0] + type.slice(1).toLowerCase()}</option>
            ))}
          </Select>
          {targetType !== "BOOK" ? (
            <Select label="Target" value={targetId} onChange={setTargetId}>
              <option value="">Select target</option>
              {availableTargets.map((target) => <option key={target.id} value={target.id}>{target.title}</option>)}
            </Select>
          ) : null}
          <Select label="Audience override" value={audienceOverride} onChange={setAudienceOverride}>
            <option value="">Use resource default</option>
            {Object.values(ResourceAudience).map((audience) => (
              <option key={audience} value={audience}>{getResourceAudienceLabel(audience)}</option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={qrEligible} onChange={(event) => setQrEligible(event.target.checked)} />
            Eligible for QR placement
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="button"
              disabled={pending || !bookId || (targetType !== "BOOK" && !targetId)}
              onClick={save}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {editing ? "Save placement" : "Attach resource"}
            </button>
            {editing ? <button type="button" onClick={reset} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancel edit</button> : null}
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {links.length ? links.map((link) => (
          <article key={link.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href={`/admin/books/${link.bookId}/digital-content`}
                className="font-semibold text-blue-700 hover:underline"
              >
                {link.bookTitle}
              </Link>
              <p className="text-sm text-slate-500">{link.targetLabel}</p>
              <p className="mt-1 text-xs text-slate-500">
                {link.audienceOverride ? `Override: ${getResourceAudienceLabel(link.audienceOverride)}` : "Default audience"}
                {link.qrEligible ? " · QR eligible" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SmallButton onClick={() => edit(link)}>Edit</SmallButton>
              <SmallButton onClick={() => mutate(link, { direction: -1 })}>Up</SmallButton>
              <SmallButton onClick={() => mutate(link, { direction: 1 })}>Down</SmallButton>
              <SmallButton onClick={() => mutate(link, { remove: true })}>Detach</SmallButton>
            </div>
          </article>
        )) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Not attached through Book Studio yet.</p>}
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-sm font-semibold text-blue-700">{message}</p>
    </section>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="text-sm font-semibold text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border bg-white px-3 py-2">{children}</select></label>;
}

function SmallButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-slate-700">{children}</button>;
}
