import {
  hasAttachedTenantProfile,
  type TenantProfileFacts,
} from "./role-publisher-policy";

export type SuperAdminProvisioningInput = {
  name: string;
  email: string;
  password: string;
};

export class SuperAdminProvisioningInputError extends Error {}
export class SuperAdminProvisioningConflictError extends Error {}

export type ExistingSuperAdminIdentity = TenantProfileFacts & {
  role: string;
  publisherId: string | null;
};

export type SuperAdminProvisioningDecision = "CREATE" | "UPDATE_CLEAN_SUPER_ADMIN";

export function decideSuperAdminProvisioning(
  existing: ExistingSuperAdminIdentity | null,
): SuperAdminProvisioningDecision {
  if (!existing) return "CREATE";

  if (
    existing.role !== "SUPER_ADMIN" ||
    existing.publisherId !== null ||
    hasAttachedTenantProfile(existing)
  ) {
    throw new SuperAdminProvisioningConflictError(
      "Super Admin provisioning cannot use an existing or malformed identity.",
    );
  }

  return "UPDATE_CLEAN_SUPER_ADMIN";
}

function requiredEnvironmentValue(
  environment: Readonly<Record<string, string | undefined>>,
  key: string,
) {
  const value = environment[key];
  if (!value) {
    throw new SuperAdminProvisioningInputError(`${key} is required.`);
  }
  return value;
}

export function normalizeSuperAdminName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeSuperAdminEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateSuperAdminPassword(password: string) {
  if (password.length < 12 || password.length > 128) {
    return "SUPER_ADMIN_PASSWORD must contain between 12 and 128 characters.";
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "SUPER_ADMIN_PASSWORD must include uppercase and lowercase letters.";
  }
  if (!/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "SUPER_ADMIN_PASSWORD must include a number and a special character.";
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    return "SUPER_ADMIN_PASSWORD must not exceed 72 UTF-8 bytes.";
  }
  return null;
}

export function parseSuperAdminProvisioningEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): SuperAdminProvisioningInput {
  const name = normalizeSuperAdminName(
    requiredEnvironmentValue(environment, "SUPER_ADMIN_NAME"),
  );
  const email = normalizeSuperAdminEmail(
    requiredEnvironmentValue(environment, "SUPER_ADMIN_EMAIL"),
  );
  const password = requiredEnvironmentValue(
    environment,
    "SUPER_ADMIN_PASSWORD",
  );

  if (name.length < 2 || name.length > 120) {
    throw new SuperAdminProvisioningInputError(
      "SUPER_ADMIN_NAME must contain between 2 and 120 characters.",
    );
  }
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new SuperAdminProvisioningInputError(
      "SUPER_ADMIN_EMAIL must be a valid email address.",
    );
  }
  const passwordError = validateSuperAdminPassword(password);
  if (passwordError) {
    throw new SuperAdminProvisioningInputError(passwordError);
  }

  return {
    name,
    email,
    password,
  };
}
