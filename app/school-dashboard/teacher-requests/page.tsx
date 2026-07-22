import { Inbox } from "lucide-react";
import { getSchoolTeacherRequests } from "@/lib/onboarding-approvals";
import { reviewTeacherAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherRequestsPage() {
  const requests = await getSchoolTeacherRequests();
  const pending = requests.filter((request) => request.status === "PENDING");
  const reviewed = requests.filter((request) => request.status !== "PENDING");

  return <main className="space-y-7 p-4 sm:p-6 lg:p-8">
    <header><p className="font-bold text-blue-700">School approval</p><h1 className="text-3xl font-bold">Teacher Requests</h1><p className="mt-2 text-slate-600">Approval links the teacher to this school. Class and subject assignments remain a separate step.</p></header>
    <section className="grid gap-4 sm:grid-cols-3"><Summary label="Pending review" value={pending.length} warning /><Summary label="Approved" value={requests.filter((request) => request.status === "APPROVED").length} /><Summary label="Rejected or suspended" value={requests.filter((request) => request.status === "REJECTED" || request.status === "SUSPENDED").length} /></section>

    <section><h2 className="text-xl font-bold">Needs review</h2>{pending.length ? <div className="mt-4 grid gap-5 xl:grid-cols-2">{pending.map((request) => <article key={request.id} className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm"><TeacherIdentity request={request} /><form action={reviewTeacherAction} className="mt-5 grid gap-3"><input type="hidden" name="requestId" value={request.id}/><label className="text-sm font-semibold">Reason for rejection or suspension<textarea name="reason" className="mt-2 min-h-20 w-full rounded-xl border p-3" maxLength={500}/></label><div className="flex flex-wrap gap-2"><button name="status" value="APPROVED" className="rounded-xl bg-green-700 px-4 py-2 font-bold text-white">Approve</button><button name="status" value="REJECTED" className="rounded-xl border border-rose-300 px-4 py-2 font-bold text-rose-700">Reject</button><button name="status" value="SUSPENDED" className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">Suspend</button></div></form></article>)}</div> : <div className="mt-4 rounded-3xl border bg-white p-10 text-center"><Inbox className="mx-auto h-10 w-10 text-slate-300"/><p className="mt-3 font-semibold text-slate-700">No teacher requests need review.</p></div>}</section>

    {reviewed.length ? <section><h2 className="text-xl font-bold">Reviewed requests</h2><div className="mt-4 grid gap-4 xl:grid-cols-2">{reviewed.map((request) => <article key={request.id} className="rounded-2xl border bg-white p-5"><TeacherIdentity request={request} />{request.reason ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Review note: {request.reason}</p> : null}<p className="mt-3 text-xs text-slate-500">{request.reviewedAt ? `Reviewed ${request.reviewedAt.toLocaleString("en-IN")}` : "Review date unavailable"}</p></article>)}</div></section> : null}
  </main>;
}

type RequestItem = Awaited<ReturnType<typeof getSchoolTeacherRequests>>[number];

function TeacherIdentity({ request }: { request: RequestItem }) {
  return <div className="flex justify-between gap-4"><div><h3 className="text-xl font-bold">{request.teacher.user.name}</h3><p className="text-sm text-slate-600">{request.teacher.user.email} · {request.teacher.designation}</p><p className="text-sm text-slate-500">{request.teacher.subject} · {request.teacher.classes}</p></div><span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{request.status}</span></div>;
}

function Summary({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <div className={`rounded-2xl border bg-white p-5 ${warning && value ? "border-amber-300" : ""}`}><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-slate-600">{label}</p></div>;
}
