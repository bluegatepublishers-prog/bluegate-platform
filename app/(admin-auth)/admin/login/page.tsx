import type { Metadata } from "next";
import { LoginForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Admin Login | Bluegate Publishers",
  description: "Sign in to access the Bluegate Publishers Admin Panel.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
        <LoginForm
          callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined}
          title="Admin Login"
          description="Use your admin credentials to continue."
        />
      </div>
    </main>
  );
}
