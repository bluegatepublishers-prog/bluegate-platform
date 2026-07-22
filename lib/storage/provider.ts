import "server-only";
import { R2StorageProvider } from "./r2";
import { StorageProvider } from "./types";

let provider: StorageProvider | undefined;

/**
 * Returns the currently configured storage provider instance.
 * This acts as a singleton factory to ensure a single instance is used.
 */
export function getStorageProvider(): StorageProvider {
  if (provider) {
    return provider;
  }

  // Currently, R2 is the only provider. This can be extended in the future.
  provider = new R2StorageProvider();
  return provider;
}