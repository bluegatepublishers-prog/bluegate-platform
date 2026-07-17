import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Reset Password | Bluegate Publishers",
  description:
    "Verify a reset code and create a new Bluegate password.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
