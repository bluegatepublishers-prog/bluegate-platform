"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  BookOpen,
  ClipboardCheck,
  CircleUserRound,
  FolderOpen,
  Gauge,
  ChartNoAxesCombined,
  ScanSearch,
  LibraryBig,
} from "lucide-react";

const items: ReadonlyArray<{
  label: string;
  href?: string;
  icon: typeof Gauge;
  available?: boolean;
}> = [
  { label: "Dashboard", href: "/student-dashboard", icon: Gauge, available: true },
  { label: "Subjects", href: "/student-dashboard/subjects", icon: LibraryBig, available: true },
  { label: "Books", href: "/student-dashboard/books", icon: BookOpen, available: true },
  { label: "Assessments", href: "/student-dashboard/assessments", icon: ClipboardCheck, available: true },
  { label: "Reports", href: "/student-dashboard/reports", icon: ChartNoAxesCombined, available: true },
  { label: "Learning focus", href: "/student-dashboard/gaps", icon: ScanSearch, available: true },
  { label: "My learning path", href: "/student-dashboard/remedials", icon: ChartNoAxesCombined, available: true },
  { label: "Resources", icon: FolderOpen },
  { label: "Bookmarks", icon: Bookmark },
  { label: "Notifications", icon: Bell },
  { label: "Profile", href: "/student-dashboard/profile", icon: CircleUserRound, available: true },
];

export default function StudentNavigation({
  mobile = false,
  branding,
  schoolName,
}: {
  mobile?: boolean;
  branding: { shortName: string; portalTitle: string; logoUrl: string | null; primaryColor: string };
  schoolName: string;
}) {
  const pathname = usePathname();
  const links = items.map(({ label, href, icon: Icon, available }) => {
    const active = href === "/student-dashboard" ? pathname === href : Boolean(href && pathname.startsWith(href));
    const content = (
      <>
        <Icon className="h-5 w-5" />
        <span>{label}</span>
        {!available && <span className="ml-auto text-[10px] font-bold uppercase tracking-wide opacity-60">Soon</span>}
      </>
    );
    const className = `flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 font-semibold ${
      active ? "text-white" : available ? "text-slate-700 hover:bg-slate-100" : "cursor-not-allowed text-slate-400"
    }`;
    return available && href ? (
      <Link key={label} href={href} className={className} style={active ? { backgroundColor: branding.primaryColor } : undefined}>
        {content}
      </Link>
    ) : (
      <div key={label} aria-disabled="true" className={className} title="Coming in a future student learning phase">
        {content}
      </div>
    );
  });

  if (mobile) return <nav aria-label="Student navigation" className="flex gap-2 overflow-x-auto border-b bg-white p-3 lg:hidden">{links}</nav>;
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
      <nav aria-label="Student navigation" className="flex-1 space-y-2 overflow-y-auto p-5">{links}</nav>
    </aside>
  );
}
