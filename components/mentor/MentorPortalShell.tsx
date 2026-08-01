"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BookOpenCheck,
  CalendarClock,
  FileSpreadsheet,
  FolderOpen,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  NotebookPen,
  Settings,
  User,
  Users,
  X,
} from "lucide-react";

type MentorPortalShellProps = {
  children: React.ReactNode;
  mentorName: string;
  mentorSubtitle: string;
};

const sidebarItems = [
  { href: "/mentor-dashboard", label: "Home", icon: Home },
  { href: "/mentor-dashboard/students", label: "My Students", icon: Users },
  { href: "/mentor-dashboard/reports", label: "Reports", icon: FileSpreadsheet },
  { href: "/mentor-dashboard/sessions", label: "Sessions", icon: CalendarClock },
  { href: "/mentor-dashboard/notes", label: "Notes", icon: NotebookPen },
  { href: "/mentor-dashboard/resources", label: "Resources", icon: FolderOpen },
] as const;

const avatarItems = [
  { href: "/mentor-dashboard/profile", label: "My Profile", icon: User },
  { href: "/mentor-dashboard/settings", label: "Settings", icon: Settings },
  { href: "/mentor-dashboard/help", label: "Help & Support", icon: HelpCircle },
] as const;

function navState(pathname: string, href: string) {
  return href === "/mentor-dashboard" ? pathname === href : pathname.startsWith(href);
}

export function MentorPortalShell({ children, mentorName, mentorSubtitle }: MentorPortalShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeTitle = useMemo(() => {
    const active = sidebarItems.find((item) => navState(pathname, item.href));
    return active?.label ?? "Mentor Portal";
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 lg:flex">
      <aside className="hidden h-screen w-72 shrink-0 border-r border-indigo-900/60 bg-gradient-to-b from-[#17124b] to-[#0f0b34] text-indigo-100 lg:sticky lg:top-0 lg:flex lg:flex-col">
        <div className="border-b border-indigo-300/15 px-6 py-7">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-500/25 ring-1 ring-indigo-200/40">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">Bluegate</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200/80">Mentor Portal</p>
            </div>
          </div>
        </div>

        <nav aria-label="Mentor navigation" className="flex-1 space-y-2 p-4">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = navState(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-indigo-500 text-white shadow-[0_10px_30px_rgba(79,70,229,0.35)]" : "text-indigo-100/85 hover:bg-indigo-400/20 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <div className="rounded-2xl border border-indigo-300/20 bg-indigo-500/15 p-4">
            <p className="text-sm font-semibold">Need support?</p>
            <Link href="/mentor-dashboard/help" className="mt-1 inline-block text-sm text-indigo-100/85 hover:text-white">
              Contact School Office
            </Link>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open mentor navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-slate-950">{activeTitle}</p>
                <p className="truncate text-sm text-slate-500">{mentorSubtitle}</p>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm hover:border-indigo-300"
                aria-label="Open mentor account menu"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                  {mentorName.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-sm font-semibold text-slate-900">{mentorName}</span>
                  <span className="block truncate text-xs text-slate-500">Mentor</span>
                </span>
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-14 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {avatarItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/mentor-login" })}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {drawerOpen ? (
          <div className="fixed inset-0 z-30 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/45"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close mentor navigation"
            />
            <aside className="absolute left-0 top-0 h-full w-72 border-r border-indigo-900/60 bg-gradient-to-b from-[#17124b] to-[#0f0b34] text-indigo-100">
              <div className="flex items-center justify-between border-b border-indigo-300/15 px-5 py-5">
                <p className="font-bold">Mentor Menu</p>
                <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close mentor menu" className="grid h-9 w-9 place-items-center rounded-lg border border-indigo-300/20">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav aria-label="Mentor mobile navigation" className="space-y-2 p-4">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const active = navState(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-indigo-500 text-white" : "text-indigo-100/85 hover:bg-indigo-400/20 hover:text-white"}`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        ) : null}

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
