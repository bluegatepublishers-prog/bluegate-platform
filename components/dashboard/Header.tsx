"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Bell,
  Menu,
  CalendarDays,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from "lucide-react";

export default function Header() {
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
          {/* Mobile Menu */}
          <button className="rounded-xl border border-slate-200 p-3 transition hover:bg-slate-100 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>

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

        {/* Center Search */}
        <div className="hidden w-full max-w-xl px-10 lg:block">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Search resources, lesson plans, worksheets..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-5 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          {/* Notification */}
          <button className="relative rounded-xl border border-slate-200 p-3 transition hover:bg-slate-100">
            <Bell className="h-5 w-5 text-slate-700" />

            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500"></span>
          </button>

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
                  Teacher Name
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

                <button className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-red-50 hover:text-red-600">
                  <LogOut className="h-5 w-5" />

                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}