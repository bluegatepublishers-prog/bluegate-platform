"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Menu,
  ScanSearch,
  School,
  User,
  UserRoundCheck,
  Users,
} from "lucide-react";

const items = [
  { label: "Dashboard", href: "/school-dashboard", icon: LayoutDashboard },
  { label: "Reports", href: "/school-dashboard/reports", icon: BarChart3, feature: "REPORTS" },
  { label: "Learning Gaps", href: "/school-dashboard/gaps", icon: ScanSearch, feature: "GAP_ANALYSIS" },
  { label: "Remedial Progress", href: "/school-dashboard/remedials", icon: BarChart3, feature: "REMEDIALS" },
  { label: "Academic Sessions", href: "/school-dashboard/academic-years", icon: CalendarDays },
  { label: "Classes & Sections", href: "/school-dashboard/classes", icon: School },
  { label: "Teachers", href: "/school-dashboard/teachers", icon: Users },
  { label: "Students", href: "/school-dashboard/students", icon: GraduationCap },
  { label: "Subject Teachers", href: "/school-dashboard/teacher-assignments", icon: UserRoundCheck },
  { label: "Books", href: "/school-dashboard/books", icon: BookOpen, feature: "BOOK_APPROVALS" },
  { label: "Resources", href: "/school-dashboard/resources", icon: BookOpen, feature: "RESOURCES" },
  { label: "Teacher Requests", href: "/school-dashboard/teacher-requests", icon: UserRoundCheck },
  { label: "Staff", href: "/school-dashboard/staff", icon: Users },
  { label: "Inspection Requests", href: "/school-dashboard/inspection-requests", icon: ClipboardCheck },
  { label: "Profile", href: "/school-dashboard/profile", icon: User },
];

type Props = {
  mobile?: boolean;
  schoolName: string;
  logoUrl?: string | null;
  branding: { shortName: string };
  features: Record<string, boolean>;
};

export default function SchoolNavigation({
  mobile = false,
  schoolName,
  logoUrl,
  branding,
  features,
}: Props) {
  const pathname = usePathname();
  const visibleItems = items.filter((item) => !item.feature || features[item.feature]);
  const links = visibleItems.map(({ label, href, icon: Icon }) => {
    const active = href === "/school-dashboard" ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        className={`flex min-h-12 min-w-0 items-center gap-3 rounded-xl px-4 py-3 font-semibold ${
          active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="break-words">{label}</span>
      </Link>
    );
  });

  if (mobile) {
    return (
      <details className="border-b bg-white lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 font-bold text-slate-800">
          <Menu className="h-5 w-5" />
          School menu
        </summary>
        <nav className="grid max-h-[70vh] gap-2 overflow-y-auto p-3 sm:grid-cols-2">
          {links}
        </nav>
      </details>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r bg-white lg:flex">
      <div className="border-b p-7">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <Image src={logoUrl} alt="School logo" width={48} height={48} />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
              {schoolName.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-bold">{branding.shortName}</p>
            <p className="text-xs text-slate-500">School / Institution Portal</p>
          </div>
        </div>
        <p className="mt-5 truncate text-sm font-semibold">{schoolName}</p>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto p-5">{links}</nav>
    </aside>
  );
}
