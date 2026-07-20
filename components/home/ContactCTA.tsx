"use client";

import Link from "next/link";
import { ArrowRight, Mail, Phone, BookOpen } from "lucide-react";

export default function ContactCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 py-24">
      {/* Background Decorations */}
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-10 backdrop-blur-xl lg:p-16">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left Content */}
            <div>
              <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-blue-100">
                Let&rsquo;s Work Together
              </span>

              <h2 className="mt-6 text-4xl font-bold text-white md:text-5xl">
                Ready to Partner with
                <span className="block text-yellow-300">
                  Bluegate Publishers?
                </span>
              </h2>

              <p className="mt-6 text-lg leading-8 text-blue-100">
                Discover curriculum-aligned books, innovative teaching
                resources and complete educational solutions for your school.
                Request an inspection copy or connect with our academic team.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/books"
                  className="inline-flex items-center rounded-xl bg-yellow-400 px-7 py-4 font-semibold text-slate-900 transition hover:bg-yellow-300"
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  Request Inspection Copy
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-xl border border-white/30 px-7 py-4 font-semibold text-white transition hover:bg-white hover:text-slate-900"
                >
                  Contact Us
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>

            {/* Right Contact Card */}
            <div className="rounded-3xl bg-white p-8 shadow-2xl">
              <h3 className="text-2xl font-bold text-slate-900">
                Contact Information
              </h3>

              <p className="mt-3 text-slate-600">
                Our academic team is ready to help your school choose the right
                books and educational resources.
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                    <Mail size={22} />
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900">
                      Email
                    </h4>
                    <p className="text-slate-600">
                      bluegatepublishers@gmail.com
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                    <Phone size={22} />
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900">
                      Phone
                    </h4>
                    <p className="text-slate-600">
                      +91 9667665710
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 rounded-2xl bg-slate-100 p-5">
                <h4 className="font-semibold text-slate-900">
                  Why Choose Bluegate?
                </h4>

                <ul className="mt-4 space-y-2 text-slate-600">
                  <li>✓ NCF & NEP Aligned Content</li>
                  <li>✓ Competency-Based Learning</li>
                  <li>✓ Teacher Support Resources</li>
                  <li>✓ Digital Learning Solutions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}