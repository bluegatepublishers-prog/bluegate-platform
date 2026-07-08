"use client";

import Link from "next/link";
import {
  Bell,
  BookOpen,
  Download,
  CalendarDays,
  Award,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const notifications = [
  {
    id: 1,
    title: "New Science Lesson Plan Available",
    description:
      "A new Class 6 Science lesson plan has been published in the Teacher Hub.",
    date: "Today",
    type: "Resource",
    icon: BookOpen,
    color: "bg-blue-100 text-blue-700",
    unread: true,
  },
  {
    id: 2,
    title: "Worksheet Download Completed",
    description:
      "Your Mathematics worksheet has been downloaded successfully.",
    date: "Yesterday",
    type: "Download",
    icon: Download,
    color: "bg-green-100 text-green-700",
    unread: false,
  },
  {
    id: 3,
    title: "Teacher Webinar Reminder",
    description:
      "Your registered webinar starts tomorrow at 10:00 AM.",
    date: "1 Day Left",
    type: "Training",
    icon: CalendarDays,
    color: "bg-purple-100 text-purple-700",
    unread: true,
  },
  {
    id: 4,
    title: "Certificate Issued",
    description:
      "Your Professional Development Certificate is now available.",
    date: "2 Days Ago",
    type: "Achievement",
    icon: Award,
    color: "bg-amber-100 text-amber-700",
    unread: false,
  },
];

export default function Notifications() {
  return (
    <section className="py-10">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-5 border-b border-slate-200 p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              <Bell className="mr-2 h-4 w-4" />
              Activity Feed
            </span>

            <h2 className="mt-5 text-3xl font-bold text-slate-900">
              Notifications
            </h2>

            <p className="mt-3 max-w-2xl text-slate-600">
              Stay informed about new teaching resources, downloads,
              webinars, certificates and important announcements.
            </p>
          </div>

          <Link
            href="/teacher-dashboard/notifications"
            className="inline-flex items-center font-semibold text-blue-700 transition hover:text-blue-800"
          >
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {/* Notifications */}
        <div className="divide-y divide-slate-100">
          {notifications.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className="flex flex-col gap-6 p-8 transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
              >
                {/* Left */}
                <div className="flex items-start gap-5">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.color}`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {item.title}
                      </h3>

                      {item.unread && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          New
                        </span>
                      )}
                    </div>

                    <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                      {item.description}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {item.type}
                      </span>

                      <span className="text-sm text-slate-500">
                        {item.date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-3">
                  <button className="inline-flex items-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-700">
                    View
                  </button>

                  {item.unread && (
                    <button className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-slate-600">
            You're all caught up. Check back regularly for new resources,
            webinars and important updates from Bluegate Publishers.
          </p>
        </div>
      </div>
    </section>
  );
}