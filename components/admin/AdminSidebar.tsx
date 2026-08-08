"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  QrCode,
  School,
  X,
} from "lucide-react";

type NavigationItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  children?: Array<{
    name: string;
    href: string;
    feature?: "RESOURCES" | "REPORTS";
  }>;
  feature?: "REPORTS";
};

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Schools",
    href: "/admin/schools",
    icon: School,
  },
  {
    name: "Content Studio",
    href: "/admin/books",
    icon: LibraryBig,
  },
  {
    name: "QR Manager",
    href: "/admin/qr",
    icon: QrCode,
  },
  {
    name: "Requests",
    href: "/admin/requests",
    icon: ClipboardList,
  },
];

interface AdminSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
  branding: {
    shortName: string;
    portalTitle: string;
    primaryColor: string;
  };
  features: Record<string, boolean>;
}

export default function AdminSidebar({
  mobile = false,
  onClose,
  branding,
  features,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const [collapsed, setCollapsed] =
    useState(false);

  useEffect(() => {
    if (mobile) return;

    const timer = window.setTimeout(() => {
      try {
        setCollapsed(
          localStorage.getItem(
            "bluegate:admin-sidebar-collapsed",
          ) === "1",
        );
      } catch {}
    }, 0);

    return () => window.clearTimeout(timer);
  }, [mobile]);

  const items = navigation
    .filter(
      (item) =>
        !item.feature ||
        features[item.feature],
    )
    .map((item) => ({
      ...item,
      children:
        item.children?.filter(
          (child) =>
            !child.feature ||
            features[child.feature],
        ),
    }));

  const isPathActive = (
    href: string,
  ) =>
    href === "/admin"
      ? pathname === href
      : pathname === href ||
        pathname.startsWith(
          `${href}/`,
        );

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;

      try {
        localStorage.setItem(
          "bluegate:admin-sidebar-collapsed",
          next ? "1" : "0",
        );
      } catch {}

      return next;
    });
  }

  const compact =
    collapsed && !mobile;

  return (
    <aside
      className={
        mobile
          ? "flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-xl"
          : `sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 lg:flex ${
              compact
                ? "w-[72px]"
                : "w-72"
            }`
      }
      aria-label="Admin navigation"
    >
      {/* Branding */}
      <div
        className={`flex h-20 shrink-0 items-center border-b border-slate-200 ${
          compact
            ? "justify-center px-2"
            : "justify-between px-6"
        }`}
      >
        <Link
          href="/admin"
          onClick={onClose}
          className={`flex items-center ${
            compact
              ? "justify-center"
              : "gap-3"
          }`}
          title={
            compact
              ? branding.shortName
              : undefined
          }
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600">
            <GraduationCap className="h-6 w-6 text-white" />
          </span>

          {!compact ? (
            <span>
              <span className="block font-bold text-slate-900">
                {branding.shortName}
              </span>

              <span className="block text-xs font-medium text-slate-500">
                Publisher Admin
              </span>
            </span>
          ) : null}
        </Link>

        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close admin navigation"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {/* Navigation */}
      <nav
        className={`flex-1 overflow-y-auto ${
          compact
            ? "p-2"
            : "p-4"
        }`}
      >
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;

            const childActive =
              item.children?.some(
                (child) =>
                  isPathActive(
                    child.href,
                  ),
              ) ?? false;

            const active =
              isPathActive(
                item.href,
              ) || childActive;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                  title={
                    compact
                      ? item.name
                      : undefined
                  }
                  className={`flex items-center rounded-xl text-sm font-semibold transition ${
                    compact
                      ? "h-11 justify-center px-0"
                      : "gap-3 px-4 py-3"
                  } ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />

                  {!compact ? (
                    <span>
                      {item.name}
                    </span>
                  ) : null}
                </Link>

                {!compact &&
                item.children?.length ? (
                  <ul className="mt-1 space-y-1 pl-12">
                    {item.children.map(
                      (child) => {
                        const subActive =
                          isPathActive(
                            child.href,
                          );

                        return (
                          <li
                            key={
                              child.href
                            }
                          >
                            <Link
                              href={
                                child.href
                              }
                              onClick={
                                onClose
                              }
                              aria-current={
                                subActive
                                  ? "page"
                                  : undefined
                              }
                              className={`block rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                                subActive
                                  ? "text-blue-700"
                                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                              }`}
                            >
                              {
                                child.name
                              }
                            </Link>
                          </li>
                        );
                      },
                    )}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse control */}
      {!mobile ? (
        <div
          className={`border-t border-slate-200 p-3 ${
            compact
              ? "flex justify-center"
              : ""
          }`}
        >
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`flex h-9 items-center rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-blue-700 ${
              compact
                ? "w-9 justify-center"
                : "w-full justify-start gap-2 px-3"
            }`}
            aria-label={
              compact
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
            title={
              compact
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >
            {compact ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                Collapse
              </>
            )}
          </button>
        </div>
      ) : null}

      {!compact ? (
        <div className="px-6 pb-4 text-xs text-slate-400">
          {branding.portalTitle}
        </div>
      ) : null}
    </aside>
  );
}