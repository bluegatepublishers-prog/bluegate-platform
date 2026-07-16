import { FileArchive, FileText, FolderOpen, MonitorPlay, Presentation, ScrollText } from "lucide-react";
import type { StudentSubjectViewModel, StudentResourceType } from "@/lib/student-subject-policy";

const groups: Array<{ title: string; types: StudentResourceType[]; icon: typeof FileText }> = [
  { title: "Videos", types: ["VIDEO"], icon: MonitorPlay },
  { title: "Worksheets and Documents", types: ["DOC"], icon: ScrollText },
  { title: "Presentations", types: ["PPT"], icon: Presentation },
  { title: "PDFs and Notes", types: ["PDF"], icon: FileText },
  { title: "Other Learning Resources", types: ["ZIP"], icon: FileArchive },
];

export default function StudentResourceGroups({ resources }: { resources: StudentSubjectViewModel["resources"] }) {
  if (!resources.length) {
    return <div className="rounded-3xl border bg-white p-10 text-center shadow-sm"><FolderOpen className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 text-xl font-bold">No learning resources yet</h2><p className="mt-2 text-slate-600">Student-ready resources will appear here after your school and publisher make them available.</p></div>;
  }
  return <div className="space-y-6">{groups.map(({ title, types, icon: Icon }) => {
    const items = resources.filter((resource) => types.includes(resource.type));
    if (!items.length) return null;
    return <section key={title} className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><Icon className="h-6 w-6 text-blue-700" /><h2 className="text-xl font-bold">{title}</h2></div><div className="mt-5 grid gap-3 md:grid-cols-2">{items.map((resource) => <article key={resource.id} className="flex flex-col rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{friendlyType(resource.type)}</p><h3 className="mt-1 font-bold">{resource.title}</h3><p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-600">{resource.description}</p><a href={resource.openPath} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Open Resource</a></article>)}</div></section>;
  })}</div>;
}

function friendlyType(type: StudentResourceType) {
  return type === "PPT" ? "Presentation" : type === "DOC" ? "Document" : type === "ZIP" ? "Resource pack" : type;
}
