import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "School Login | Bluegate Publishers",
  description: "Sign in to the Bluegate School Portal.",
};

export default async function SchoolLoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string | string[] }> }) {
  const session = await auth();
  if (session?.user?.role === "SCHOOL") redirect("/school-dashboard");
  if (session?.user?.role === "TEACHER") redirect("/teacher-dashboard");
  if (session?.user?.role === "ADMIN") redirect("/admin");

  const { callbackUrl } = await searchParams;
  return <LoginForm
    callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined}
    title="School Login"
    description="Sign in as a school administrator or coordinator to access your School Dashboard."
    identifierPlaceholder="school@bluegatepublishers.com"
    showDemo={false}
    showPublicLink
  />;
}
