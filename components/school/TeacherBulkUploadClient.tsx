"use client";

import { useMemo, useState } from "react";

type PreviewRow = { excelRow: number; status: string; messages: string[] };
type TeacherRow = PreviewRow & { teacherName: string; email: string; phone: string; designation: string };
type AssignmentRow = PreviewRow & { teacherEmail: string; academicYear: string; classCode: string; className: string; sectionCode: string; sectionName: string; assignmentType: string; subjectCode: string; subjectName: string };
type Preview = { ok: true; teachers: TeacherRow[]; assignments: AssignmentRow[]; teacherSummary: { total: number; new: number; existing: number; warnings: number; errors: number }; assignmentSummary: { total: number; ready: number; existing: number; warnings: number; errors: number }; workbookWarnings: string[]; notice: string };
type ImportResult = { ok: true; teacherSummary: { total: number; created: number; existing: number; failed: number; invitationSent: number; invitationFailed: number }; assignmentSummary: { total: number; created: number; existing: number; failed: number }; teachers: Array<{ excelRow: number; teacherName: string; email: string; status: string; message: string }>; assignments: Array<{ excelRow: number; teacherEmail: string; status: string; message: string }>; notice: "Import Complete" };

export default function TeacherBulkUploadClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const teacherRows = useMemo(() => filterRows(preview?.teachers ?? [], query, status), [preview, query, status]);
  const assignmentRows = useMemo(() => filterRows(preview?.assignments ?? [], query, status), [preview, query, status]);

  async function validate() {
    if (!file) return;
    setPending(true);
    setError("");
    setResult(null);
    setPreview(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/school-dashboard/teachers/bulk-upload/validate", { method: "POST", body: formData, credentials: "same-origin" });
      const responseBody = await response.json() as Preview | { ok: false; error?: string };
      if (!response.ok || !responseBody.ok) setError((responseBody as { error?: string }).error ?? "The workbook could not be validated.");
      else setPreview(responseBody);
    } catch {
      setError("The workbook could not be validated. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function importWorkbook() {
    if (!file || !preview || importing || result) return;
    if (preview.teacherSummary.errors || preview.assignmentSummary.errors) {
      setError("Resolve all preview errors before importing.");
      return;
    }
    if (!window.confirm("Import the validated Teachers and Assignments? Existing profiles remain unchanged.")) return;
    setImporting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("mode", "import");
      const response = await fetch("/school-dashboard/teachers/bulk-upload/validate", { method: "POST", body: formData, credentials: "same-origin" });
      const responseBody = await response.json() as ImportResult | { ok: false; error?: string };
      if (!response.ok || !responseBody.ok) setError((responseBody as { error?: string }).error ?? "The Teacher import could not be completed.");
      else setResult(responseBody);
    } catch {
      setError("The Teacher import could not be completed. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  function chooseFile(nextFile: File | null) {
    setFile(nextFile);
    setPreview(null);
    setResult(null);
    setError("");
  }

  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1"><span className="mb-2 block text-sm font-bold text-slate-800">Upload .xlsx</span><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} className="block w-full rounded-xl border border-slate-300 p-2 text-sm" /></label>
      <button type="button" onClick={validate} disabled={!file || pending || importing} className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{pending ? "Validating…" : "Validate workbook"}</button>
    </div>
    <p className="text-xs text-slate-500">Preview only until you explicitly import. No Teacher, User, membership, assignment, password, activation challenge, or email is created during validation.</p>
    {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</p> : null}
    {preview ? <>
      <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-800">{preview.notice}</p>
      <div className="grid gap-3 sm:grid-cols-2"><Summary title="Teachers" items={[["Total", preview.teacherSummary.total], ["New", preview.teacherSummary.new], ["Existing", preview.teacherSummary.existing], ["Warnings", preview.teacherSummary.warnings], ["Errors", preview.teacherSummary.errors]]} /><Summary title="Assignments" items={[["Total", preview.assignmentSummary.total], ["Ready", preview.assignmentSummary.ready], ["Existing", preview.assignmentSummary.existing], ["Warnings", preview.assignmentSummary.warnings], ["Errors", preview.assignmentSummary.errors]]} /></div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><button type="button" onClick={importWorkbook} disabled={!file || importing || Boolean(result) || Boolean(preview.teacherSummary.errors || preview.assignmentSummary.errors)} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{importing ? "Importing…" : result ? "Imported" : "Import Teachers & Assignments"}</button><p className="mt-2 text-xs text-amber-900">Import re-reads and revalidates the original workbook on the server. It creates no plaintext credentials workbook.</p></div>
      <div className="flex flex-wrap gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search preview" className="h-10 min-w-64 flex-1 rounded-lg border border-slate-300 px-3 text-sm" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm"><option value="ALL">All statuses</option><option value="READY">Ready</option><option value="EXISTING">Existing</option><option value="WARNING">Warning</option><option value="ERROR">Error</option></select></div>
      <PreviewTable title="Teachers" rows={teacherRows} columns={["Row", "Teacher Name", "Email", "Phone", "Designation", "Status", "Message"]} render={(row) => <><td>{row.excelRow}</td><td className="font-semibold">{row.teacherName}</td><td>{row.email}</td><td>{row.phone || "—"}</td><td>{row.designation || "—"}</td><td><Status value={row.status} /></td><td>{row.messages.join(" ") || "—"}</td></>} />
      <PreviewTable title="Assignments" rows={assignmentRows} columns={["Row", "Teacher Email", "Academic Year", "Class", "Section", "Type", "Subject", "Status", "Message"]} render={(row) => <><td>{row.excelRow}</td><td>{row.teacherEmail}</td><td>{row.academicYear}</td><td>{row.className || row.classCode}</td><td>{row.sectionName || row.sectionCode}</td><td>{row.assignmentType}</td><td>{row.subjectName || row.subjectCode || "—"}</td><td><Status value={row.status} /></td><td>{row.messages.join(" ") || "—"}</td></>} />
      {preview.workbookWarnings.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-bold">Workbook warnings</p><ul className="mt-1 list-disc pl-5">{preview.workbookWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}
    </> : null}
    {result ? <section role="status" className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><p className="font-bold">{result.notice}</p><div className="grid gap-2 sm:grid-cols-2"><Summary title="Teachers" items={[["Total", result.teacherSummary.total], ["Created", result.teacherSummary.created], ["Existing", result.teacherSummary.existing], ["Failed", result.teacherSummary.failed], ["Invitations sent", result.teacherSummary.invitationSent], ["Invitations failed", result.teacherSummary.invitationFailed]]} /><Summary title="Assignments" items={[["Total", result.assignmentSummary.total], ["Created", result.assignmentSummary.created], ["Existing", result.assignmentSummary.existing], ["Failed", result.assignmentSummary.failed]]} /></div><p>New Teachers receive an activation invitation after their account transaction commits. Existing Teacher profiles are unchanged.</p><ResultTable title="Teacher results" columns={["Row", "Teacher Name", "Email", "Status", "Message"]} rows={result.teachers} render={(row) => <><td>{row.excelRow}</td><td>{row.teacherName}</td><td>{row.email}</td><td><Status value={row.status} /></td><td>{row.message}</td></>} /><ResultTable title="Assignment results" columns={["Row", "Teacher Email", "Status", "Message"]} rows={result.assignments} render={(row) => <><td>{row.excelRow}</td><td>{row.teacherEmail}</td><td><Status value={row.status} /></td><td>{row.message}</td></>} /></section> : null}
  </section>;
}

function Summary({ title, items }: { title: string; items: Array<[string, number]> }) { return <div className="rounded-xl border border-slate-200 p-4"><h2 className="font-bold text-slate-900">{title}</h2><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">{items.map(([label, value]) => <span key={label}><span className="text-slate-500">{label}:</span> <strong>{value}</strong></span>)}</div></div>; }
function Status({ value }: { value: string }) { return <span className={"rounded-full px-2 py-1 text-xs font-bold " + (value === "ERROR" || value === "FAILED" ? "bg-rose-50 text-rose-700" : value === "EXISTING" ? "bg-slate-100 text-slate-700" : value === "WARNING" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>{value}</span>; }
function PreviewTable<T extends PreviewRow>({ title, rows, columns, render }: { title: string; rows: T[]; columns: string[]; render: (row: T) => React.ReactNode }) { return <section className="overflow-hidden rounded-xl border border-slate-200"><div className="border-b border-slate-200 bg-slate-50 px-4 py-3"><h2 className="font-bold text-slate-900">{title} <span className="text-xs font-normal text-slate-500">({rows.length} shown)</span></h2></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-white text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2">{column}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((row) => <tr key={row.excelRow}>{render(row)}</tr>) : <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500">No rows match the current filter.</td></tr>}</tbody></table></div></section>; }
function ResultTable<T extends { excelRow: number }>({ title, columns, rows, render }: { title: string; columns: string[]; rows: T[]; render: (row: T) => React.ReactNode }) { return <section className="overflow-hidden rounded-xl border border-emerald-200"><div className="border-b border-emerald-200 px-4 py-3"><h2 className="font-bold">{title}</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr>{columns.map((column) => <th key={column} className="px-3 py-2">{column}</th>)}</tr></thead><tbody className="divide-y divide-emerald-100">{rows.map((row) => <tr key={row.excelRow}>{render(row)}</tr>)}</tbody></table></div></section>; }
function filterRows<T extends PreviewRow>(rows: T[], query: string, status: string) { const normalized = query.trim().toLowerCase(); return rows.filter((row) => (status === "ALL" || row.status === status) && (!normalized || JSON.stringify(row).toLowerCase().includes(normalized))); }
