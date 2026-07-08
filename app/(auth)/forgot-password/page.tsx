import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Forgot Password | Bluegate Publishers",
  description:
    "Reset your Bluegate Teacher account password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}