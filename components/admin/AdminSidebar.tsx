"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardCheck,
  Database,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Mail,
  School,
  Users,
  X,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Books", href: "/admin/books", icon: BookOpen },
  { name: "Resources", href: "/admin/resources", icon: FolderOpen },
  { name: "Teachers", href: "/admin/teachers", icon: Users },
  { name: "Schools", href: "/admin/schools", icon: School },
  { name: "Master Data", href: "/admin/master", icon: Database },
  {
    name: "Inspection Requests",
    href: "/admin/inspection-requests",
    icon: ClipboardCheck,
  },
  { name: "Contact Messages", href: "/admin/contact-messages", icon: Mail },
];

interface AdminSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({
  mobile = false,
  onClose,
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
            <span className="block font-bold text-slate-900">Bluegate</span>
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
          {navigation.map((item) => {
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
        Bluegate Publishers CMS
      </div>
    </aside>
  );
}
