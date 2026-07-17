import Link from "next/link";
import { ArrowLeft, BookOpen, Mail, MapPin, Phone, School, User } from "lucide-react";
import { notFound } from "next/navigation";

import InspectionStatusBadge from "@/components/admin/InspectionStatusBadge";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { getInspectionRequestById } from "@/lib/inspection-requests";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Inspection Request Details | Bluegate Admin",
};

export default async function InspectionRequestDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireLivePublisherAdmin();
  const { id } = await params;

  if (!process.env.DATABASE_URL) {
    return <ErrorCard title="Database configuration required" message="Set DATABASE_URL and try again." />;
  }

  let request = null;

  try {
    request = await getInspectionRequestById(id);
  } catch (error) {
    console.error("Admin inspection request detail error:", error);
    return (
      <ErrorCard
        title="Unable to load inspection request"
        message="Check the database connection and confirm the InspectionRequest migration has been applied."
      />
    );
  }

  if (!request) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/admin/inspection-requests" className="inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-900">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to inspection requests
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Inspection Request</h1>
          <p className="mt-2 text-slate-600">Submitted {request.createdAt.toLocaleString("en-IN")}</p>
        </div>
        <InspectionStatusBadge status={request.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Teacher and school" icon={School}>
          <Detail label="Teacher" value={request.teacherName} icon={User} />
          <Detail label="Designation" value={request.designation} />
          <Detail label="School" value={request.schoolName} icon={School} />
          <Detail label="Email" value={request.email} icon={Mail} href={`mailto:${request.email}`} />
          <Detail label="Phone" value={request.mobile} icon={Phone} href={`tel:${request.mobile}`} />
          <Detail label="Location" value={`${request.city}, ${request.state}`} icon={MapPin} />
          <Detail label="Address" value={request.address} />
        </Section>

        <Section title="Requested book" icon={BookOpen}>
          <Detail label="Title" value={request.bookTitle} />
          <Detail label="Class" value={request.bookClass} />
          <Detail label="Subject" value={request.bookSubject} />
          <Detail label="Series" value={request.bookSeries ?? "—"} />
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TextSection title="Message" value={request.message} empty="No message was provided." />
        <TextSection title="Internal notes" value={request.notes} empty="No internal notes are stored for this request." />
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof School; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      </div>
      <dl className="mt-6 grid gap-6 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Detail({ label, value, icon: Icon, href }: { label: string; value: string; icon?: typeof User; href?: string }) {
  const content = <span className="break-words font-semibold text-slate-900">{value}</span>;
  return (
    <div>
      <dt className="flex items-center gap-2 text-sm text-slate-500">{Icon ? <Icon className="h-4 w-4" /> : null}{label}</dt>
      <dd className="mt-2">{href ? <a href={href} className="hover:text-blue-700">{content}</a> : content}</dd>
    </div>
  );
}

function TextSection({ title, value, empty }: { title: string; value: string | null; empty: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">{value || empty}</p>
    </section>
  );
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-4 text-slate-700">{message}</p>
    </div>
  );
}
