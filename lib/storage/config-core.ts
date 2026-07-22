import { AppError } from "../errors";

export type R2Config = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  publicBaseUrl?: string;
};

let r2Config: R2Config | undefined;

/** @internal For test isolation only. */
export function _resetR2ConfigForTest() {
  r2Config = undefined;
}

/**
 * Lazily loads and validates the R2 configuration from environment variables.
 * Throws a typed error if configuration is missing or invalid.
 * This function is for server-side use only.
 */
export function getR2Config(): R2Config {
  if (r2Config) {
    return r2Config;
  }

  const config: Partial<R2Config> = {
    accountId: process.env.R2_ACCOUNT_ID?.trim(),
    bucketName: process.env.R2_BUCKET_NAME?.trim(),
    accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim(),
    endpoint: process.env.R2_ENDPOINT?.trim(),
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.trim(),
  };

  const required: (keyof R2Config)[] = ["accountId", "bucketName", "accessKeyId", "secretAccessKey", "endpoint"];
  for (const key of required) {
    if (!config[key]) {
      throw new AppError({
        code: "STORAGE_CONFIGURATION_ERROR",
        message: `Missing required R2 environment variable: R2_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`
      });
    }
  }

  try {
    const endpointUrl = new URL(config.endpoint!);
    if (endpointUrl.protocol !== "https:") throw new Error("Endpoint must use HTTPS.");
    if (endpointUrl.username || endpointUrl.password || endpointUrl.search || endpointUrl.hash) {
      throw new Error("Endpoint must not contain user credentials, query parameters, or fragments.");
    }
    if (!endpointUrl.hostname.endsWith(".r2.cloudflarestorage.com")) {
      throw new Error("Endpoint hostname is not a valid Cloudflare R2 endpoint.");
    }
    if (!endpointUrl.hostname.startsWith(`${config.accountId!}.`)) {
      throw new Error("Endpoint account ID does not match R2_ACCOUNT_ID.");
    }
  } catch (error) {
    throw new AppError({
      code: "STORAGE_CONFIGURATION_ERROR",
      message: "Invalid R2_ENDPOINT. It must be a valid HTTPS URL.",
      cause: error,
    });
  }

  if (config.publicBaseUrl) {
    try {
      const publicUrl = new URL(config.publicBaseUrl);
      if (publicUrl.protocol !== "https:") throw new Error("Public base URL must use HTTPS.");
    } catch (error) {
      throw new AppError({ code: "STORAGE_CONFIGURATION_ERROR", message: "Invalid R2_PUBLIC_BASE_URL.", cause: error });
    }
  }

  r2Config = config as R2Config;
  return r2Config;
}