# Two apps: test and production

The Society runs the web application twice: **test** on Vercel and
**production** on Azure (`docs/environments.md` in the `membership`
repository). The member app follows: one code base, two apps, each talking
only to its own backend.

| App                 | Name on the phone   | Package (Android)          | Talks to                                      | Who installs it                                 |
| ------------------- | ------------------- | -------------------------- | --------------------------------------------- | ----------------------------------------------- |
| **Test app**        | **Al Barakah Test** | `mu.albarakah.member.test` | the test site on Vercel (`TEST_API_URL`)      | the Society's staff, to try changes before members see them |
| **Members' app**    | **Al Barakah**      | `mu.albarakah.member`      | production on Azure (`PRODUCTION_API_URL`)    | members — from Google Play, or the APK          |

Because the packages differ, **both can be installed on the same phone**,
side by side. The test app has an orange icon background and says
**TEST** on its welcome screen and on every screen after sign-in; the
members' app has neither.

Which app a build is comes from one setting, `APP_VARIANT`
(`scripts/app-variants.js`, read by `app.config.js`): `test` — also the
default, so nothing built by accident carries the members' package — or
`production`.

## One-time setup

### 1. Tell GitHub the two addresses

GitHub → this repository → **Settings → Secrets and variables → Actions →
Variables** tab → **New repository variable**, twice:

| Variable             | Value                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TEST_API_URL`       | The test site's address on Vercel, e.g. `https://membership-ivory.vercel.app`. Optional: this is also the default.                                          |
| `PRODUCTION_API_URL` | The production site on Azure: `https://albarakah-app.com`. **Required.** |

`https://`, no path and no trailing slash. These are variables, not
secrets: an address is not confidential. The members' app is built against
`PRODUCTION_API_URL` and nothing else — the workflow refuses to build it
without one, with a typed override, or against the test site
(`scripts/choose-backend.sh`).

### 2. Push notifications for both apps

Firebase must know both packages; `docs/push-notifications.md`, "Setting
it up", has the steps. In short: add a second Android app,
`mu.albarakah.member.test`, to the Firebase project, download
`google-services.json` again (it then lists both apps), and replace the
**`GOOGLE_SERVICES_JSON`** secret with it. A build whose Firebase file does
not list its package still builds, without notifications, and its run
summary says what to add.

### 3. The production backend on Azure

The App Service needs the member app's own settings
(`docs/deployment-azure.md` in the `membership` repository, the settings
table):

- `MEMBER_SESSION_SECRET` — its own long random secret, never the test
  site's and never `AUTH_SESSION_SECRET`.
- `MEMBER_OTP_DELIVERY=http`, with `MEMBER_OTP_WEBHOOK_URL` (and
  `MEMBER_OTP_WEBHOOK_TOKEN`) for the SMS gateway. `log` and
  `MEMBER_OTP_FIXED_CODE` are refused in production.
- `NOTIFY_PUSH_DELIVERY=fcm` and `NOTIFY_PUSH_SERVICE_ACCOUNT` — the
  Firebase service-account key, as on Vercel.

Then, on the production site, switch on what the app may do at
**Configuration → Member app**, and mark the account members pay into at
**Configuration → Bank accounts** — production's own configuration, not
the test site's.

### 4. The signing key

The same signing-key secrets (`ANDROID_KEYSTORE_BASE64` and its three
passwords, `docs/install-android.md`) sign both apps. Keep them set: each
app then updates in place from one build to the next.

## Building

GitHub → **Actions → Android APK → Run workflow**, `app`:

- **`test`** — Al Barakah Test, against `TEST_API_URL`. `api_url` may name
  another test address for one run.
- **`production`** — Al Barakah, against `PRODUCTION_API_URL`. With the
  signing key set, the run also produces the `.aab` to upload to Google
  Play.
- **`demo`** — the test app with built-in demo data and no backend.

Pushing a version tag (`v0.2.0`) builds both apps and attaches both to the
release. The run's summary names the package, the backend and whether push
notifications are on.

## Phones that already have the app

Until now every build installed as `mu.albarakah.member` — the package the
**members' app** keeps. On a phone used for testing:

1. Install **Al Barakah Test** from a `test` build; it arrives as a new app
   beside the old one.
2. Uninstall the old **Al Barakah** if it was a test build. Otherwise the
   next members' build installs over it, and it then talks to production:
   the member is asked to link their membership again, against the
   production records.

Google Play only ever receives the members' app. The test app is shared as
an APK.
