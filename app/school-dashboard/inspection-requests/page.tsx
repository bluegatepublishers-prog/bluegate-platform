import { ClipboardCheck } from "lucide-react";

import InspectionStatusBadge from "@/components/admin/InspectionStatusBadge";
import { getSchoolInspectionRequests } from "@/lib/school-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SchoolInspectionRequestsPage() {
  const requests = await getSchoolInspectionRequests();
  return (
    <main className="space-y-8 p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-3xl font-bold">Inspection Requests</h1>
        <p className="mt-2 text-slate-600">Requests associated with your school account.</p>
      </header>
      {requests.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((request) => (
            <article key={request.id} className="min-w-0 rounded-3xl border bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="break-words text-xl font-bold">{request.bookTitle}</h2>
                <InspectionStatusBadge status={request.status} />
              </div>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="font-semibold text-slate-500">Teacher</dt><dd className="break-words">{request.teacherName}</dd></div>
                <div><dt className="font-semibold text-slate-500">Class</dt><dd>{request.bookClass}</dd></div>
                <div><dt className="font-semibold text-slate-500">Subject</dt><dd>{request.bookSubject}</dd></div>
                <div><dt className="font-semibold text-slate-500">Requested</dt><dd>{request.createdAt.toLocaleString("en-IN")}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border bg-white p-14 text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-xl font-bold">No inspection requests</h2>
          <p className="mt-2 text-slate-500">Requests linked to this school will appear here.</p>
        </div>
      )}
    </main>
  );
}
