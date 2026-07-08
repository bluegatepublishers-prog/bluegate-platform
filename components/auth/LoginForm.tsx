"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(true);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push("/teacher-dashboard");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-center p-8 lg:p-14">
      <div className="w-full max-w-md">
        {/* Logo */}

        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>

          <h1 className="mt-8 text-4xl font-bold">
            Teacher Login
          </h1>

          <p className="mt-3 text-slate-600">
            Sign in to access your Teacher Dashboard.
          </p>
        </div>

        {/* Form */}

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-6"
        >
          <div>
            <label className="mb-2 block font-medium">
              Email
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

          <div>
            <label className="mb-2 block font-medium">
              Password
            </label>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type={
                  showPassword ? "text" : "password"
                }
                required
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Password"
                className="w-full rounded-2xl border border-slate-300 py-4 pl-12 pr-14 outline-none focus:border-blue-600"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-slate-500" />
                ) : (
                  <Eye className="h-5 w-5 text-slate-500" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() =>
                  setRememberMe(!rememberMe)
                }
              />

              Remember me
            </label>

            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-blue-600"
            >
              Forgot Password?
            </Link>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center rounded-2xl bg-blue-600 py-4 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? (
              "Signing In..."
            ) : (
              <>
                Sign In

                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </button>
        </form>

        <div className="my-8 border-t" />

        <div className="rounded-2xl bg-slate-50 p-6">
          <h3 className="font-bold">
            Demo Login
          </h3>

          <p className="mt-3 text-sm text-slate-600">
            Email:
            <br />
            <strong>teacher@bluegate.in</strong>
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Password:
            <br />
            <strong>123456</strong>
          </p>
        </div>
      </div>
    </div>
  );
}