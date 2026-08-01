import type { Metadata } from "next";
import { LoginForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Student Login | Bluegate Publishers",
  description: "Sign in to your school-issued student account.",
};

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    error?: string | string[];
  }>;
}) {
  const { callbackUrl, error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white shadow-xl">
        <LoginForm
          authProvider="student-credentials"
          callbackUrl={
            typeof callbackUrl === "string" ? callbackUrl : undefined
          }
          redirectPath="/student-dashboard"
          title="Student Login"
          description="Use your email address or student login ID and password."
          identifierPlaceholder="student@school.com or student login ID"
          showDemo={false}
          showPublicLink
          initialError={
            typeof error === "string"
              ? "Your student access could not be verified. Please sign in again or contact your school."
              : undefined
          }
        />
      </div>
    </main>
  );
}
