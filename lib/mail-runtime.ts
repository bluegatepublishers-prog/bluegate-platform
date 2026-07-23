import nodemailer from "nodemailer";

export type MailConfigStatus = "CONFIGURED" | "NOT_CONFIGURED";
export type MailConfigMissingVariable =
  | "EMAIL_USER"
  | "EMAIL_PASS"
  | "AUTH_SECRET_OR_NEXTAUTH_SECRET";

type MailLogger = Pick<Console, "error">;

export type MailTransport = {
  sendMail(input: {
    from: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<unknown>;
};

export type MailTransportFactory = (input: {
  service: "gmail";
  auth: { user: string; pass: string };
}) => MailTransport;

export type MailRuntimeDependencies = {
  createTransport?: MailTransportFactory;
  logger?: MailLogger;
};

export type MailRuntimeOptions = {
  requireSecuritySecret?: boolean;
};

export type MailConfiguration = {
  status: MailConfigStatus;
  missingVariables: MailConfigMissingVariable[];
  senderEmail: string | null;
};

type ConfiguredMailRuntime = {
  status: "CONFIGURED";
  senderEmail: string;
  sendMail(input: { to: string; subject: string; text: string }): Promise<unknown>;
};

type NotConfiguredMailRuntime = {
  status: "NOT_CONFIGURED";
  missingVariables: MailConfigMissingVariable[];
};

export type MailRuntime = ConfiguredMailRuntime | NotConfiguredMailRuntime;
export type MailDeliveryState = "SENT" | "FAILED" | "NOT_CONFIGURED";

function missingVariableLabel(value: MailConfigMissingVariable) {
  if (value === "AUTH_SECRET_OR_NEXTAUTH_SECRET") {
    return "AUTH_SECRET or NEXTAUTH_SECRET";
  }
  return value;
}

function runtimeLogger(dependencies?: MailRuntimeDependencies): MailLogger {
  return dependencies?.logger ?? console;
}

export function validateMailConfiguration(
  options?: MailRuntimeOptions,
  dependencies?: MailRuntimeDependencies,
): MailConfiguration {
  const senderEmail = process.env.EMAIL_USER?.trim() || null;
  const senderPassword = process.env.EMAIL_PASS?.trim() || null;
  const needsSecuritySecret = Boolean(options?.requireSecuritySecret);
  const hasSecuritySecret = Boolean(
    process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  );

  const missingVariables: MailConfigMissingVariable[] = [];
  if (!senderEmail) missingVariables.push("EMAIL_USER");
  if (!senderPassword) missingVariables.push("EMAIL_PASS");
  if (needsSecuritySecret && !hasSecuritySecret) {
    missingVariables.push("AUTH_SECRET_OR_NEXTAUTH_SECRET");
  }

  if (missingVariables.length) {
    runtimeLogger(dependencies).error(
      "Server mail configuration is incomplete.",
      { missingVariables: missingVariables.map(missingVariableLabel) },
    );
    return {
      status: "NOT_CONFIGURED",
      missingVariables,
      senderEmail,
    };
  }

  return {
    status: "CONFIGURED",
    missingVariables: [],
    senderEmail,
  };
}

export function createMailRuntime(
  options?: MailRuntimeOptions,
  dependencies?: MailRuntimeDependencies,
): MailRuntime {
  const configuration = validateMailConfiguration(options, dependencies);
  if (configuration.status !== "CONFIGURED") {
    return {
      status: "NOT_CONFIGURED",
      missingVariables: configuration.missingVariables,
    };
  }
  const senderEmail = configuration.senderEmail;
  if (!senderEmail) {
    return {
      status: "NOT_CONFIGURED",
      missingVariables: ["EMAIL_USER"],
    };
  }
  const senderPassword = process.env.EMAIL_PASS?.trim();
  if (!senderPassword) {
    return {
      status: "NOT_CONFIGURED",
      missingVariables: ["EMAIL_PASS"],
    };
  }

  const createTransport =
    dependencies?.createTransport ??
    ((input) => nodemailer.createTransport(input));
  const transport = createTransport({
    service: "gmail",
    auth: {
      user: senderEmail,
      pass: senderPassword,
    },
  });

  return {
    status: "CONFIGURED",
    senderEmail,
    sendMail(input) {
      return transport.sendMail({
        from: senderEmail,
        to: input.to,
        subject: input.subject,
        text: input.text,
      });
    },
  };
}

export async function sendConfiguredMail(
  input: { to: string; subject: string; text: string },
  options: MailRuntimeOptions & { failureCode: string; failureMessage: string },
  dependencies?: MailRuntimeDependencies,
): Promise<{ state: MailDeliveryState }> {
  const runtime = createMailRuntime(options, dependencies);
  if (runtime.status !== "CONFIGURED") {
    return { state: "NOT_CONFIGURED" };
  }
  try {
    await runtime.sendMail(input);
    return { state: "SENT" };
  } catch (error) {
    runtimeLogger(dependencies).error(options.failureMessage, {
      code: options.failureCode,
      errorName: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return { state: "FAILED" };
  }
}
