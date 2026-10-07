// Which backend the app talks to, decided once from the environment.
//
//   EXPO_PUBLIC_API_URL   the web application's origin, e.g. https://test.albarakah.mu
//   EXPO_PUBLIC_API_MODE  "live" or "mock"; defaults to mock when no URL is set
//
// EXPO_PUBLIC_ variables are inlined at build time (they are not secrets —
// nothing here is; the token lives in SecureStore, not in the environment).
import { createHttpTransport, type Transport } from './client';
import { memberApi } from './member';
import { createMockTransport } from './mock/transport';

const url = process.env.EXPO_PUBLIC_API_URL ?? '';
const mode = process.env.EXPO_PUBLIC_API_MODE ?? (url ? 'live' : 'mock');

export const API_MODE: 'live' | 'mock' = mode === 'live' && url ? 'live' : 'mock';

// A session token must never travel in clear. A live build pointed at a
// plain-http origin is a misconfiguration, and it fails here, at start,
// rather than quietly on a phone. A developer's own machine is the one
// exception, and only in a development build.
if (API_MODE === 'live' && !/^https:\/\//i.test(url)) {
  const local = /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?(\/|$)/i.test(url);
  if (!(__DEV__ && local)) {
    throw new Error(`EXPO_PUBLIC_API_URL must be an https:// origin, not "${url}".`);
  }
}

const transport: Transport =
  API_MODE === 'live' ? createHttpTransport(url) : createMockTransport();

export const api = memberApi(transport);
export { ApiError } from './client';
export * from './types';
