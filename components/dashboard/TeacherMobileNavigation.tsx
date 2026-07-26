"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { teacherNavigation } from "./Sidebar";

function visible(href: string, features: Record<string, boolean>) {
  if (href === "/teacher-dashboard/ai") return features.AI_STUDIO;
  if (href === "/teacher-dashboard/reports") return features.REPORTS;
  if (href === "/teacher-dashboard/gaps") return features.GAP_ANALYSIS;
  if (href === "/teacher-dashboard/remedials") return features.REMEDIALS;
  if (["/teacher-dashboard/resources", "/teacher-dashboard/downloads", "/teacher-dashboard/bookmarks"].includes(href)) return features.RESOURCES;
  if (href === "/teacher-dashboard/notifications") return features.NOTIFICATIONS;
  return true;
}

export default function TeacherMobileNavigation({ features }: { features: Record<string, boolean> }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <div className="border-b bg-white px-4 py-3 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="teacher-mobile-menu"
        className="flex min-h-12 w-full items-center justify-between rounded-xl border px-4 font-semibold text-slate-800"
      >
        <span className="inline-flex items-center gap-3"><Menu className="h-5 w-5" />Menu</span>
        {open ? <X className="h-5 w-5" /> : null}
      </button>
      {open ? (
        <nav id="teacher-mobile-menu" aria-label="Teacher navigation" className="mt-3 grid gap-2 sm:grid-cols-2">
          {teacherNavigation.filter((item) => visible(item.href, features)).map((item) => {
            const Icon = item.icon;
            const active = item.href === "/teacher-dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 font-semibold ${active ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"}`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
