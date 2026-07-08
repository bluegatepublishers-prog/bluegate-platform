"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Send,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);

    /**
     * Temporary Delay
     * Replace with API later
     */

    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  }

  if (success) {
    return (
      <div className="flex items-center justify-center p-8 lg:p-14">
        <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl">

          <div className="flex justify-center">

            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">

              <CheckCircle2 className="h-10 w-10 text-green-600" />

            </div>

          </div>

          <h1 className="mt-8 text-center text-3xl font-bold text-slate-900">
            Check Your Email
          </h1>

          <p className="mt-5 text-center leading-7 text-slate-600">
            If an account exists with the email you entered,
            we've sent a password reset link.
          </p>

          <Link
            href="/teacher-login"
            className="mt-10 flex w-full items-center justify-center rounded-2xl bg-blue-600 py-4 font-semibold text-white transition hover:bg-blue-700"
          >
            Back to Login
          </Link>

        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8 lg:p-14">

      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl">

        <div className="flex justify-center">

          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">

            <GraduationCap className="h-10 w-10 text-blue-700" />

          </div>

        </div>

        <h1 className="mt-8 text-center text-3xl font-bold text-slate-900">
          Forgot Password
        </h1>

        <p className="mt-4 text-center leading-7 text-slate-600">
          Enter your registered email address and we'll send
          you a password reset link.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-6"
        >

          <div>

            <label className="mb-2 block font-medium">
              Email Address
            </label>

            <div className="relative">

              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="email"
                required
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="teacher@school.com"
                className="w-full rounded-2xl border border-slate-300 py-4 pl-12 pr-4 outline-none focus:border-blue-600"
              />

            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl bg-blue-600 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >

            {loading ? (
              "Sending..."
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />

                Send Reset Link
              </>
            )}

          </button>

        </form>

        <div className="mt-8">

          <Link
            href="/teacher-login"
            className="flex items-center justify-center font-semibold text-blue-700 hover:text-blue-900"
          >

            <ArrowLeft className="mr-2 h-5 w-5" />

            Back to Login

          </Link>

        </div>

      </div>

    </div>
  );
}