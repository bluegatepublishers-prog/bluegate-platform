"use client";

import { useEffect, useState, type ReactNode } from "react";

import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminShell({
  children,
  userLabel,
  branding,features,
}: {
  children: ReactNode;
  userLabel: string;
  branding:{shortName:string;portalTitle:string;primaryColor:string};features:Record<string,boolean>;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      <AdminSidebar branding={branding} features={features}/>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMobileOpen(false)}
            aria-label="Close admin navigation"
          />
          <div className="relative h-full w-fit">
            <AdminSidebar branding={branding} features={features} mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <AdminHeader userLabel={userLabel} onOpenMenu={() => setMobileOpen(true)} />
        <div className="min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px] min-w-0 overflow-x-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
