// The one way this app reaches the API.
//
// Every response is the same envelope (docs/api.md in the web repository):
// `{ data, correlationId }` or `{ error: { code, message, correlationId } }`.
// This unwraps it, so a caller sees the payload or an ApiError — never a raw
// Response — and the correlation id is always kept so a person can quote it.
import type { ApiFailure, ApiSuccess, ErrorCode } from './types';

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode | 'network',
    message: string,
    readonly correlationId: string | null = null,
    readonly details: Record<string, string[]> = {},
    readonly status: number | null = null
  ) {
    super(message);
    this.name = 'ApiError';
  }

  // The message written for the person, plus the id support will ask for.
  get userMessage(): string {
    return this.correlationId
      ? `${this.message} (ref ${this.correlationId})`
      : this.message;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

export interface Transport {
  request<T>(path: string, options?: RequestOptions): Promise<T>;
}

const NETWORK_MESSAGE =
  'Could not reach Al Barakah. Check your connection and try again.';

export function createHttpTransport(baseUrl: string): Transport {
  const root = baseUrl.replace(/\/+$/, '');
  return {
    async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
      const headers: Record<string, string> = { accept: 'application/json' };
      const method = options.method ?? 'GET';

      // Every write declares application/json, body or no body.
      //
      // Astro's origin check (security.checkOrigin, on by default; see
      // astro/dist/core/app/origin-check.js) refuses any method outside
      // GET/HEAD/OPTIONS with 403 "Cross-site POST form submissions are
      // forbidden" when the request carries no content-type at all and no
      // Origin header matching the site. A request that DOES declare a
      // content-type is only refused if that type is form-like
      // (x-www-form-urlencoded, multipart/form-data, text/plain).
      //
      // A native app sends no Origin — there is no browsing context to send
      // one from — so the deciding factor is entirely the content-type.
      // Submitting an application and deleting a draft were the only two
      // calls with nothing to send, so they were the only two that omitted
      // it, and they were exactly the two that came back 403 while every
      // other write went through. Reproduced against a local server with
      // nothing in front of it, which is what rules out a proxy or a
      // platform firewall.
      //
      // Declaring the type is enough on its own; DELETE needs no body to go
      // with it, and inventing one for a method whose body is widely
      // stripped in transit would be asking for a different problem.
      const writes = !['GET', 'HEAD', 'OPTIONS'].includes(method);
      const body =
        options.body === undefined && ['POST', 'PUT', 'PATCH'].includes(method)
          ? {}
          : options.body;
      if (writes) headers['content-type'] = 'application/json';
      if (options.token) headers.authorization = `Bearer ${options.token}`;

      let response: Response;
      try {
        response = await fetch(`${root}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: options.signal,
        });
      } catch {
        throw new ApiError('network', NETWORK_MESSAGE);
      }

      const correlationId = response.headers.get('x-correlation-id');
      let parsed: ApiSuccess<T> | ApiFailure | null = null;
      try {
        parsed = (await response.json()) as ApiSuccess<T> | ApiFailure;
      } catch {
        parsed = null;
      }

      if (parsed && 'error' in parsed) {
        const { error } = parsed;
        throw new ApiError(
          error.code,
          error.message,
          error.correlationId ?? correlationId,
          error.details ?? {},
          response.status
        );
      }
      if (!response.ok || !parsed || !('data' in parsed)) {
        // Not the envelope: a gateway page, a timeout, a body that is not
        // JSON. Deliberately worded differently from the server's own
        // internal_error ("Something went wrong. Please try again."), which
        // arrives as a parsed envelope through the branch above. The two
        // are different failures — one is a defect in a handler, the other
        // never reached a handler's answer — and giving them the same
        // sentence makes the screen no help at all in telling them apart.
        throw new ApiError(
          'internal_error',
          `The server's answer could not be read (HTTP ${response.status}).`,
          correlationId,
          {},
          response.status
        );
      }
      return parsed.data;
    },
  };
}
