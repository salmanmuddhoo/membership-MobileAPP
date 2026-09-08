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
      // A write with no body of its own still sends an empty JSON object.
      //
      // Submitting an application is the one call that had nothing to send —
      // the id is in the path — so it went out as a POST with no body and no
      // content-type, and it was the one call answered with a 403 while
      // every other POST, all of which carry a body, went through. A
      // bodyless POST is perfectly legal HTTP and this application accepts
      // it, but it is an unusual enough shape that layers in front of the
      // application (a WAF, a proxy, a platform's firewall rules) refuse it,
      // and none of them is reading our code to find out that the body would
      // have been ignored. Sending {} costs two bytes and makes every write
      // the same shape as every other.
      const writes = method === 'POST' || method === 'PUT' || method === 'PATCH';
      const body = options.body === undefined && writes ? {} : options.body;
      if (body !== undefined) {
        headers['content-type'] = 'application/json';
      }
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
