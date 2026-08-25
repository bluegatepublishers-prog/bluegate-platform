"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";

import type { StudentBulkImportResult, StudentBulkPreview, StudentBulkPreviewRow } from "@/lib/student-bulk-import";

type Filter = "ALL" | "READY" | "EXISTING" | "WARNING" | "ERROR";

export default function StudentBulkUploadClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StudentBulkPreview | null>(null);
  const [importResult, setImportResult] = useState<StudentBulkImportResult | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);

  const visibleRows = useMemo(() => {
    if (!preview) return [];
    const query = search.trim().toLowerCase();
    return preview.rows.filter((row) => {
      const filterMatches = filter === "ALL" || row.status === filter;
      const searchMatches = !query || row.admissionNumber.toLowerCase().includes(query) || row.studentName.toLowerCase().includes(query);
      return filterMatches && searchMatches;
    });
  }, [filter, preview, search]);

  async function submit(mode: "preview" | "import") {
    if (!file) {
      setError("Choose an .xlsx file first.");
      return;
    }
    setPending(true);
    setError("");
    if (mode === "preview") setPreview(null);
    else setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      const response = await fetch("/school-dashboard/students/bulk-upload/template", { method: "POST", body: formData });
      const result = await response.json() as StudentBulkPreview | StudentBulkImportResult | { ok: false; error?: string };
      if (!response.ok || !result.ok) {
        setError(result.ok ? "The file could not be validated." : result.error ?? "The file could not be validated.");
      } else if (mode === "preview") {
        setPreview(result as StudentBulkPreview);
      } else {
        setImportResult(result as StudentBulkImportResult);
      }
    } catch {
      setError("The file could not be validated. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function validateFile() {
    return submit("preview");
  }

  function importReadyStudents() {
    if (!window.confirm("Import the ready Students and their active enrollments? Existing students will be skipped.")) return;
    return submit("import");
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Upload Student File</h2>
        <p className="mt-2 text-sm text-slate-600">Only the Students sheet is parsed. The file is validated in memory and then discarded.</p>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-sm font-bold text-slate-700">
            Choose Excel File
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setImportResult(null); setError(""); }}
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
            />
          </label>
          <button type="button" onClick={validateFile} disabled={pending || !file} className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? "Validating..." : "Validate File"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">Maximum file size: 5 MB. Maximum student rows: 5,000.</p>
        {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p> : null}
      </section>

      {preview ? (
        <section className="space-y-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-bold text-amber-950">{preview.notice}</p>
            <p className="mt-1 text-sm text-amber-800">This is a preview only. No students, enrollments, users, or passwords have been created.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Import Preview</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              <Summary label="Total rows" value={preview.summary.total} />
              <Summary label="Ready" value={preview.summary.ready} tone="ready" />
              <Summary label="Existing" value={preview.summary.existing} tone="existing" />
              <Summary label="Warnings" value={preview.summary.warnings} tone="warning" />
              <Summary label="Errors" value={preview.summary.errors} tone="error" />
            </div>
            {preview.workbookWarnings.length ? <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{preview.workbookWarnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
            {preview.summary.ready > 0 ? (
              <button type="button" onClick={importReadyStudents} disabled={pending} className="mt-5 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {pending ? "Importing…" : "Import " + preview.summary.ready + " Students"}
              </button>
            ) : null}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
              {(["ALL", "READY", "EXISTING", "WARNING", "ERROR"] as Filter[]).map((item) => (
                <button key={item} type="button" onClick={() => setFilter(item)} className={"rounded-lg px-3 py-2 text-xs font-bold " + (filter === item ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700")}>
                  {item === "ALL" ? "All" : item[0] + item.slice(1).toLowerCase() + (item === "WARNING" ? "s" : item === "ERROR" ? "s" : "")}
                </button>
              ))}
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search admission number or name" className="ml-auto h-9 min-w-[220px] rounded-lg border border-slate-300 px-3 text-sm" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Excel Row</th><th className="px-4 py-3">Admission Number</th><th className="px-4 py-3">Student Name</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Academic Year</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Messages</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{visibleRows.map((row) => <PreviewRow key={row.excelRow} row={row} />)}</tbody>
              </table>
              {!visibleRows.length ? <p className="p-8 text-center text-sm text-slate-500">No preview rows match this filter.</p> : null}
            </div>
          </div>
        </section>
      ) : null}
      {importResult ? (
        <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">{importResult.notice}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Summary label="Total rows" value={importResult.total} />
            <Summary label="Imported" value={importResult.imported} tone="ready" />
            <Summary label="Existing skipped" value={importResult.skipped} tone="existing" />
            <Summary label="Failed" value={importResult.failed} tone="error" />
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Excel Row</th><th className="px-4 py-3">Admission Number</th><th className="px-4 py-3">Student Name</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Academic Year</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Message</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{importResult.rows.map((row) => <tr key={row.excelRow}><td className="px-4 py-3">{row.excelRow}</td><td className="px-4 py-3 font-semibold">{row.admissionNumber || "—"}</td><td className="px-4 py-3">{row.studentName || "—"}</td><td className="px-4 py-3">{row.className || "—"}</td><td className="px-4 py-3">{row.sectionName || "—"}</td><td className="px-4 py-3">{row.academicYear || "—"}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{row.status}</span></td><td className="px-4 py-3 text-slate-600">{row.message}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone?: "ready" | "existing" | "warning" | "error" }) {
  const color = tone === "ready" ? "text-emerald-700" : tone === "existing" ? "text-blue-700" : tone === "warning" ? "text-amber-700" : tone === "error" ? "text-rose-700" : "text-slate-900";
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className={"mt-1 text-2xl font-bold " + color}>{value}</p></div>;
}

function PreviewRow({ row }: { row: StudentBulkPreviewRow }) {
  const statusClass = row.status === "READY" ? "bg-emerald-50 text-emerald-700" : row.status === "EXISTING" ? "bg-blue-50 text-blue-700" : row.status === "WARNING" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
  return <tr><td className="px-4 py-3">{row.excelRow}</td><td className="px-4 py-3 font-semibold">{row.admissionNumber || "—"}</td><td className="px-4 py-3">{row.studentName || "—"}</td><td className="px-4 py-3">{row.className || "—"}</td><td className="px-4 py-3">{row.sectionName || "—"}</td><td className="px-4 py-3">{row.academicYear || "—"}</td><td className="px-4 py-3"><span className={"rounded-full px-2 py-1 text-xs font-bold " + statusClass}>{row.status}</span></td><td className="max-w-[360px] whitespace-normal px-4 py-3 text-slate-600">{row.messages.join(" ") || "—"}</td></tr>;
}
