"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BookOpenCheck,
  ClipboardCheck,
  Database,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Bot,
  School,
  Users,
  X,
  Settings,
  ChartNoAxesCombined,
  ScanSearch,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Reports", href: "/admin/reports", icon: ChartNoAxesCombined },
  { name: "Learning Gaps", href: "/admin/gaps", icon: ScanSearch },
  { name: "Remedial Learning", href: "/admin/remedials", icon: ChartNoAxesCombined },
  { name: "Books", href: "/admin/books", icon: BookOpen },
  { name: "Book Approvals", href: "/admin/book-adoptions", icon: BookOpenCheck },
  { name: "Resources", href: "/admin/resources", icon: FolderOpen },
  { name: "Teachers", href: "/admin/teachers", icon: Users },
  { name: "Schools", href: "/admin/schools", icon: School },
  { name: "School Requests", href: "/admin/school-requests", icon: School },
  { name: "Master Data", href: "/admin/master", icon: Database },
  {
    name: "Inspection Requests",
    href: "/admin/inspection-requests",
    icon: ClipboardCheck,
  },
  { name: "Contact Messages", href: "/admin/contact-messages", icon: Mail },
  { name: "AI Diagnostic", href: "/admin/ai", icon: Bot },
  { name: "Publisher Settings", href: "/admin/publisher-settings", icon: Settings },
];

interface AdminSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
  branding:{shortName:string;portalTitle:string;primaryColor:string};features:Record<string,boolean>;
}

export default function AdminSidebar({
  mobile = false,
  onClose,
  branding,features,
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={
        mobile
          ? "flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-xl"
          : "sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex"
      }
      aria-label="Admin navigation"
    >
      <div className="flex h-20 items-center justify-between border-b border-slate-200 px-6">
        <Link href="/admin" onClick={onClose} className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
            <GraduationCap className="h-6 w-6 text-white" />
          </span>
          <span>
            <span className="block font-bold text-slate-900">{branding.shortName}</span>
            <span className="block text-xs font-medium text-slate-500">Admin CMS</span>
          </span>
        </Link>

        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close admin navigation"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navigation.filter(item=>item.href!=="/admin/ai"||features.AI_STUDIO).filter(item=>item.href!=="/admin/reports"||features.REPORTS).filter(item=>item.href!=="/admin/gaps"||features.GAP_ANALYSIS).filter(item=>item.href!=="/admin/remedials"||features.REMEDIALS).filter(item=>item.href!=="/admin/book-adoptions"||features.BOOK_APPROVALS).filter(item=>item.href!=="/admin/resources"||features.RESOURCES).map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-200 px-6 py-5 text-xs text-slate-400">
        {branding.portalTitle}
      </div>
    </aside>
  );
}
