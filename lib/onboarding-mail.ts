import "server-only";
import { sendConfiguredMail, type MailRuntimeDependencies } from "@/lib/mail-runtime";

type OnboardingMailDependencies = MailRuntimeDependencies;

export async function sendOnboardingNoticeBestEffort(
  input: { to: string; subject: string; text: string },
  dependencies?: OnboardingMailDependencies,
) {
  return sendConfiguredMail(
    input,
    {
      failureCode: "ONBOARDING_EMAIL_SEND_FAILED",
      failureMessage: "Onboarding notification could not be sent.",
    },
    dependencies,
  );
}
