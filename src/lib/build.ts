// Which build this is, in the person's hands.
//
// The APK is signed with a throwaway key unless the signing secrets are set
// (docs/install-android.md), and Android will not replace an app with one
// signed by a different key. On some phones that refusal is loud ("App not
// installed"); on others the install appears to do nothing and the old
// version keeps running — and then every fix in the new build looks like it
// did not work, which is indistinguishable from the fix being wrong.
//
// So say which build is running, where someone about to test can see it
// without having to be asked. Nothing here imports Expo or React Native, so
// the formatting is testable on its own; the screen supplies the version.

/**
 * The commit the workflow built from, shortened to the seven characters the
 * APK's own filename carries, so the two can be compared by eye. Empty for
 * a local run, which is itself the answer.
 */
export function shortRef(sha: string | undefined): string {
  return (sha ?? '').trim().slice(0, 7);
}

export const BUILD_REF = shortRef(process.env.EXPO_PUBLIC_BUILD);

// Which of the two apps this is (scripts/app-variants.js): the test app,
// against the test site, or the members' app, against production. Anything
// but an explicit "production" is the test app, as the build has it.
export type AppVariant = 'test' | 'production';

export function appVariantOf(value: unknown): AppVariant {
  return value === 'production' ? 'production' : 'test';
}

/**
 * `0.1.0 · live · 6efd424`, or `0.1.0 · mock · dev` from a local run; the
 * test app says so first, `Test app · 0.1.0 · live · 6efd424`.
 */
export function formatBuild(
  version: string,
  mode: string,
  ref: string = BUILD_REF,
  variant: AppVariant = 'production'
): string {
  const parts = [version || '0.0.0', mode, ref || 'dev'];
  return (variant === 'test' ? ['Test app', ...parts] : parts).join(' · ');
}
