"use client";

import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  ArrowRight,
  PlayCircle,
} from "lucide-react";

const trainings = [
  {
    id: 1,
    title: "Effective Classroom Teaching Strategies",
    date: "15 July 2026",
    time: "10:00 AM - 11:30 AM",
    mode: "Live Webinar",
    seats: "120 Registered",
    location: "Online (Zoom)",
    status: "Upcoming",
  },
  {
    id: 2,
    title: "Competency-Based Assessment Workshop",
    date: "20 July 2026",
    time: "02:00 PM - 04:00 PM",
    mode: "Interactive Workshop",
    seats: "85 Registered",
    location: "Online (Google Meet)",
    status: "Open",
  },
  {
    id: 3,
    title: "Artificial Intelligence in Education",
    date: "28 July 2026",
    time: "11:00 AM - 12:30 PM",
    mode: "Expert Session",
    seats: "200 Registered",
    location: "Online",
    status: "Registration Open",
  },
];

export default function UpcomingTraining() {
  return (
    <section className="py-10">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-5 border-b border-slate-200 p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700">
              <PlayCircle className="mr-2 h-4 w-4" />
              Professional Development
            </span>

            <h2 className="mt-5 text-3xl font-bold text-slate-900">
              Upcoming Training & Workshops
            </h2>

            <p className="mt-3 max-w-2xl text-slate-600">
              Stay updated with webinars, academic workshops and teacher
              development programmes conducted by Bluegate Publishers.
            </p>
          </div>

          <Link
            href="/teacher-dashboard/training"
            className="inline-flex items-center font-semibold text-blue-700 hover:text-blue-800"
          >
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {/* Training Cards */}
        <div className="grid gap-8 p-8 lg:grid-cols-3">
          {trainings.map((training) => (
            <div
              key={training.id}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:bg-white hover:shadow-lg"
            >
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  {training.status}
                </span>

                <span className="text-sm font-medium text-slate-500">
                  {training.mode}
                </span>
              </div>

              {/* Title */}
              <h3 className="mt-6 text-xl font-bold leading-8 text-slate-900">
                {training.title}
              </h3>

              {/* Details */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center text-sm text-slate-600">
                  <CalendarDays className="mr-3 h-5 w-5 text-blue-600" />
                  {training.date}
                </div>

                <div className="flex items-center text-sm text-slate-600">
                  <Clock className="mr-3 h-5 w-5 text-blue-600" />
                  {training.time}
                </div>

                <div className="flex items-center text-sm text-slate-600">
                  <MapPin className="mr-3 h-5 w-5 text-blue-600" />
                  {training.location}
                </div>

                <div className="flex items-center text-sm text-slate-600">
                  <Users className="mr-3 h-5 w-5 text-blue-600" />
                  {training.seats}
                </div>
              </div>

              {/* Action */}
              <div className="mt-8">
                <button className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700">
                  Register Now
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="border-t border-slate-200 bg-blue-50 px-8 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                Continue Your Professional Journey
              </h3>

              <p className="mt-2 text-slate-600">
                Join expert-led sessions, discover innovative teaching
                practices, and earn participation certificates through
                Bluegate Teacher Development Programmes.
              </p>
            </div>

            <Link
              href="/teacher-dashboard/training"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Explore All Training
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}