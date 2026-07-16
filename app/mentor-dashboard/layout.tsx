import type { ReactNode } from "react";
import { MentorNavigation } from "@/components/mentor/MentorNavigation";
import { requireMentor } from "@/lib/mentor-dashboard";

export const dynamic = "force-dynamic";

export default async function MentorDashboardLayout({ children }: { children: ReactNode }) {
  const mentor = await requireMentor();
  return <div className="flex min-h-screen bg-slate-100"><MentorNavigation/><div className="min-w-0 flex-1"><header className="flex items-center justify-between border-b bg-white px-4 py-4 sm:px-6 lg:px-8"><div><p className="font-bold">{mentor.user.name}</p><p className="text-sm text-slate-500">{mentor.publisher.name} · {mentor.type.replaceAll("_", " ")}</p></div></header><MentorNavigation mobile/>{children}</div></div>;
}
