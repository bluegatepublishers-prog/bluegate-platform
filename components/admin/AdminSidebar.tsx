"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesCombined,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  School,
  X,
} from "lucide-react";

type NavigationItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  children?: Array<{ name: string; href: string; feature?: "RESOURCES" | "REPORTS" }>;
  feature?: "REPORTS";
};

const navigation: NavigationItem[] = [
  { name: "Home", href: "/admin", icon: LayoutDashboard },
  {
    name: "Schools",
    href: "/admin/schools",
    icon: School,
    children: [
      { name: "School Directory", href: "/admin/schools" },
      { name: "Approvals", href: "/admin/school-requests" },
    ],
  },
  {
    name: "Library",
    href: "/admin/library",
    icon: LibraryBig,
    children: [
      { name: "Books", href: "/admin/books" },
      { name: "Resources", href: "/admin/resources", feature: "RESOURCES" },
      { name: "QR Center", href: "/admin/qr" },
      { name: "Master Data", href: "/admin/master" },
    ],
  },
  {
    name: "Requests",
    href: "/admin/requests",
    icon: ClipboardList,
    children: [
      { name: "School Requests", href: "/admin/school-requests" },
      { name: "Inspection", href: "/admin/inspection-requests" },
      { name: "Contact", href: "/admin/contact-messages" },
    ],
  },
  {
    name: "Reports",
    href: "/admin/reports",
    icon: ChartNoAxesCombined,
    feature: "REPORTS",
    children: [{ name: "Publisher Reports", href: "/admin/reports", feature: "REPORTS" }],
  },
];

interface AdminSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
  branding: { shortName: string; portalTitle: string; primaryColor: string };
  features: Record<string, boolean>;
}

export default function AdminSidebar({ mobile = false, onClose, branding, features }: AdminSidebarProps) {
  const pathname = usePathname();
  const items = navigation
    .filter((item) => !item.feature || features[item.feature])
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => !child.feature || features[child.feature]),
    }));

  const isPathActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return <aside className={mobile ? "flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-xl" : "sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex"} aria-label="Admin navigation">
    <div className="flex h-20 items-center justify-between border-b border-slate-200 px-6">
      <Link href="/admin" onClick={onClose} className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600"><GraduationCap className="h-6 w-6 text-white"/></span>
        <span><span className="block font-bold text-slate-900">{branding.shortName}</span><span className="block text-xs font-medium text-slate-500">Publisher Admin</span></span>
      </Link>
      {mobile ? <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Close admin navigation"><X className="h-5 w-5"/></button> : null}
    </div>
    <nav className="flex-1 overflow-y-auto p-4">
      <ul className="space-y-3">{items.map((item) => {
        const Icon = item.icon;
        const childActive = item.children?.some((child) => isPathActive(child.href)) ?? false;
        const active = isPathActive(item.href) || childActive;

        return <li key={item.href}>
          <Link href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}><Icon className="h-5 w-5 shrink-0"/>{item.name}</Link>
          {item.children?.length ? <ul className="mt-1 space-y-1 pl-12">{item.children.map((child) => {
            const subActive = isPathActive(child.href);
            return <li key={child.href}><Link href={child.href} onClick={onClose} aria-current={subActive ? "page" : undefined} className={`block rounded-lg px-2 py-1.5 text-xs font-semibold transition ${subActive ? "text-blue-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}>{child.name}</Link></li>;
          })}</ul> : null}
        </li>;
      })}</ul>
    </nav>
    <div className="border-t border-slate-200 px-6 py-5 text-xs text-slate-400">{branding.portalTitle}</div>
  </aside>;
}
