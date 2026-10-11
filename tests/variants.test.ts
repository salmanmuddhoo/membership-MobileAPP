// The two apps: their own package, name, icon and scheme, and nothing built
// by accident carries the members' package.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { VARIANTS, variant, variantName } = require('../scripts/app-variants.js');

test('the test app and the members\' app install side by side', () => {
  assert.equal(VARIANTS.production.package, 'mu.albarakah.member');
  assert.equal(VARIANTS.test.package, 'mu.albarakah.member.test');
  assert.notEqual(VARIANTS.test.name, VARIANTS.production.name);
  assert.notEqual(VARIANTS.test.scheme, VARIANTS.production.scheme);
  assert.notEqual(VARIANTS.test.iconBackground, VARIANTS.production.iconBackground);
  for (const v of Object.values(VARIANTS) as { iconBackground: string }[]) {
    assert.ok(existsSync(new URL(`../${v.iconBackground.replace('./', '')}`, import.meta.url)), v.iconBackground);
  }
});

test('unset is the test app; only "production" is the members\' app; anything else is refused', () => {
  assert.equal(variantName(undefined), 'test');
  assert.equal(variantName(''), 'test');
  assert.equal(variant('production').package, 'mu.albarakah.member');
  assert.equal(variant('test').id, 'test');
  assert.throws(() => variantName('prod'), /APP_VARIANT must be "test" or "production"/);
});

test('app.config.js gives each app its own name, package and identity', () => {
  const config = require('../app.json').expo;
  const build = require('../app.config.js');
  const saved = process.env.APP_VARIANT;
  try {
    process.env.APP_VARIANT = 'production';
    const prod = build({ config });
    assert.equal(prod.name, 'Al Barakah');
    assert.equal(prod.android.package, 'mu.albarakah.member');
    assert.equal(prod.ios.bundleIdentifier, 'mu.albarakah.member');
    assert.equal(prod.extra.appVariant, 'production');
    process.env.APP_VARIANT = 'test';
    const testApp = build({ config });
    assert.equal(testApp.name, 'Al Barakah Test');
    assert.equal(testApp.android.package, 'mu.albarakah.member.test');
    assert.equal(testApp.extra.appVariant, 'test');
  } finally {
    if (saved === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = saved;
  }
});
