import assert from "node:assert/strict";
import test from "node:test";

import {
  createMailRuntime,
  sendConfiguredMail,
  validateMailConfiguration,
  type MailConfigMissingVariable,
  type MailRuntimeDependencies,
} from "../lib/mail-runtime";

type EnvSnapshot = {
  EMAIL_USER?: string;
  EMAIL_PASS?: string;
  AUTH_SECRET?: string;
  NEXTAUTH_SECRET?: string;
};

function withEnv(values: EnvSnapshot, run: () => Promise<void> | void) {
  const original: EnvSnapshot = {
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  };

  const assign = (key: keyof EnvSnapshot, value: string | undefined) => {
    if (typeof value === "undefined") delete process.env[key];
    else process.env[key] = value;
  };

  assign("EMAIL_USER", values.EMAIL_USER);
  assign("EMAIL_PASS", values.EMAIL_PASS);
  assign("AUTH_SECRET", values.AUTH_SECRET);
  assign("NEXTAUTH_SECRET", values.NEXTAUTH_SECRET);

  const complete = () => {
    assign("EMAIL_USER", original.EMAIL_USER);
    assign("EMAIL_PASS", original.EMAIL_PASS);
    assign("AUTH_SECRET", original.AUTH_SECRET);
    assign("NEXTAUTH_SECRET", original.NEXTAUTH_SECRET);
  };

  try {
    const result = run();
    if (result && typeof (result as Promise<void>).then === "function") {
      return (result as Promise<void>).finally(complete);
    }
    complete();
    return undefined;
  } catch (error) {
    complete();
    throw error;
  }
}

function loggerHarness() {
  const entries: string[] = [];
  return {
    entries,
    logger: {
      error(message: string, metadata?: unknown) {
        entries.push(`${message} ${JSON.stringify(metadata ?? {})}`);
      },
    },
  };
}

test("mail runtime reports CONFIGURED and sends via shared transport", async () => {
  await withEnv(
    {
      EMAIL_USER: "mailer@example.com",
      EMAIL_PASS: "mail-pass",
      AUTH_SECRET: "pepper",
      NEXTAUTH_SECRET: undefined,
    },
    async () => {
      const deliveries: Array<{ from: string; to: string; subject: string; text: string }> = [];
      const dependencies: MailRuntimeDependencies = {
        createTransport() {
          return {
            async sendMail(input) {
              deliveries.push(input);
            },
          };
        },
      };
      const runtime = createMailRuntime(
        { requireSecuritySecret: true },
        dependencies,
      );
      assert.equal(runtime.status, "CONFIGURED");
      if (runtime.status !== "CONFIGURED") return;
      await runtime.sendMail({
        to: "learner@example.com",
        subject: "Verify",
        text: "123456",
      });
      assert.equal(deliveries.length, 1);
      assert.equal(deliveries[0]?.from, "mailer@example.com");
      assert.equal(deliveries[0]?.to, "learner@example.com");
    },
  );
});

test("mail runtime reports NOT_CONFIGURED when EMAIL_USER is missing", async () => {
  await withEnv(
    {
      EMAIL_USER: undefined,
      EMAIL_PASS: "mail-pass",
      AUTH_SECRET: "pepper",
      NEXTAUTH_SECRET: undefined,
    },
    () => {
      const { logger, entries } = loggerHarness();
      const configuration = validateMailConfiguration(
        { requireSecuritySecret: true },
        { logger },
      );
      assert.equal(configuration.status, "NOT_CONFIGURED");
      assert.deepEqual(configuration.missingVariables, ["EMAIL_USER"]);
      assert.ok(entries.some((entry) => entry.includes("EMAIL_USER")));
    },
  );
});

test("mail runtime reports NOT_CONFIGURED when EMAIL_PASS is missing", async () => {
  await withEnv(
    {
      EMAIL_USER: "mailer@example.com",
      EMAIL_PASS: undefined,
      AUTH_SECRET: "pepper",
      NEXTAUTH_SECRET: undefined,
    },
    () => {
      const configuration = validateMailConfiguration({
        requireSecuritySecret: true,
      });
      assert.equal(configuration.status, "NOT_CONFIGURED");
      const missing = new Set<MailConfigMissingVariable>(
        configuration.missingVariables,
      );
      assert.equal(missing.has("EMAIL_PASS"), true);
    },
  );
});

test("mail runtime requires AUTH_SECRET or NEXTAUTH_SECRET when requested", async () => {
  await withEnv(
    {
      EMAIL_USER: "mailer@example.com",
      EMAIL_PASS: "mail-pass",
      AUTH_SECRET: undefined,
      NEXTAUTH_SECRET: undefined,
    },
    () => {
      const configuration = validateMailConfiguration({
        requireSecuritySecret: true,
      });
      assert.equal(configuration.status, "NOT_CONFIGURED");
      assert.ok(
        configuration.missingVariables.includes(
          "AUTH_SECRET_OR_NEXTAUTH_SECRET",
        ),
      );
    },
  );
});

test("security email send failure returns FAILED and logs sanitized details", async () => {
  await withEnv(
    {
      EMAIL_USER: "mailer@example.com",
      EMAIL_PASS: "mail-pass",
      AUTH_SECRET: "pepper",
      NEXTAUTH_SECRET: undefined,
    },
    async () => {
      const { logger, entries } = loggerHarness();
      const state = await sendConfiguredMail(
        {
          to: "learner@example.com",
          subject: "Verify your email for Bluegate",
          text: "Use this code: 123456",
        },
        {
          requireSecuritySecret: true,
          failureCode: "SECURITY_EMAIL_SEND_FAILED",
          failureMessage: "Security email could not be sent.",
        },
        {
          logger,
          createTransport() {
            return {
              async sendMail() {
                throw new Error("simulated failure");
              },
            };
          },
        },
      );
      assert.equal(state.state, "FAILED");
      assert.ok(
        entries.some((entry) =>
          entry.includes("Security email could not be sent."),
        ),
      );
      assert.ok(entries.every((entry) => !entry.includes("mail-pass")));
      assert.ok(entries.every((entry) => !entry.includes("123456")));
    },
  );
});

test("onboarding notice returns NOT_CONFIGURED when mail credentials are missing", async () => {
  await withEnv(
    {
      EMAIL_USER: "mailer@example.com",
      EMAIL_PASS: undefined,
      AUTH_SECRET: "pepper",
      NEXTAUTH_SECRET: undefined,
    },
    async () => {
      const state = await sendConfiguredMail(
        {
          to: "teacher@example.com",
          subject: "Approved",
          text: "Your onboarding request is approved.",
        },
        {
          failureCode: "ONBOARDING_EMAIL_SEND_FAILED",
          failureMessage: "Onboarding notification could not be sent.",
        },
      );
      assert.equal(state.state, "NOT_CONFIGURED");
    },
  );
});
