import { Bell } from "lucide-react";
import { requireTeacher } from "@/lib/teacher-dashboard";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function NotificationsPage() { await requireTeacher(); return <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8"><header><h1 className="text-3xl font-bold sm:text-4xl">Notifications</h1><p className="mt-2 text-slate-600">Important updates for your teaching work will appear here.</p></header><section className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm"><Bell className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 text-xl font-bold">You are all caught up.</h2><p className="mt-2 text-slate-600">There are no new notifications at the moment.</p></section></div>; }
