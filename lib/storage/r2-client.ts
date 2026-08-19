import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { getR2Config } from "./config-core";

declare global {
  // biome-ignore lint/style/noVar: This is for a global singleton pattern
  var r2Client: S3Client | undefined;
}

/**
 * Returns a cached, singleton instance of the S3Client configured for R2.
 * This prevents creating new clients on every request, especially during development hot-reloads.
 */
export function getR2Client(): S3Client {
  if (global.r2Client) {
    return global.r2Client;
  }

  const config = getR2Config();

  global.r2Client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return global.r2Client;
}