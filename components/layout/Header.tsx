"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const menu = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Books", href: "/books" },
  { name: "School Solutions", href: "/school-solutions" },
  { name: "Teacher Hub", href: "/teacher-hub" },
  { name: "Contact", href: "/contact" },
];

const loginOptions = [
  { name: "Teacher Login", href: "/teacher-login" },
  { name: "School Login", href: "/school-login" },
  { name: "Student Login", href: "/student-login" },
  { name: "Parent Login", href: "/parent-login" },
  { name: "Mentor Login", href: "/mentor-login" },
];

export default function Header() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setLoginOpen(false);
        setMobileOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLoginOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const focusClasses =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-md backdrop-blur">
      <div className="container-custom flex h-24 items-center justify-between">

        {/* Logo */}

        <Link
          href="/"
          className="flex items-center gap-4"
        >
          <Image
            src="/logos/logo.png"
            alt="Bluegate Publishers"
            width={60}
            height={60}
            priority
          />

          <div>
            <h1 className="text-2xl font-bold text-[#083A75]">
              Bluegate Publishers
            </h1>

            <p className="text-sm text-slate-500">
              Creating Books. Building Futures.
            </p>
          </div>
        </Link>

        {/* Navigation */}

        <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">

          {menu.map((item) => {

            const active = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`rounded-2xl px-3 py-3 text-[15px] font-semibold transition-all duration-300 ${focusClasses} ${
                  active
                    ? "bg-gradient-to-r from-[#0B5ED7] to-sky-500 text-white shadow-xl"
                    : "text-slate-700 hover:-translate-y-1 hover:bg-white hover:text-[#0B5ED7] hover:shadow-lg"
                }`}
              >
                {item.name}
              </Link>
            );

          })}

          <div className="relative">
            <button
              type="button"
              aria-expanded={loginOpen}
              aria-controls="public-login-menu"
              onClick={() => setLoginOpen((open) => !open)}
              className={`inline-flex items-center rounded-2xl px-3 py-3 text-[15px] font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 ${focusClasses}`}
            >
              Login
              <ChevronDown className={`ml-1 h-4 w-4 transition ${loginOpen ? "rotate-180" : ""}`} />
            </button>
            {loginOpen ? (
              <div
                id="public-login-menu"
                className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                {loginOptions.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setLoginOpen(false)}
                    className={`block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 ${focusClasses}`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

        </nav>

        {/* Search */}

        <div className="flex items-center">

          <button
            aria-label="Search"
            className={`hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-blue-50 hover:shadow-xl xl:block ${focusClasses}`}
          >
            <Search
              size={22}
              className="text-slate-700"
            />
          </button>

          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            aria-controls="public-mobile-navigation"
            onClick={() => setMobileOpen((open) => !open)}
            className={`rounded-xl border border-slate-200 p-3 text-slate-700 lg:hidden ${focusClasses}`}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

        </div>

      </div>

      {mobileOpen ? (
        <nav
          id="public-mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-slate-200 bg-white px-6 py-5 lg:hidden"
        >
          <div className="grid gap-1">
            {menu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-xl px-4 py-3 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 ${focusClasses}`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="mt-3 border-t border-slate-200 pt-3">
            <button
              type="button"
              aria-expanded={loginOpen}
              aria-controls="public-mobile-login-menu"
              onClick={() => setLoginOpen((open) => !open)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 ${focusClasses}`}
            >
              Role logins
              <ChevronDown className={`h-4 w-4 transition ${loginOpen ? "rotate-180" : ""}`} />
            </button>
            {loginOpen ? (
              <div id="public-mobile-login-menu" className="mt-1 grid gap-1 pl-3">
                {loginOptions.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      setLoginOpen(false);
                      setMobileOpen(false);
                    }}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 ${focusClasses}`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
