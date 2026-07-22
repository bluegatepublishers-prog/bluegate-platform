// Mock the 'server-only' module before tests run
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require.cache['server-only'] = { exports: {} };