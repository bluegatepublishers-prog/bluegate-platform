import { Mail } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Contact Messages | Bluegate Admin",
};

function statusBadge(status: string) {
  switch (status) {
    case "NEW":
      return <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">New</span>;
    case "READ":
      return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Read</span>;
    case "ARCHIVED":
      return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Archived</span>;
    default:
      return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{status}</span>;
  }
}

export default async function ContactMessagesPage() {
  let msgs: any[] = [];

  if (process.env.DATABASE_URL && (prisma as any).contactMessage) {
    msgs = await (prisma as any).contactMessage.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contact Messages</h1>
          <p className="mt-2 text-slate-600">Messages submitted via the contact form.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left">Name</th>
              <th className="px-6 py-4 text-left">School</th>
              <th className="px-6 py-4 text-left">Email</th>
              <th className="px-6 py-4 text-left">Phone</th>
              <th className="px-6 py-4 text-left">Subject</th>
              <th className="px-6 py-4 text-left">Message</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-left">Created</th>
            </tr>
          </thead>

          <tbody>
            {msgs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Mail className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <h3 className="text-xl font-semibold">No Messages</h3>
                  <p className="mt-2 text-slate-500">Messages submitted through the contact form will appear here.</p>
                </td>
              </tr>
            ) : (
              msgs.map((m) => (
                <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-5 font-semibold">{m.name}</td>
                  <td className="px-6 py-5">{m.schoolName}</td>
                  <td className="px-6 py-5">{m.email}</td>
                  <td className="px-6 py-5">{m.phone}</td>
                  <td className="px-6 py-5">{m.subject}</td>
                  <td className="px-6 py-5">{m.message.slice(0, 120)}{m.message.length > 120 ? '...' : ''}</td>
                  <td className="px-6 py-5">{statusBadge(m.status)}</td>
                  <td className="px-6 py-5">{new Date(m.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
