import "server-only";

import { sendConfiguredMail, type MailRuntimeDependencies } from "@/lib/mail-runtime";

type SecurityEmailInput = {
  to: string;
  code: string;
  brandName?: string | null;
};

type SecurityEmailDependencies = MailRuntimeDependencies;

async function send(
  input: { to: string; subject: string; text: string },
  dependencies?: SecurityEmailDependencies,
) {
  return sendConfiguredMail(
    input,
    {
      requireSecuritySecret: true,
      failureCode: "SECURITY_EMAIL_SEND_FAILED",
      failureMessage: "Security email could not be sent.",
    },
    dependencies,
  );
}

export function sendEmailVerificationCode(
  input: SecurityEmailInput,
  dependencies?: SecurityEmailDependencies,
) {
  const brand = input.brandName?.trim() || "Bluegate";
  return send({
    to: input.to,
    subject: "Verify your email for Bluegate",
    text: `Use this six-digit code to verify your email for ${brand}:\n\n${input.code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this verification, you may ignore this message.`,
  }, dependencies);
}

export function sendPasswordResetCode(
  input: SecurityEmailInput,
  dependencies?: SecurityEmailDependencies,
) {
  return send({
    to: input.to,
    subject: "Reset your Bluegate password",
    text: `Use this six-digit code to reset your password:\n\n${input.code}\n\nThis code expires in 10 minutes.\n\nIf you did not request a password reset, you may ignore this message.`,
  }, dependencies);
}
