"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import StudentHeader from "@/components/student/StudentHeader";
import StudentNavigation from "@/components/student/StudentNavigation";

export default function StudentDashboardShell({ children, name, classSection }: { children: ReactNode; name: string; classSection: string }) {
  const pathname = usePathname();
  if (/\/student-dashboard\/subjects\/[^/]+/.test(pathname)) return children;
  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentNavigation />
      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        <StudentHeader name={name} classSection={classSection} />
        {children}
        <StudentNavigation mobile />
      </div>
    </div>
  );
}
