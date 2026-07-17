import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Forgot Password | Bluegate Publishers",
  description:
    "Request a secure Bluegate password reset code.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
