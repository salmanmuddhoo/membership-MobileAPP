import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barsFor } from '../src/lib/barcode.ts';

test('the placeholder barcode is stable and never blank', () => {
  const a = barsFor('AB0001');
  assert.deepEqual(a, barsFor('AB0001'));
  assert.notDeepEqual(a, barsFor('AB0002'));
  assert.equal(a.length, 3 + 'AB0001'.length * 8 + 3);
  assert.ok(a.every(w => w >= 1 && w <= 4));
});
