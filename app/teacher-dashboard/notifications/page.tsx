import { Bell } from "lucide-react";
import { requireTeacher } from "@/lib/teacher-dashboard";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function NotificationsPage() { await requireTeacher(); return <div className="p-4 sm:p-6 lg:p-8"><div className="rounded-3xl border bg-white p-14 text-center shadow-sm"><Bell className="mx-auto h-12 w-12 text-slate-300" /><h1 className="mt-5 text-3xl font-bold">No notifications</h1><p className="mt-3 text-slate-500">You are all caught up. New notifications will appear here when available.</p></div></div>; }
