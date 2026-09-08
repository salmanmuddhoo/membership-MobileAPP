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
