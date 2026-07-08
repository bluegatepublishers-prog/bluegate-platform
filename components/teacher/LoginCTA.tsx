"use client";

import Link from "next/link";
import {
  ArrowRight,
  Lock,
  Download,
  BookOpen,
  Bell,
  UserCheck,
} from "lucide-react";

const benefits = [
  {
    icon: Download,
    title: "Download Resources",
    description: "Access lesson plans, worksheets, PPTs and answer keys.",
  },
  {
    icon: BookOpen,
    title: "Exclusive Content",
    description: "Curriculum-aligned teaching materials for Bluegate books.",
  },
  {
    icon: Bell,
    title: "Latest Updates",
    description: "Receive notifications about new resources and editions.",
  },
  {
    icon: UserCheck,
    title: "Teacher Dashboard",
    description: "Manage downloads, bookmarks and classroom resources.",
  },
];

export default function LoginCTA() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left Content */}
          <div>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              <Lock className="mr-2 h-4 w-4" />
              Secure Teacher Access
            </span>

            <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">
              One Login.
              <br />
              Every Teaching Resource.
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              Registered teachers can securely access premium classroom
              materials developed by Bluegate Publishers. Everything is
              organized in one place to save preparation time and enhance
              classroom learning.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/teacher-login"
                className="inline-flex items-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Teacher Login
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>

              <Link
                href="/contact"
                className="inline-flex items-center rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
              >
                Register School
              </Link>
            </div>
          </div>

          {/* Right Benefits */}
          <div className="grid gap-6 sm:grid-cols-2">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <div
                  key={benefit.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-lg"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
                    <Icon className="h-7 w-7 text-blue-700" />
                  </div>

                  <h3 className="mt-5 text-lg font-semibold text-slate-900">
                    {benefit.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}