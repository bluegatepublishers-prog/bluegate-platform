"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { usePathname } from "next/navigation";

const menu = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Books", href: "/books" },
  { name: "School Solutions", href: "/school-solutions" },
  { name: "Teacher Hub", href: "/teacher-hub" },
  { name: "Contact", href: "/contact" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-md backdrop-blur">
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

        <nav className="hidden items-center gap-3 lg:flex">

          {menu.map((item) => {

            const active = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`rounded-2xl px-6 py-3 text-[17px] font-semibold transition-all duration-300 ${
                  active
                    ? "bg-gradient-to-r from-[#0B5ED7] to-sky-500 text-white shadow-xl"
                    : "text-slate-700 hover:-translate-y-1 hover:bg-white hover:text-[#0B5ED7] hover:shadow-lg"
                }`}
              >
                {item.name}
              </Link>
            );

          })}

        </nav>

        {/* Search */}

        <div className="flex items-center">

          <button
            aria-label="Search"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-blue-50 hover:shadow-xl"
          >
            <Search
              size={22}
              className="text-slate-700"
            />
          </button>

        </div>

      </div>
    </header>
  );
}