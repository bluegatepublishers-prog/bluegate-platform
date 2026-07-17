import Link from "next/link";
import { ClipboardCheck, Search, X } from "lucide-react";

import InspectionStatusBadge from "@/components/admin/InspectionStatusBadge";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import {
  getInspectionRequests,
  type InspectionRequestRecord,
} from "@/lib/inspection-requests";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Inspection Requests | Bluegate Admin",
};

export default async function InspectionRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  await requireLivePublisherAdmin();

  const { query } = await searchParams;
  const search = query?.trim() || "";

  if (!process.env.DATABASE_URL) {
    return <DatabaseError title="Database configuration required" />;
  }

  let requests: InspectionRequestRecord[] = [];
  let errorMessage: string | null = null;

  try {
    requests = await getInspectionRequests(search);
  } catch (error) {
    console.error("Admin inspection requests list error:", error);
    errorMessage =
      "Inspection requests cannot be loaded. Check the database connection and confirm the InspectionRequest migration has been applied.";
  }

  if (errorMessage) {
    return <DatabaseError title="Unable to load inspection requests" message={errorMessage} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <ClipboardCheck className="h-5 w-5 text-blue-600" />
          <span>Request Management</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Inspection Requests</h1>
        <p className="mt-2 text-slate-600">
          Review inspection-copy requests submitted for Bluegate books.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-medium text-slate-700">
            Search requests
            <div className="relative mt-2">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                name="query"
                defaultValue={query ?? ""}
                placeholder="Teacher, school, email, phone, or book title"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-600"
              />
            </div>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Search
          </button>
          {search ? (
            <Link
              href="/admin/inspection-requests"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Link>
          ) : null}
        </form>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm sm:p-16">
          <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-5 text-xl font-semibold text-slate-900">
            {search ? "No matching requests" : "No inspection requests"}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-500">
            {search
              ? `No requests match “${search}”. Try a different teacher, school, email, phone, or book title.`
              : "Inspection-copy requests stored in the database will appear here."}
          </p>
          {search ? (
            <Link
              href="/admin/inspection-requests"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              View all requests
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px]">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Teacher",
                    "School",
                    "Contact",
                    "Book",
                    "Message",
                    "Status",
                    "Requested",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading} className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-900">{request.teacherName}</p>
                      <p className="mt-1 text-sm text-slate-500">{request.designation}</p>
                    </td>
                    <td className="px-6 py-5 text-slate-700">{request.schoolName}</td>
                    <td className="px-6 py-5 text-sm text-slate-700">
                      <a href={`mailto:${request.email}`} className="block hover:text-blue-700">{request.email}</a>
                      <a href={`tel:${request.mobile}`} className="mt-1 block hover:text-blue-700">{request.mobile}</a>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-medium text-slate-900">{request.bookTitle}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {request.bookClass} · {request.bookSubject}
                      </p>
                    </td>
                    <td className="max-w-xs px-6 py-5 text-sm text-slate-600">
                      {request.message
                        ? `${request.message.slice(0, 90)}${request.message.length > 90 ? "…" : ""}`
                        : "—"}
                    </td>
                    <td className="px-6 py-5"><InspectionStatusBadge status={request.status} /></td>
                    <td className="px-6 py-5 text-sm text-slate-600">
                      {request.createdAt.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-5">
                      <Link
                        href={`/admin/inspection-requests/${request.id}`}
                        className="font-semibold text-blue-700 hover:text-blue-900"
                      >
                        View details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DatabaseError({ title, message }: { title: string; message?: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-4 text-slate-700">
        {message ?? "Set DATABASE_URL and try again."}
      </p>
    </div>
  );
}
