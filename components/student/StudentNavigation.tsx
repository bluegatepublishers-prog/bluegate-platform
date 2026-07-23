"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardCheck,
  CircleUserRound,
  Gauge,
  ChartNoAxesCombined,
  ScanSearch,
  LibraryBig,

  Star,
  Target,
  History,
} from "lucide-react";

export type StudentFeatureFlags = {
  assessmentsEnabled: boolean;
  practiceEnabled: boolean;
  aiEnabled: boolean;
  gapsEnabled: boolean;
  reportsEnabled: boolean;
  remedialsEnabled: boolean;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof Gauge;
};

const baseItems: ReadonlyArray<NavigationItem> = [
  { label: "Overview", href: "/student-dashboard", icon: Gauge },
  { label: "My Books", href: "/student-dashboard/books", icon: BookOpen },
  { label: "My Subjects", href: "/student-dashboard/subjects", icon: LibraryBig },
  { label: "Assessments", href: "/student-dashboard/assessments", icon: ClipboardCheck },
  { label: "My Attempts", href: "/student-dashboard/assessment-attempts", icon: History },
  { label: "Practice", href: "/student-dashboard/practice", icon: Target },
  { label: "Learning Gaps", href: "/student-dashboard/gaps", icon: ScanSearch },
  { label: "Remedial Learning", href: "/student-dashboard/remedials", icon: Star },
  { label: "Progress Reports", href: "/student-dashboard/reports", icon: ChartNoAxesCombined },
  { label: "Profile", href: "/student-dashboard/profile", icon: CircleUserRound },
];

function renderLink(label: string, href: string, Icon: typeof Gauge, active: boolean, branding: { primaryColor: string }) {
  const content = (
    <>
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </>
  );
  const className = `flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${active ? "text-white" : "text-slate-700 hover:bg-slate-100"}`;
  return (
    <Link key={label} href={href} className={className} style={active ? { backgroundColor: branding.primaryColor } : undefined} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}

export default function StudentNavigation({
  mobile = false,
  branding,
  schoolName,
  featureFlags = {
    assessmentsEnabled: true,
    practiceEnabled: true,
    aiEnabled: false,
    gapsEnabled: true,
    reportsEnabled: true,
    remedialsEnabled: true,
  },
}: {
  mobile?: boolean;
  branding: { shortName: string; portalTitle: string; logoUrl: string | null; primaryColor: string };
  schoolName: string;
  featureFlags?: StudentFeatureFlags;
}) {
  const pathname = usePathname();
  const enabledItems = baseItems.filter((item) => {
    if (item.href === "/student-dashboard/assessments" && !featureFlags.assessmentsEnabled) return false;
    if (item.href === "/student-dashboard/practice" && !featureFlags.practiceEnabled) return false;
    if (item.href === "/student-dashboard/gaps" && !featureFlags.gapsEnabled) return false;
    if (item.href === "/student-dashboard/remedials" && !featureFlags.remedialsEnabled) return false;
    if (item.href === "/student-dashboard/reports" && !featureFlags.reportsEnabled) return false;
    return true;
  });
  const availableLinks = enabledItems.map(({ label, href, icon: Icon }) => renderLink(label, href, Icon, isActive(pathname, href), branding));

  if (mobile) {
    return (
      <nav aria-label="Student navigation" className="flex gap-2 overflow-x-auto border-b bg-white p-3 lg:hidden">
        <div className="flex gap-2">{availableLinks}</div>
      </nav>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r bg-white lg:flex">
      <div className="border-b p-7">
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            <Image src={branding.logoUrl} alt={`${branding.shortName} logo`} width={48} height={48} className="h-12 w-12 object-contain" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-xl font-bold text-white" style={{ backgroundColor: branding.primaryColor }}>
              {branding.shortName.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-bold">{branding.portalTitle}</p>
            <p className="text-xs text-slate-500">Student Portal</p>
          </div>
        </div>
        <p className="mt-5 truncate text-sm font-semibold">{schoolName}</p>
      </div>
      <nav aria-label="Student navigation" className="flex-1 space-y-2 overflow-y-auto p-5">
        {availableLinks}
      </nav>
    </aside>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/student-dashboard") return pathname === href;
  return Boolean(pathname && pathname.startsWith(href));
}