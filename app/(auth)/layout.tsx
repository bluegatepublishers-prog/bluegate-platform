import type { ReactNode } from "react";
import { LoginHero } from "@/components/auth";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({
  children,
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left Panel */}
        <LoginHero />

        {/* Right Panel */}
        <div className="flex items-center justify-center bg-white">
          <div className="w-full max-w-xl">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}