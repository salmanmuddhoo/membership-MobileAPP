// Unwrapping the envelope, and the three different failures that used to
// arrive wearing the same sentence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpTransport, ApiError } from '../src/api/client.ts';

function transportReturning(
  status: number,
  body: string,
  headers: Record<string, string> = {}
) {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(body, {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    })) as typeof fetch;
  return {
    transport: createHttpTransport('https://example.test'),
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

test('a success envelope yields its data', async () => {
  const { transport, restore } = transportReturning(
    200,
    JSON.stringify({ data: { id: 'a1' }, correlationId: 'c1' })
  );
  try {
    assert.deepEqual(await transport.request('/thing'), { id: 'a1' });
  } finally {
    restore();
  }
});

test('an error envelope keeps its code, message, details and correlation id', async () => {
  const { transport, restore } = transportReturning(
    422,
    JSON.stringify({
      error: {
        code: 'validation_failed',
        message: 'Some details are missing.',
        correlationId: 'c2',
        details: { 'applicant.1.nic': ['NIC is required.'] },
      },
    })
  );
  try {
    await transport.request('/thing');
    assert.fail('should have thrown');
  } catch (e) {
    assert.ok(e instanceof ApiError);
    assert.equal(e.code, 'validation_failed');
    assert.equal(e.correlationId, 'c2');
    assert.deepEqual(e.details, { 'applicant.1.nic': ['NIC is required.'] });
    assert.equal(e.userMessage, 'Some details are missing. (ref c2)');
  }
});

test("the server's own internal_error arrives in the server's words", async () => {
  // A defect in a handler. It comes back as a proper envelope, so it keeps
  // its wording and its correlation id, and the person can quote the id.
  const { transport, restore } = transportReturning(
    500,
    JSON.stringify({
      error: {
        code: 'internal_error',
        message: 'Something went wrong. Please try again.',
        correlationId: 'c3',
      },
    })
  );
  try {
    await transport.request('/thing');
    assert.fail('should have thrown');
  } catch (e) {
    assert.ok(e instanceof ApiError);
    assert.equal(e.message, 'Something went wrong. Please try again.');
    assert.equal(e.userMessage, 'Something went wrong. Please try again. (ref c3)');
  }
});

test('a reply that is not the envelope says so, and is not confused with the above', async () => {
  // A gateway page, a timeout, anything that never reached a handler's
  // answer. This used to carry the same sentence as the case above, which
  // made the screen no help in telling a broken handler from a request
  // that never got to one.
  const { transport, restore } = transportReturning(
    504,
    '<html>Gateway Timeout</html>',
    { 'content-type': 'text/html', 'x-correlation-id': 'c4' }
  );
  try {
    await transport.request('/thing');
    assert.fail('should have thrown');
  } catch (e) {
    assert.ok(e instanceof ApiError);
    assert.equal(e.status, 504);
    assert.match(e.message, /could not be read \(HTTP 504\)/);
    assert.notEqual(e.message, 'Something went wrong. Please try again.');
    assert.equal(e.correlationId, 'c4');
  } finally {
    restore();
  }
});

test('an unreachable server is a network error, not a server error', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new TypeError('Network request failed');
  }) as typeof fetch;
  const transport = createHttpTransport('https://example.test');
  try {
    await transport.request('/thing');
    assert.fail('should have thrown');
  } catch (e) {
    assert.ok(e instanceof ApiError);
    assert.equal(e.code, 'network');
    assert.match(e.message, /Check your connection/);
  } finally {
    globalThis.fetch = original;
  }
});

test('every write declares application/json, body or no body', async () => {
  // Astro's origin check refuses any method outside GET/HEAD/OPTIONS with
  // 403 when the request carries no content-type and no matching Origin —
  // and a native app has no Origin to send. Submitting an application and
  // deleting a draft were the only calls with nothing to send, so the only
  // ones that omitted the header, and exactly the two answered 403.
  const seen: { method?: string; headers?: HeadersInit; body?: unknown }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    seen.push({ method: init.method, headers: init.headers, body: init.body });
    return new Response(JSON.stringify({ data: { ok: true }, correlationId: 'c' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  const transport = createHttpTransport('https://example.test');
  const typeOf = (i: number) =>
    (seen[i].headers as Record<string, string>)['content-type'];
  try {
    // POST with nothing to send: the type is declared and {} goes with it.
    await transport.request('/applications/a1/submit', { method: 'POST' });
    assert.equal(typeOf(0), 'application/json');
    assert.equal(seen[0].body, '{}');

    // DELETE with nothing to send: the type alone is what satisfies the
    // check, and a body is not invented for a method whose body is widely
    // stripped in transit.
    await transport.request('/applications/a1', { method: 'DELETE' });
    assert.equal(typeOf(1), 'application/json');
    assert.equal(seen[1].body, undefined);

    // A body that was given is untouched.
    await transport.request('/auth/link-member', {
      method: 'POST',
      body: { nic: 'B123' },
    });
    assert.equal(seen[2].body, JSON.stringify({ nic: 'B123' }));
    assert.equal(typeOf(2), 'application/json');

    // PUT with nothing to send behaves like POST.
    await transport.request('/applications/a1/parties', { method: 'PUT' });
    assert.equal(typeOf(3), 'application/json');
    assert.equal(seen[3].body, '{}');

    // A read sends nothing and claims no content type: the origin check
    // never applies to it, and declaring one would be a lie.
    await transport.request('/me');
    assert.equal(seen[4].body, undefined);
    assert.equal(typeOf(4), undefined);
  } finally {
    globalThis.fetch = original;
  }
});
