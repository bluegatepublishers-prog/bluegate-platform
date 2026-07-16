import "server-only";
import nodemailer from "nodemailer";

export async function sendOnboardingNoticeBestEffort(input: { to: string; subject: string; text: string }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return { state: "NOT_CONFIGURED" as const };
  try {
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    await transporter.sendMail({ from: process.env.EMAIL_USER, to: input.to, subject: input.subject, text: input.text });
    return { state: "SENT" as const };
  } catch {
    console.error("Onboarding notification could not be sent.");
    return { state: "FAILED" as const };
  }
}
