import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Bookmark, Download, Shield, User } from "lucide-react";
import { requireTeacher } from "@/lib/teacher-dashboard";

export const metadata: Metadata = {
  title: "Settings | Bluegate Teacher Dashboard",
  description:
    "Review account information and available teacher workspace options.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  await requireTeacher();
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header><h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Account and workspace</h1><p className="mt-2 text-slate-600">Review your account details and find the teacher tools available to you.</p></header>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><Shield className="h-6 w-6 shrink-0 text-blue-700" aria-hidden="true" /><div><h2 className="font-bold text-slate-900">Account security</h2><p className="mt-1 text-sm text-slate-600">To update your password or account details, use the password reset link from the sign-in page or contact your school administrator.</p></div></div></section>
      <section className="grid gap-4 sm:grid-cols-2"><SettingLink href="/teacher-dashboard/profile" icon={User} title="My profile" text="Review your teacher and school information." /><SettingLink href="/teacher-dashboard/notifications" icon={Bell} title="Notifications" text="Check school and publisher updates." /><SettingLink href="/teacher-dashboard/downloads" icon={Download} title="Downloads" text="Review resources you have opened." /><SettingLink href="/teacher-dashboard/bookmarks" icon={Bookmark} title="Bookmarks" text="Return to saved teaching resources." /></section>
    </main>
  );
}
function SettingLink({ href, icon: Icon, title, text }: { href: string; icon: typeof User; title: string; text: string }) { return <Link href={href} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><Icon className="h-5 w-5 text-blue-700" aria-hidden="true" /><h2 className="mt-4 font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-600">{text}</p></Link>; }