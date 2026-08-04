import Link from "next/link";
import { BookOpenCheck, CircleAlert, ClipboardList, FileDown, FileText, PlayCircle, QrCode } from "lucide-react";

import type { ContentBlock } from "@/lib/content-document";
import type { ContentRenderMode } from "@/lib/content-audience";
import type { ResolvedLinkedAsset } from "@/lib/content-linked-asset-types";

export default function LinkedAssetView({
  block,
  linkedAsset,
  sectionLabel,
  mode,
}: {
  block: Extract<ContentBlock, { type: "linkedAsset" }>;
  linkedAsset: ResolvedLinkedAsset | null;
  sectionLabel: string | null;
  mode: ContentRenderMode;
}) {
  const unavailable = !linkedAsset;
  const teacherOnly =
    linkedAsset?.teacherOnly ?? (block.audience.length === 1 && block.audience[0] === "TEACHER");
  const shellClass =
    block.displayStyle === "inline"
      ? "inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
      : block.displayStyle === "callout"
        ? "flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#f6f1e7] px-4 py-3 text-sm font-semibold text-slate-800"
        : "inline-flex max-w-full items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white";

  const body = (
    <>
      {renderAssetIcon(block.assetKind)}
      <span className="truncate">{block.label}</span>
      {block.required ? <Badge label="Required" /> : null}
      {sectionLabel ? <Badge label={sectionLabel} /> : null}
      {mode === "ADMIN_PREVIEW" && teacherOnly ? <Badge label="Teacher" tone="amber" /> : null}
      {unavailable ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-700">
          <CircleAlert className="h-3 w-3" />
          Unavailable
        </span>
      ) : null}
      {mode === "ADMIN_PREVIEW" && linkedAsset ? <Badge label={linkedAsset.sourceBadge} /> : null}
    </>
  );

  if (unavailable || !linkedAsset?.route) return <div className={shellClass}>{body}</div>;
  if (mode === "STUDENT" && linkedAsset.route.href.startsWith("/admin")) {
    return <div className={shellClass}>{body}</div>;
  }
  const external = linkedAsset.route.href.startsWith("https://");
  return external ? (
    <a href={linkedAsset.route.href} target="_blank" rel="noreferrer" className={shellClass}>{body}</a>
  ) : (
    <Link href={linkedAsset.route.href} className={shellClass}>{body}</Link>
  );
}

function Badge({ label, tone = "slate" }: { label: string; tone?: "slate" | "amber" }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
      tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-white/80 text-slate-500"
    }`}>
      {label}
    </span>
  );
}

function renderAssetIcon(kind: ResolvedLinkedAsset["assetKind"] | ContentBlock["type"]) {
  switch (kind) {
    case "video":
      return <PlayCircle className="h-4 w-4 shrink-0" />;
    case "worksheet":
      return <FileDown className="h-4 w-4 shrink-0" />;
    case "activity":
      return <ClipboardList className="h-4 w-4 shrink-0" />;
    case "exercise":
    case "learningOutcome":
      return <BookOpenCheck className="h-4 w-4 shrink-0" />;
    case "qr":
      return <QrCode className="h-4 w-4 shrink-0" />;
    case "resource":
    default:
      return <FileText className="h-4 w-4 shrink-0" />;
  }
}
