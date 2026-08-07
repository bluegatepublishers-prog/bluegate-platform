import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Mail,
  MapPin,
  Phone,
  School,
  User,
} from "lucide-react";
import { notFound } from "next/navigation";

import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { getInspectionRequestById } from "@/lib/inspection-requests";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title:
    "Inspection Request Details | Bluegate Admin",
};

export default async function InspectionRequestDetailsPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  await requireLivePublisherAdmin();

  const { id } = await params;

  if (!process.env.DATABASE_URL) {
    return (
      <ErrorCard
        title="Database configuration required"
        message="DATABASE_URL is not configured."
      />
    );
  }

  let request = null;

  try {
    request =
      await getInspectionRequestById(
        id,
      );
  } catch (error) {
    console.error(
      "Admin inspection request detail error:",
      error,
    );

    return (
      <ErrorCard
        title="Unable to load inspection request"
        message="The request could not be loaded. Check the database connection and migration state."
      />
    );
  }

  if (!request) {
    notFound();
  }

  return (
    <main className="min-w-0 space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-4">
        <Link
          href="/admin/inspection-requests"
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Inspection Requests
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">
              Inspection Request
            </p>

            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              {request.schoolName}
            </h1>

            <p className="mt-0.5 text-[10px] text-slate-500">
              Submitted{" "}
              {request.createdAt.toLocaleString(
                "en-IN",
              )}
            </p>
          </div>

          <StatusBadge
            status={String(
              request.status,
            )}
          />
        </div>
      </header>

      <section className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="Teacher & School"
          icon={School}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail
              label="Teacher"
              value={request.teacherName}
              icon={User}
            />

            <Detail
              label="Designation"
              value={request.designation}
            />

            <Detail
              label="School"
              value={request.schoolName}
              icon={School}
            />

            <Detail
              label="Email"
              value={request.email}
              icon={Mail}
              href={`mailto:${request.email}`}
            />

            <Detail
              label="Phone"
              value={request.mobile}
              icon={Phone}
              href={`tel:${request.mobile}`}
            />

            <Detail
              label="Location"
              value={`${request.city}, ${request.state}`}
              icon={MapPin}
            />

            <div className="sm:col-span-2">
              <Detail
                label="Address"
                value={request.address}
              />
            </div>
          </div>
        </Panel>

        <Panel
          title="Requested Book"
          icon={BookOpen}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail
              label="Title"
              value={request.bookTitle}
            />

            <Detail
              label="Class"
              value={request.bookClass}
            />

            <Detail
              label="Subject"
              value={request.bookSubject}
            />

            <Detail
              label="Series"
              value={
                request.bookSeries ??
                "Not specified"
              }
            />
          </div>
        </Panel>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <TextPanel
          title="Message"
          value={request.message}
          empty="No message was provided."
        />

        <TextPanel
          title="Internal Notes"
          value={request.notes}
          empty="No internal notes are stored for this request."
        />
      </section>
    </main>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof School;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-blue-700" />
        <h2 className="text-xs font-bold text-slate-900">
          {title}
        </h2>
      </div>

      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}

function Detail({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  icon?: typeof User;
  href?: string;
}) {
  const text = (
    <span className="break-words text-[11px] font-semibold text-slate-700">
      {value}
    </span>
  );

  return (
    <div className="min-w-0">
      <p className="mb-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
        {Icon ? (
          <Icon className="h-3 w-3" />
        ) : null}
        {label}
      </p>

      {href ? (
        <a
          href={href}
          className="text-blue-700 hover:underline"
        >
          {text}
        </a>
      ) : (
        text
      )}
    </div>
  );
}

function TextPanel({
  title,
  value,
  empty,
}: {
  title: string;
  value: string | null;
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-xs font-bold text-slate-900">
        {title}
      </h2>
      <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-slate-600">
        {value || empty}
      </p>
    </section>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status.toUpperCase();

  const tone =
    normalized === "NEW"
      ? "bg-blue-50 text-blue-700"
      : normalized === "APPROVED" ||
          normalized === "COMPLETED"
        ? "bg-emerald-50 text-emerald-700"
        : normalized === "REJECTED" ||
            normalized === "CANCELLED"
          ? "bg-rose-50 text-rose-700"
          : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${tone}`}
    >
      {status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) =>
          c.toUpperCase(),
        )}
    </span>
  );
}

function ErrorCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <h1 className="text-sm font-bold text-rose-800">
        {title}
      </h1>
      <p className="mt-1 text-[10px] text-rose-700">
        {message}
      </p>
    </section>
  );
}
