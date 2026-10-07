# Security

What the app does to protect a member, what the backend does, and what is
deliberately left to the Society. Written against the OWASP Mobile
Application Security Verification Standard (MASVS), level 1, which is what
a financial app on the Play Store is reviewed against in practice. "Nobody
can hack it" is not a claim any app can make; this is the list of what has
been done so that the known ways in are closed, and of what is still open.

## On the phone

| Concern                | What the app does                                                                                                                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Credentials at rest    | The session (access and refresh token) and the PIN record live in the platform keychain / keystore through SecureStore, never in a file. Nothing identifying is kept in AsyncStorage: it holds the hide-balances switch and unsaved form text only.                                |
| Sign-in                | NIC + AB Number name the member; a one-time code to the mobile on record proves the person; the session that results is the authentication. A pair that names nobody is refused, and the person is told to contact the office (see `docs/member-api.md`).                       |
| App lock               | A six-digit PIN after sign-in, asked on every cold start and after two minutes in the background. Weak PINs are refused. Five wrong PINs sign the phone out and revoke the session on the server; "forgotten" does the same. The lock is an overlay the back button cannot pass. |
| Transport              | Live builds refuse a plain-http origin at start (`src/api/index.ts`); Android `usesCleartextTraffic` is off; iOS App Transport Security is at its default. Every request carries the bearer token and nothing else identifying.                                                 |
| Screenshots            | While signed in, the screen cannot be captured or recorded (`expo-screen-capture`: Android `FLAG_SECURE`, iOS content hiding). The welcome and sign-in screens stay capturable so a person can send support a picture.                                                          |
| Backups                | Android `allowBackup` is off, so app data never leaves the phone in a device backup. The keychain was never backed up.                                                                                                                                                             |
| Rooted phones          | Checked at start (`expo-device`); a rooted or jailbroken phone gets a warning on the welcome and home screens. A warning, not a wall: the check is heuristic and a false alarm must not lock a member out.                                                                       |
| Code                   | Release builds are minified and shrunk (R8 / ProGuard through `expo-build-properties`). No secret is in the bundle: the only build-time values are the backend origin and the mode, which are public.                                                                            |
| Permissions            | Camera and photo access, for filing a document with an application, asked at the moment of use. Audio recording and legacy storage permissions, which the image picker would otherwise declare, are blocked.                                                                      |
| Links                  | The app opens only addresses the backend has validated as `https`, `mailto` or `tel`.                                                                                                                                                                                             |
| Updates                | Every build from GitHub signed with the repository's key installs over the last; a build signed with a throwaway key cannot (`docs/install-android.md`). Play App Signing holds the release key once the app is on the store.                                                     |

## On the server

Documented in the web application (`docs/member-app.md`): rate limits per
NIC, per AB Number and per address on sign-in; one code per AB Number per
cooldown window; codes that expire in five minutes, work once and burn
after five wrong tries; single-use refresh tokens, revoked on sign-out or
when the member is no longer entitled; an audit row for every link, refusal
and session; the staff search endpoints never reachable with a member
token; no information about the caller in any public endpoint.

## Still open

- **Certificate pinning.** Not done: it breaks the app whenever the
  certificate is rotated, which on Vercel is automatic. Revisit if the
  backend moves to a certificate the Society controls.
- **Play Integrity / device attestation.** Would let the server refuse
  requests from a tampered app or emulator. Needs a Google Cloud project
  bound to the Play listing; worth doing once the app is on the store.
- **Biometrics** as an alternative to the PIN (`expo-local-authentication`).
  Convenience, not a security gain over the PIN.
- **An independent penetration test** before public release. No list of
  measures replaces one.
