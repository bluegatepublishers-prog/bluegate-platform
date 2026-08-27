export type ReadinessResult = {
  application: "ok";
  configuration: "ok" | "missing";
  database: "ok" | "unavailable" | "not_configured";
  ready: boolean;
};

export async function evaluateReadiness(input: {
  databaseConfigured: boolean;
  authenticationConfigured: boolean;
  checkDatabase: () => Promise<unknown>;
}): Promise<ReadinessResult> {
  const configuration = input.databaseConfigured && input.authenticationConfigured ? "ok" : "missing";
  if (!input.databaseConfigured) return { application: "ok", configuration, database: "not_configured", ready: false };
  try {
    await input.checkDatabase();
  } catch {
    return { application: "ok", configuration, database: "unavailable", ready: false };
  }
  return { application: "ok", configuration, database: "ok", ready: configuration === "ok" };
}
