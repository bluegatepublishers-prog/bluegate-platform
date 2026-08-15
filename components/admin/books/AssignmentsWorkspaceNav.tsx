import Link from "next/link";

type Workspace = "questions" | "worksheets" | "assessments";

const items: Array<{ key: Workspace; label: string; path: string }> = [
  { key: "questions", label: "Question Bank", path: "questions" },
  { key: "worksheets", label: "Worksheets", path: "worksheets" },
  { key: "assessments", label: "Assessments", path: "assessments" },
];

export default function AssignmentsWorkspaceNav({ bookId, active }: { bookId: string; active: Workspace }) {
  return (
    <nav aria-label="Assignments workspace" className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
      {items.map((item) => item.key === active ? (
        <span key={item.key} className="rounded-md bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">{item.label}</span>
      ) : (
        <Link key={item.key} href={`/admin/books/${bookId}/content/assignments/${item.path}`} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-700">{item.label}</Link>
      ))}
    </nav>
  );
}
