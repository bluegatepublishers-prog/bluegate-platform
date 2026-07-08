"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";

export default function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    setLoading(true);

    /**
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

          <h1 className="mt-8 text-center text-3xl font-bold">
            Password Updated
          </h1>

          <p className="mt-4 text-center leading-7 text-slate-600">
            Your password has been changed successfully.
            You can now sign in using your new password.
          </p>

          <Link
            href="/teacher-login"
            className="mt-8 flex w-full items-center justify-center rounded-2xl bg-blue-600 py-4 font-semibold text-white transition hover:bg-blue-700"
          >
            Go to Login
          </Link>

        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8 lg:p-14">

      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl">

        <h1 className="text-center text-3xl font-bold">
          Reset Password
        </h1>

        <p className="mt-4 text-center leading-7 text-slate-600">
          Create a strong password for your Bluegate
          Teacher account.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-6"
        >

          {/* Password */}

          <div>

            <label className="mb-2 block font-medium">
              New Password
            </label>

            <div className="relative">

              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type={
                  showPassword ? "text" : "password"
                }
                required
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 py-4 pl-12 pr-12 outline-none focus:border-blue-600"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>

            </div>

          </div>

          {/* Confirm */}

          <div>

            <label className="mb-2 block font-medium">
              Confirm Password
            </label>

            <div className="relative">

              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type={
                  showConfirm ? "text" : "password"
                }
                required
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 py-4 pl-12 pr-12 outline-none focus:border-blue-600"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirm(!showConfirm)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showConfirm ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>

            </div>

          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading
              ? "Updating Password..."
              : "Reset Password"}
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