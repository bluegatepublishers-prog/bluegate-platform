import Link from "next/link";

import type { ReleaseSummary } from "@/lib/content-release";

type ReleaseAction =
  | "SUBMIT_REVIEW"
  | "RETURN_DRAFT"
  | "APPROVE"
  | "PUBLISH"
  | "UNPUBLISH"
  | "ARCHIVE"
  | "RESTORE";

type Props = {
  summary: ReleaseSummary;
  transitionAction: (action: ReleaseAction, form: FormData) => Promise<void>;
  rollbackAction: (versionId: string, form: FormData) => Promise<void>;
  bulkPublishAction?: (form: FormData) => Promise<void>;
  previewBaseHref?: string;
};

const button =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";
const primary =
  "rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800";
const danger =
  "rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100";

export default function ContentReleasePanel({
  summary,
  transitionAction,
  rollbackAction,
  bulkPublishAction,
  previewBaseHref,
}: Props) {
  const counts = {
    errors: summary.validation.errors.length,
    warnings: summary.validation.warnings.length,
    info: summary.validation.info.length,
  };
  const canPublish = counts.errors === 0;
  const needsConfirm = counts.warnings > 0;
  const isBulkTarget = summary.targetType === "BOOK" || summary.targetType === "CHAPTER";

  return (
    <div className="space-y-4 text-sm text-slate-600">
      <dl className="space-y-3">
        <ReleaseRow label="Lifecycle" value={summary.lifecycle.replace("_", " ")} />
        <ReleaseRow
          label="Published Version"
          value={summary.currentVersionNumber ? `v${summary.currentVersionNumber}` : "None"}
        />
        <ReleaseRow label="Latest Version" value={`v${summary.latestVersionNumber}`} />
        <ReleaseRow label="Draft Changes" value={summary.draftChanged ? "Draft differs from live" : "No draft delta"} />
        <ReleaseRow
          label="Last Published"
          value={summary.lastPublishedAt ? new Date(summary.lastPublishedAt).toLocaleString("en-IN") : "Never"}
        />
      </dl>

      <div className="rounded-[1.25rem] bg-slate-50 p-4 ring-1 ring-slate-200">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Validation</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Badge tone={counts.errors ? "error" : "neutral"} label="Errors" value={counts.errors} />
          <Badge tone={counts.warnings ? "warning" : "neutral"} label="Warnings" value={counts.warnings} />
          <Badge tone="neutral" label="Info" value={counts.info} />
        </div>
        <ValidationMessages summary={summary} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ReleaseForm action={transitionAction} value="SUBMIT_REVIEW" label="Submit Review" className={button} />
        <ReleaseForm action={transitionAction} value="RETURN_DRAFT" label="Return Draft" className={button} />
        <ReleaseForm action={transitionAction} value="APPROVE" label="Approve" className={button} withNotes />
        <ReleaseForm
          action={transitionAction}
          value="PUBLISH"
          label={canPublish ? "Publish" : "Publish Blocked"}
          className={primary}
          confirm
          withNotes
          disabled={!canPublish}
          warning={needsConfirm ? "Warnings exist. Confirm before publishing." : undefined}
        />
        <ReleaseForm action={transitionAction} value="UNPUBLISH" label="Unpublish" className={button} confirm />
        <ReleaseForm action={transitionAction} value="ARCHIVE" label="Archive" className={danger} confirm />
        {summary.lifecycle === "ARCHIVED" ? (
          <ReleaseForm action={transitionAction} value="RESTORE" label="Restore" className={button} />
        ) : null}
      </div>

      {bulkPublishAction && isBulkTarget ? (
        <div className="rounded-[1.25rem] bg-[#f7f4ed] p-4 ring-1 ring-amber-100">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">Bulk Publish</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            Publishes this {summary.targetType.toLowerCase()} and safely resolvable descendant modules/topics in one checked operation.
          </p>
          <form action={bulkPublishAction} className="mt-3 space-y-3">
            <textarea
              name="releaseNotes"
              rows={2}
              placeholder="Bulk release notes"
              className="w-full rounded-2xl border border-amber-100 bg-white px-3 py-2 text-xs outline-none focus:border-amber-200"
            />
            <label className="flex items-start gap-2 text-xs font-semibold text-slate-600">
              <input name="confirm" type="checkbox" className="mt-1" />
              Confirm bulk publish after validation.
            </label>
            <button className={primary}>Bulk Publish</button>
          </form>
        </div>
      ) : null}

      <div className="rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Version History</p>
        <div className="mt-3 space-y-3">
          {summary.history.map((version) => (
            <article key={version.id} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-800">v{version.versionNumber}</p>
                  <p className="text-xs text-slate-500">
                    {version.publishedAt ? new Date(version.publishedAt).toLocaleString("en-IN") : new Date(version.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                  {version.lifecycle}
                </span>
              </div>
              <p className="mt-2 break-all text-[11px] text-slate-400">Checksum {version.checksum.slice(0, 16)}</p>
              {version.releaseNotes ? <p className="mt-2 text-xs text-slate-600">{version.releaseNotes}</p> : null}
              {previewBaseHref ? (
                <Link
                  href={`${previewBaseHref}/${version.id}`}
                  className="mt-3 inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                >
                  Preview Version
                </Link>
              ) : null}
              <form action={rollbackAction.bind(null, version.id)} className="mt-3 space-y-2">
                <input type="hidden" name="releaseNotes" value={`Rollback to v${version.versionNumber}`} />
                <label className="flex items-start gap-2 text-xs font-semibold text-slate-600">
                  <input name="confirm" type="checkbox" className="mt-1" />
                  Confirm rollback by publishing a new version from this snapshot.
                </label>
                <button className={button}>Rollback</button>
              </form>
            </article>
          ))}
          {!summary.history.length ? <p>No published history yet.</p> : null}
        </div>
      </div>
    </div>
  );
}

function ReleaseForm({
  action,
  value,
  label,
  className,
  confirm,
  disabled,
  warning,
  withNotes,
}: {
  action: Props["transitionAction"];
  value: ReleaseAction;
  label: string;
  className: string;
  confirm?: boolean;
  disabled?: boolean;
  warning?: string;
  withNotes?: boolean;
}) {
  return (
    <form action={action.bind(null, value)} className="space-y-2">
      {withNotes ? (
        <textarea
          name="releaseNotes"
          rows={2}
          placeholder="Release notes"
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-300"
        />
      ) : (
        <textarea name="releaseNotes" rows={2} className="hidden" />
      )}
      {confirm ? (
        <label className="flex items-start gap-2 text-[11px] font-semibold text-slate-500">
          <input name="confirm" type="checkbox" className="mt-1" />
          Confirm
        </label>
      ) : null}
      {warning ? <p className="text-[11px] font-semibold text-amber-700">{warning}</p> : null}
      <button disabled={disabled} className={`${className} disabled:cursor-not-allowed disabled:opacity-50`}>
        {label}
      </button>
    </form>
  );
}

function ReleaseRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
      <dd className="max-w-[12rem] text-right font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function Badge({ label, value, tone }: { label: string; value: number; tone: "neutral" | "error" | "warning" }) {
  const toneClass =
    tone === "error"
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-white text-slate-600 ring-slate-200";
  return (
    <div className={`rounded-2xl px-2 py-3 ring-1 ${toneClass}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em]">{label}</p>
    </div>
  );
}

function ValidationMessages({ summary }: { summary: ReleaseSummary }) {
  const messages = [
    ...summary.validation.errors,
    ...summary.validation.warnings,
    ...summary.validation.info,
  ];
  if (!messages.length) {
    return <p className="mt-3 text-xs text-slate-500">No blocking release issues found.</p>;
  }
  return (
    <div className="mt-3 space-y-2">
      {messages.slice(0, 6).map((item) => (
        <p key={`${item.severity}:${item.code}:${item.message}`} className="text-xs leading-5 text-slate-600">
          <span className="font-bold">{item.severity}</span> {item.message}
        </p>
      ))}
      {messages.length > 6 ? <p className="text-xs text-slate-400">+{messages.length - 6} more validation messages.</p> : null}
    </div>
  );
}
