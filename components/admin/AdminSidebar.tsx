"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartNoAxesCombined, ClipboardCheck, Database, FolderOpen, GraduationCap, LayoutDashboard, Mail, QrCode, School, Settings, X } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Schools", href: "/admin/schools", icon: School },
  { name: "Books", href: "/admin/books", icon: BookOpen, section: "CONTENT" },
  { name: "Resources", href: "/admin/resources", icon: FolderOpen },
  { name: "QR Codes", href: "/admin/qr", icon: QrCode },
  { name: "Master Data", href: "/admin/master", icon: Database, section: "MASTER DATA" },
  { name: "Inspection Requests", href: "/admin/inspection-requests", icon: ClipboardCheck, section: "REQUESTS" },
  { name: "Contact Messages", href: "/admin/contact-messages", icon: Mail },
  { name: "Reports", href: "/admin/reports", icon: ChartNoAxesCombined, section: "REPORTS" },
  { name: "Publisher Settings", href: "/admin/publisher-settings", icon: Settings, section: "SETTINGS" },
];

interface AdminSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
  branding: { shortName: string; portalTitle: string; primaryColor: string };
  features: Record<string, boolean>;
}

export default function AdminSidebar({ mobile = false, onClose, branding, features }: AdminSidebarProps) {
  const pathname = usePathname();
  const items = navigation.filter((item) => item.href !== "/admin/reports" || features.REPORTS).filter((item) => item.href !== "/admin/resources" || features.RESOURCES);

  return <aside className={mobile ? "flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-xl" : "sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex"} aria-label="Admin navigation">
    <div className="flex h-20 items-center justify-between border-b border-slate-200 px-6">
      <Link href="/admin" onClick={onClose} className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600"><GraduationCap className="h-6 w-6 text-white"/></span>
        <span><span className="block font-bold text-slate-900">{branding.shortName}</span><span className="block text-xs font-medium text-slate-500">Publisher Admin</span></span>
      </Link>
      {mobile ? <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Close admin navigation"><X className="h-5 w-5"/></button> : null}
    </div>
    <nav className="flex-1 overflow-y-auto p-4">
      <ul className="space-y-1">{items.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/admin" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return <li key={item.href} className={item.section ? "pt-4 first:pt-0" : undefined}>
          {item.section ? <p className="mb-2 px-4 text-[11px] font-bold tracking-[0.18em] text-slate-400">{item.section}</p> : null}
          <Link href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}><Icon className="h-5 w-5 shrink-0"/>{item.name}</Link>
        </li>;
      })}</ul>
    </nav>
    <div className="border-t border-slate-200 px-6 py-5 text-xs text-slate-400">{branding.portalTitle}</div>
  </aside>;
}
