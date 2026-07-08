import type { Metadata } from "next";
import {
  CalendarDays,
  Clock,
  Users,
  Video,
  Award,
  PlayCircle,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Teacher Training | Bluegate Teacher Dashboard",
  description:
    "Professional development, webinars, workshops and certification programmes for teachers.",
};

const trainings = [
  {
    id: 1,
    title: "Effective Classroom Teaching Strategies",
    type: "Live Webinar",
    date: "15 July 2026",
    time: "10:00 AM - 11:30 AM",
    participants: "120 Teachers",
    status: "Upcoming",
  },
  {
    id: 2,
    title: "Competency Based Assessment",
    type: "Workshop",
    date: "20 July 2026",
    time: "2:00 PM - 4:00 PM",
    participants: "85 Teachers",
    status: "Registration Open",
  },
  {
    id: 3,
    title: "Artificial Intelligence in Education",
    type: "Recorded Session",
    date: "Available Anytime",
    time: "45 Minutes",
    participants: "250+ Teachers",
    status: "Watch Now",
  },
];

const certificates = [
  {
    title: "Digital Teaching Skills",
    issued: "June 2026",
  },
  {
    title: "Assessment & Evaluation",
    issued: "April 2026",
  },
];

export default function TrainingPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl space-y-8 p-8">

        {/* Hero */}

        <section className="rounded-3xl bg-gradient-to-r from-blue-700 to-blue-900 p-10 text-white shadow-xl">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
                Professional Development
              </span>

              <h1 className="mt-6 text-4xl font-bold">
                Teacher Training Centre
              </h1>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-blue-100">
                Improve your teaching skills through webinars,
                workshops, classroom demonstrations and certified
                professional development programmes.
              </p>

            </div>

            <button className="rounded-2xl bg-white px-8 py-4 font-semibold text-blue-700 transition hover:bg-blue-50">
              Browse All Courses
            </button>

          </div>

        </section>

        {/* Statistics */}

        <div className="grid gap-6 md:grid-cols-4">

          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <Video className="h-10 w-10 text-blue-700" />
            <h2 className="mt-5 text-4xl font-bold">42</h2>
            <p className="mt-2 text-slate-600">
              Training Videos
            </p>
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <CalendarDays className="h-10 w-10 text-green-700" />
            <h2 className="mt-5 text-4xl font-bold">12</h2>
            <p className="mt-2 text-slate-600">
              Live Webinars
            </p>
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <Award className="h-10 w-10 text-amber-600" />
            <h2 className="mt-5 text-4xl font-bold">6</h2>
            <p className="mt-2 text-slate-600">
              Certificates Earned
            </p>
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <Users className="h-10 w-10 text-purple-700" />
            <h2 className="mt-5 text-4xl font-bold">450+</h2>
            <p className="mt-2 text-slate-600">
              Teachers Trained
            </p>
          </div>

        </div>

        {/* Upcoming Training */}

        <section className="rounded-3xl bg-white p-8 shadow-sm">

          <h2 className="text-3xl font-bold text-slate-900">
            Upcoming Sessions
          </h2>

          <div className="mt-8 space-y-6">

            {trainings.map((training) => (
              <div
                key={training.id}
                className="rounded-2xl border border-slate-200 p-6 transition hover:border-blue-300 hover:shadow-md"
              >

                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

                  <div>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                      {training.status}
                    </span>

                    <h3 className="mt-4 text-2xl font-bold text-slate-900">
                      {training.title}
                    </h3>

                    <div className="mt-5 flex flex-wrap gap-5 text-slate-600">

                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" />
                        {training.date}
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        {training.time}
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {training.participants}
                      </div>

                    </div>

                  </div>

                  <button className="flex items-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700">
                    Join

                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>

                </div>

              </div>
            ))}

          </div>

        </section>

        {/* Certificates */}

        <section className="rounded-3xl bg-white p-8 shadow-sm">

          <h2 className="text-3xl font-bold text-slate-900">
            My Certificates
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2">

            {certificates.map((certificate) => (
              <div
                key={certificate.title}
                className="rounded-2xl border border-slate-200 p-6"
              >

                <Award className="h-10 w-10 text-amber-500" />

                <h3 className="mt-5 text-xl font-bold text-slate-900">
                  {certificate.title}
                </h3>

                <p className="mt-2 text-slate-600">
                  Issued: {certificate.issued}
                </p>

                <button className="mt-6 flex items-center rounded-xl border border-blue-600 px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-600 hover:text-white">
                  <PlayCircle className="mr-2 h-5 w-5" />
                  View Certificate
                </button>

              </div>
            ))}

          </div>

        </section>

      </div>
    </main>
  );
}