// Which build is running, said where someone testing can see it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortRef, formatBuild } from '../src/lib/build.ts';

test('the commit is shortened to what the APK filename carries', () => {
  // The workflow names the artifact albarakah-member-<mode>-<sha:7>.apk, so
  // seven characters is what makes the screen and the download comparable
  // by eye — which is the whole point of showing it.
  assert.equal(shortRef('6efd42409506c50c5eeb05c9d015ed7c42665fe9'), '6efd424');
  assert.equal(shortRef('  6efd424  '), '6efd424');
  assert.equal(shortRef(undefined), '');
  assert.equal(shortRef(''), '');
});

test('a built app names its version, mode and commit', () => {
  assert.equal(formatBuild('0.1.0', 'live', '6efd424'), '0.1.0 · live · 6efd424');
});

test('a local run says so rather than pretending to be a build', () => {
  assert.equal(formatBuild('0.1.0', 'mock', ''), '0.1.0 · mock · dev');
  // A version Expo could not read is not passed off as a real one.
  assert.equal(formatBuild('', 'mock', ''), '0.0.0 · mock · dev');
});
