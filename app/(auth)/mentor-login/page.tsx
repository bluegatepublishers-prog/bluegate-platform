import type { Metadata } from "next";
import { LoginForm } from "@/components/auth";

export const metadata: Metadata = { title: "Mentor Login | Bluegate Publishers", description: "Sign in to your assigned-student mentor workspace." };

export default async function MentorLoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }> }) {
  const { callbackUrl, error } = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12"><div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white shadow-xl"><LoginForm callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined} redirectPath="/mentor-dashboard" title="Mentor Login" description="Use the mentor account issued by your publisher." emailPlaceholder="mentor@bluegate.in" showDemo={false} showPublicLink initialError={typeof error === "string" ? "Your mentor access could not be verified. Please sign in again or contact the publisher." : undefined}/></div></main>;
}
