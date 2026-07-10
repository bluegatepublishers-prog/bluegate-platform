import type { Metadata } from "next";
import { LoginForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Teacher Login | Bluegate Publishers",
  description:
    "Sign in to the Bluegate Teacher Portal to access teaching resources, lesson plans, worksheets, presentations, question banks, teacher manuals, and professional development materials.",
};

export default async function TeacherLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  return <LoginForm callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined} />;
}
