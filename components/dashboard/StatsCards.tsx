"use client";

import Link from "next/link";
import {
  BookOpen,
  Download,
  Bookmark,
  Video,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

const stats = [
  {
    title: "My Resources",
    value: "128",
    subtitle: "Available Resources",
    icon: BookOpen,
    href: "/teacher-dashboard/resources",
    color: "bg-blue-100 text-blue-700",
    trend: "+12 this month",
  },
  {
    title: "Downloads",
    value: "42",
    subtitle: "Downloaded Files",
    icon: Download,
    href: "/teacher-dashboard/downloads",
    color: "bg-green-100 text-green-700",
    trend: "+8 this week",
  },
  {
    title: "Bookmarks",
    value: "19",
    subtitle: "Saved Resources",
    icon: Bookmark,
    href: "/teacher-dashboard/bookmarks",
    color: "bg-amber-100 text-amber-700",
    trend: "+3 recently",
  },
  {
    title: "Training",
    value: "7",
    subtitle: "Completed Courses",
    icon: Video,
    href: "/teacher-dashboard/training",
    color: "bg-purple-100 text-purple-700",
    trend: "2 upcoming",
  },
];

export default function StatsCards() {
  return (
    <section className="py-10">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${item.color}`}
                >
                  <Icon className="h-8 w-8" />
                </div>

                <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" />
              </div>

              {/* Value */}
              <h2 className="mt-8 text-4xl font-bold text-slate-900">
                {item.value}
              </h2>

              {/* Title */}
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {item.title}
              </h3>

              {/* Subtitle */}
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {item.subtitle}
              </p>

              {/* Trend */}
              <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
                <TrendingUp className="h-4 w-4 text-green-600" />

                <span className="text-sm font-medium text-slate-700">
                  {item.trend}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}