"use client";

import Link from "next/link";
import { Home } from "lucide-react";

export default function FloatingHomeButton() {
  return (
    <Link
      href="/"
      className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0B5ED7] text-white shadow-xl transition hover:scale-110 hover:bg-[#083A75]"
      title="Go to Home"
    >
      <Home size={24} />
    </Link>
  );
}