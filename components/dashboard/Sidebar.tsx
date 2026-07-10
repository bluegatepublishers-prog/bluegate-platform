"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Download,
  Bookmark,
  Video,
  Bell,
  User,
  Settings,
  GraduationCap,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import LogoutButton from "./LogoutButton";

const navigation = [
  {
    name: "AI Studio",
    href: "/teacher-dashboard/ai",
    icon: Sparkles,
  },
  {
    name: "Dashboard",
    href: "/teacher-dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Resources",
    href: "/teacher-dashboard/resources",
    icon: BookOpen,
  },
  {
    name: "Downloads",
    href: "/teacher-dashboard/downloads",
    icon: Download,
  },
  {
    name: "Bookmarks",
    href: "/teacher-dashboard/bookmarks",
    icon: Bookmark,
  },
  {
    name: "Training",
    href: "/teacher-dashboard/training",
    icon: Video,
  },
  {
    name: "Notifications",
    href: "/teacher-dashboard/notifications",
    icon: Bell,
  },
  {
    name: "Profile",
    href: "/teacher-dashboard/profile",
    icon: User,
  },
  {
    name: "Settings",
    href: "/teacher-dashboard/settings",
    icon: Settings,
  },
];

export default function Sidebar({ teacherName, schoolName }: { teacherName: string; schoolName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      {/* Logo */}
      <div className="border-b border-slate-200 px-8 py-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Bluegate
            </h2>

            <p className="text-sm text-slate-500">
              Teacher Dashboard
            </p>
          </div>
        </Link>
      </div>

      {/* Teacher Card */}
      <div className="border-b border-slate-200 p-6">
        <div className="rounded-2xl bg-blue-50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
              TS
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                {teacherName}
              </h3>

              <p className="text-sm text-slate-600">
                {schoolName}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Membership
            </p>

            <p className="mt-1 font-semibold text-blue-700">
              Verified Teacher
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/teacher-dashboard" ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`group flex items-center justify-between rounded-2xl px-5 py-4 transition-all duration-200 ${
                    active
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Icon className="h-5 w-5" />

                    <span className="font-medium">
                      {item.name}
                    </span>
                  </div>

                  <ChevronRight
                    className={`h-4 w-4 transition ${
                      active
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-6">
        <LogoutButton className="w-full" />

        <p className="mt-6 text-center text-xs text-slate-400">
          Bluegate Publishers
          <br />
          Teacher Portal v1.0
        </p>
      </div>
    </aside>
  );
}
