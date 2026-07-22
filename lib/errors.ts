export type AppErrorCode =
  // Storage Errors
  | "STORAGE_CONFIGURATION_ERROR"
  | "INVALID_OBJECT_KEY"
  | "INVALID_STORAGE_REQUEST"
  | "OBJECT_NOT_FOUND"
  | "STORAGE_ACCESS_DENIED"
  | "STORAGE_PROVIDER_ERROR"
  | "STORAGE_NETWORK_ERROR"
  // Generic Errors
  | "UNKNOWN_ERROR";

export interface AppErrorOptions {
  code: AppErrorCode;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly context?: Record<string, unknown>;

  constructor({ code, message, cause, context }: AppErrorOptions) {
    super(message, { cause });
    this.name = "AppError";
    this.code = code;
    this.context = context;
  }
}