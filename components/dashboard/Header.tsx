"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  User,
  Settings,
} from "lucide-react";
import LogoutButton from "./LogoutButton";

export default function Header({ teacherName }: { teacherName: string }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex h-20 items-center justify-between px-6 lg:px-10">
        {/* Left */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Teacher Dashboard
            </h1>

            <div className="mt-1 flex items-center text-sm text-slate-500">
              <CalendarDays className="mr-2 h-4 w-4" />
              {today}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          {/* Notification */}
          <Link href="/teacher-dashboard/notifications" aria-label="Notifications" className="rounded-xl border border-slate-200 p-3 transition hover:bg-slate-100">
            <Bell className="h-5 w-5 text-slate-700" />
          </Link>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 transition hover:bg-slate-50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                TS
              </div>

              <div className="hidden text-left lg:block">
                <p className="font-semibold text-slate-900">
                  {teacherName}
                </p>

                <p className="text-xs text-slate-500">
                  Verified Teacher
                </p>
              </div>

              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>

            {/* Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <Link
                  href="/teacher-dashboard/profile"
                  className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50"
                >
                  <User className="h-5 w-5 text-blue-600" />

                  <span>My Profile</span>
                </Link>

                <Link
                  href="/teacher-dashboard/settings"
                  className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50"
                >
                  <Settings className="h-5 w-5 text-blue-600" />

                  <span>Settings</span>
                </Link>

                <div className="p-3"><LogoutButton className="w-full" /></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
