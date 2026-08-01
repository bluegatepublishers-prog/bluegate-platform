import type { ReactNode } from "react";
import { MentorPortalShell } from "@/components/mentor/MentorPortalShell";
import { MentorAccessError, requireMentor } from "@/lib/mentor-dashboard";

export const dynamic = "force-dynamic";

export default async function MentorDashboardLayout({ children }: { children: ReactNode }) {
  let mentor;
  try {
    mentor = await requireMentor();
  } catch (error) {
    if (error instanceof MentorAccessError) {
      return <main className="grid min-h-screen place-items-center bg-slate-100 p-6"><section className="max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8"><h1 className="text-2xl font-bold text-amber-950">Mentor access unavailable</h1><p className="mt-3 text-amber-900">{error.message}</p></section></main>;
    }
    throw error;
  }

  return <MentorPortalShell mentorName={mentor.user.name} mentorSubtitle={`${mentor.publisher.name} · ${mentor.type.replaceAll("_", " ")}`}>{children}</MentorPortalShell>;
}
