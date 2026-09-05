# Installing the app on your Android phone

The code lives on GitHub; a phone needs an **APK** (an Android package).
There are three ways to get one, from quickest to most permanent. All
three work with the code exactly as it is.

| Way                                  | Needs                                            | Good for                                         |
| ------------------------------------ | ------------------------------------------------ | ------------------------------------------------ |
| **1. GitHub Actions builds the APK** | A GitHub account (you have one)                  | Trying it today; sharing with a few colleagues   |
| **2. Expo Go**                       | Node on a computer, phone on the same Wi-Fi      | Live development: edit code, see it on the phone |
| **3. EAS Build / Play Store**        | A free Expo account; later a Google Play account | Pilot with members; the real release             |

---

## 1. Let GitHub build the APK (no computer setup)

The repository has a workflow, `.github/workflows/android-apk.yml`, that
builds an installable APK on GitHub's servers.

1. Open the repository on GitHub → **Actions** → **Android APK** (left-hand list).
2. Click **Run workflow**. Leave `api_mode` as `mock` for a first try — the
   app then runs against its built-in demo backend and needs no server. (For
   the real backend choose `live` and paste the web app's URL as `api_url`.)
3. Wait for the run to finish (about 10 minutes the first time).
4. Open the finished run, scroll to **Artifacts**, and download
   `albarakah-member-apk`. It is a zip containing one `.apk`.
5. Get the `.apk` onto the phone: email it to yourself, put it in Google
   Drive, or plug the phone in and copy it to Downloads.
6. On the phone, open the file. Android will ask to **allow installs from
   this source** the first time (Settings → Apps → Special access → Install
   unknown apps, or just follow the prompt). Allow it, then **Install**.
7. Open **Al Barakah**. In mock mode: "I'm already a member" with NIC
   `P1503881234567` and AB Number `AB0001`, code `123456`.

Pushing a tag that starts with `v` (for example `v0.1.0`) also runs this
workflow and attaches the APK to a **GitHub Release**, which gives you a
download link you can send to anyone.

**About the signing key.** An Android app must be signed. Without further
setup the workflow signs each build with a throwaway key, so to install a
newer build you first uninstall the older one. To make builds update in
place, generate one key and store it as repository secrets:

```bash
keytool -genkeypair -v -keystore albarakah.keystore -alias albarakah \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 albarakah.keystore   # the value for ANDROID_KEYSTORE_BASE64
```

Then in GitHub → Settings → Secrets and variables → Actions, add
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`
(`albarakah`) and `ANDROID_KEY_PASSWORD`. Keep the `.keystore` file safe:
the same key is needed for every future build, including the Play Store.

## 2. Expo Go, for live development

Install **Expo Go** from the Play Store. On a computer with Node 22:

```bash
git clone https://github.com/salmanmuddhoo/membership-MobileAPP
cd membership-MobileAPP
npm install
npm start
```

Scan the QR code the terminal shows with Expo Go (phone and computer on
the same Wi-Fi; if that is awkward, `npm start -- --tunnel`). Every edit
you save appears on the phone within a second. This runs the JavaScript
inside Expo Go rather than as its own app, so it is for development, not
for handing to a member.

## 3. EAS Build, then the Play Store

Expo's build service produces the same APK (or the `.aab` the Play Store
wants) from the cloud, with `eas.json` in the repository already describing
three profiles:

| Profile      | Produces      | Backend                                |
| ------------ | ------------- | -------------------------------------- |
| `preview`    | APK           | Built-in mock                          |
| `test`       | APK           | The test deployment of the web app     |
| `production` | AAB for Play  | Production                             |

```bash
npm install -g eas-cli
eas login                              # free account at expo.dev
eas build --platform android --profile preview
```

The command prints a link; when the build finishes, open it on the phone
and install. `eas build --profile test` does the same against the real
backend. When the app is ready for members, `--profile production` and
`eas submit` take it to a Google Play **internal testing** track (a
one-off Play Console registration, USD 25), which is the right way to put
it on many phones: no "unknown sources" prompt, updates arrive by
themselves.

## What to check on the phone

- **Mock build:** the welcome screen says "Demo mode" at the bottom.
- **Live build:** it does not, and linking sends a real code — the test
  environment needs `MEMBER_OTP_DELIVERY=log` (read the code from the
  server log) or `MEMBER_OTP_FIXED_CODE=123456` set, per
  `docs/member-app.md` in the web repository, until an SMS gateway is
  configured.

## If something does not install

- "App not installed": an older build with a different signing key is on
  the phone. Uninstall it first.
- The install prompt never appears: the file was opened inside an email
  or Drive preview. Download it to the phone first, then open it from the
  **Files** app.
- Build fails on GitHub with a Gradle error: open the run's log; the first
  red line names the cause. Re-running the job fixes a transient download
  failure.
