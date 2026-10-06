import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoriesOf, categoryLabel, discountLabel } from '../src/lib/outlets.ts';
import type { Outlet } from '../src/api/types.ts';

const outlet = (category: string): Outlet => ({
  id: category,
  name: category,
  logoUrl: 'https://x/l.png',
  category,
  discountPercent: '5',
  description: '',
  address: null,
  linkUrl: null,
});

test('categories are offered by how common they are, then by name', () => {
  const list = [outlet('food'), outlet('education'), outlet('food'), outlet('groceries')];
  assert.deepEqual(categoriesOf(list), ['food', 'education', 'groceries']);
  assert.deepEqual(categoriesOf([]), []);
});

test('labels read as a person would write them', () => {
  assert.equal(categoryLabel('education'), 'Education');
  assert.equal(categoryLabel('home & garden'), 'Home & garden');
  assert.equal(categoryLabel('  '), 'Other');
  assert.equal(discountLabel('10'), '10% off');
  assert.equal(discountLabel('12.50'), '12.5% off');
  assert.equal(discountLabel('7.00'), '7% off');
});
