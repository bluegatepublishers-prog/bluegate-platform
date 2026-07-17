import "server-only";

import nodemailer from "nodemailer";

type SecurityEmailInput = {
  to: string;
  code: string;
  brandName?: string | null;
};

async function send(input: { to: string; subject: string; text: string }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return { state: "NOT_CONFIGURED" as const };
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { state: "SENT" as const };
  } catch {
    console.error("Security email could not be sent.");
    return { state: "FAILED" as const };
  }
}

export function sendEmailVerificationCode(input: SecurityEmailInput) {
  const brand = input.brandName?.trim() || "Bluegate";
  return send({
    to: input.to,
    subject: "Verify your email for Bluegate",
    text: `Use this six-digit code to verify your email for ${brand}:\n\n${input.code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this verification, you may ignore this message.`,
  });
}

export function sendPasswordResetCode(input: SecurityEmailInput) {
  return send({
    to: input.to,
    subject: "Reset your Bluegate password",
    text: `Use this six-digit code to reset your password:\n\n${input.code}\n\nThis code expires in 10 minutes.\n\nIf you did not request a password reset, you may ignore this message.`,
  });
}
