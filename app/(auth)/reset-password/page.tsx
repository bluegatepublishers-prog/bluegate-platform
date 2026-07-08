import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Reset Password | Bluegate Publishers",
  description:
    "Create a new password for your Bluegate Teacher account.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}