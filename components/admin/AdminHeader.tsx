"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  Database,
  Grid3X3,
  Home,
  LogOut,
  Menu,
  QrCode,
  Settings,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface AdminHeaderProps {
  userLabel: string;
  onOpenMenu: () => void;
}

export default function AdminHeader({
  userLabel,
  onOpenMenu,
}: AdminHeaderProps) {
  const [isPending, startTransition] =
    useTransition();
  const [menuOpen, setMenuOpen] =
    useState(false);
  const [launcherOpen, setLauncherOpen] =
    useState(false);

  const menuRef =
    useRef<HTMLDivElement | null>(null);
  const launcherRef =
    useRef<HTMLDivElement | null>(null);

  const initials = useMemo(() => {
    const parts = userLabel
      .split(" ")
      .filter(Boolean);

    return `${parts[0]?.[0] ?? "A"}${
      parts[1]?.[0] ?? ""
    }`.toUpperCase();
  }, [userLabel]);

  useEffect(() => {
    const handlePointerDown = (
      event: MouseEvent,
    ) => {
      const target = event.target as Node;

      if (
        menuOpen &&
        !menuRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }

      if (
        launcherOpen &&
        !launcherRef.current?.contains(
          target,
        )
      ) {
        setLauncherOpen(false);
      }
    };

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setLauncherOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );
    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [launcherOpen, menuOpen]);

  function handleSignOut() {
    startTransition(async () => {
      await signOut({
        callbackUrl: "/admin/login",
      });
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50 lg:hidden"
            aria-label="Open admin navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
              Publisher Workspace
            </p>
            <p className="truncate text-xs font-medium text-slate-500">
              Bluegate Admin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            ref={launcherRef}
            className="relative"
          >
            <button
              type="button"
              onClick={() => {
                setLauncherOpen(
                  (open) => !open,
                );
                setMenuOpen(false);
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              aria-label="Open admin tools"
              aria-haspopup="menu"
              aria-expanded={launcherOpen}
              title="Admin tools"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>

            {launcherOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <p className="px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Admin Tools
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ToolLink
                    href="/admin/books"
                    label="Content Studio"
                    detail="Books & content"
                    icon={BookOpen}
                    onClick={() =>
                      setLauncherOpen(false)
                    }
                  />

                  <ToolLink
                    href="/admin/master"
                    label="Master Data"
                    detail="Class, subject, series"
                    icon={Database}
                    onClick={() =>
                      setLauncherOpen(false)
                    }
                  />

                  <ToolLink
                    href="/admin/reports"
                    label="Reports"
                    detail="Usage & learning"
                    icon={BarChart3}
                    onClick={() =>
                      setLauncherOpen(false)
                    }
                  />

                  <ToolLink
                    href="/admin/qr"
                    label="QR Manager"
                    detail="Print-book QR"
                    icon={QrCode}
                    onClick={() =>
                      setLauncherOpen(false)
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div
            ref={menuRef}
            className="relative shrink-0"
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(
                  (open) => !open,
                );
                setLauncherOpen(false);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 pr-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Open admin account menu"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[10px] font-bold text-blue-700">
                {initials}
              </span>

              <span className="hidden max-w-40 truncate sm:inline">
                {userLabel}
              </span>

              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="truncate text-xs font-bold text-slate-900">
                    {userLabel}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Publisher Administrator
                  </p>
                </div>

                <MenuLink
                  href="/admin"
                  label="Home"
                  icon={Home}
                  onClick={() =>
                    setMenuOpen(false)
                  }
                />

                <MenuLink
                  href="/admin/publisher-settings"
                  label="Organization"
                  icon={Building2}
                  onClick={() =>
                    setMenuOpen(false)
                  }
                />

                <MenuLink
                  href="/admin/publisher-settings"
                  label="Settings"
                  icon={Settings}
                  onClick={() =>
                    setMenuOpen(false)
                  }
                />

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" />
                  {isPending
                    ? "Signing out..."
                    : "Sign out"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function ToolLink({
  href,
  label,
  detail,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  detail: string;
  icon: typeof BookOpen;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-blue-50"
    >
      <Icon className="h-4 w-4 text-blue-700" />
      <p className="mt-2 text-xs font-bold text-slate-900">
        {label}
      </p>
      <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
        {detail}
      </p>
    </Link>
  );
}

function MenuLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
      role="menuitem"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
