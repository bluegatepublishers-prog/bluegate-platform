import "server-only";
// Re-export from pure module for server-side use
export { getR2Config, _resetR2ConfigForTest, type R2Config } from "./config-core";