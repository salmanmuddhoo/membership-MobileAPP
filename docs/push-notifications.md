# Push notifications

The app tells the member when money moves on their accounts — a deposit
posted, a withdrawal paid out, a transfer completed — and when there is
something new on the home screen: a new partner outlet, a new promotion.
The wording is the Society's to edit on the web application
(Configuration → Notification wording), like its emails and WhatsApp
messages; the app only decides which screen a tap opens.

## How it works

1. On every start with a session, the app asks Android for permission
   (once), obtains the phone's **Firebase device token** and sends it to
   the backend (`POST /api/v1/member/me/devices`). The token can only
   receive; the backend ties it to the session, so signing out — or a
   branch revoking a lost phone — silences the phone.
2. The backend sends through **Firebase Cloud Messaging**, as a service
   account of the same Firebase project. One notification row per event
   on its side; one message per phone.
3. A notification carries the event code as data. The app maps it to a
   screen (`src/lib/push.ts`): money that moved opens **Accounts**; a
   request refused (`deposit.rejected`, `withdrawal.rejected`,
   `transfer.rejected`) opens **Transact**, where the request and the
   officer's reason are; news opens **Home**; anything it does not know
   opens Home. A notification that
   arrives while the app is open refreshes the data it is about, so the
   balance is right by the time the member looks.
4. A minor with no phone of their own is told through their guardian's:
   the backend sends the push about the minor's money to the guardian's
   phones, so a guardian who asked for a deposit or withdrawal for the
   minor hears the outcome.

`src/push/PushRegistration.tsx` does all of this; it is mounted only with
a session.

## Setting it up

Push needs a Firebase project, shared by the app and the backend. Free;
no Expo account is involved. There are two apps (`docs/environments.md`),
each its own package, and Firebase must know both:
`mu.albarakah.member.test` (Al Barakah Test, the test site on Vercel) and
`mu.albarakah.member` (Al Barakah, production on Azure).

1. [console.firebase.google.com](https://console.firebase.google.com) →
   **Add project** (e.g. "Al Barakah member app"). Analytics can be off.
2. In the project, **Add app → Android** twice: package name
   `mu.albarakah.member`, then again with `mu.albarakah.member.test`.
   Download **google-services.json** after adding the second: one file
   then lists both apps.
3. In this repository: GitHub → Settings → Secrets and variables →
   Actions → secret **`GOOGLE_SERVICES_JSON`** with the file's contents
   (pasted as is, or base64-encoded). The next build picks it up: the
   workflow writes the file before `expo prebuild` if it names that
   build's package (`scripts/firebase-config.sh`), and the run summary
   says "Push notifications: on". The file is never committed
   (`.gitignore`). For a local build, put it at the repository root.
4. On the backend, both environments: **Project settings → Service
   accounts → Generate new private key**, and set
   `NOTIFY_PUSH_DELIVERY=fcm` with `NOTIFY_PUSH_SERVICE_ACCOUNT=<the key
   file as one line of JSON, or base64>` — on the Vercel **test**
   environment and on the **Azure** App Service alike
   (`docs/notifications.md`, "Push, to the member app", and
   `docs/deployment-azure.md` in that repository). Each backend only ever
   writes to the phones signed in to it, so one key serves both.

**Keeping test and production fully apart** is also possible: a second
Firebase project for the test app alone. Then set
**`GOOGLE_SERVICES_JSON_TEST`** and **`GOOGLE_SERVICES_JSON_PRODUCTION`**
(each project's own file) instead of the shared secret — each build takes
its own, falling back to `GOOGLE_SERVICES_JSON` — and give Vercel the
test project's service-account key and Azure the production one's.

Then, on the web application, **Notifications → Send test** to a push
wording with a member's AB Number sends to every phone that member has
signed in on.

A build without the secret still builds and runs; it just receives no
notifications, and the registration fails quietly. iOS would additionally
need an APNs key uploaded to the Firebase project; the app is Android
first.

## What a phone shows

By default, as a bank's app does: the title and a line on the lock screen
("Deposit received — Rs 500.00 has been deposited to SA-1 · Savings.
Balance: Rs 1,500.00."). The wording is editable on the web application
if the Society prefers to say less; Android's own settings let the member
hide notification content on the lock screen. Nothing but the rendered
title and text, the event code and the record's id reaches the phone.

Notifications arrive on Android's `default` channel, created by the app at
importance "max" so a deposit is heard. The notification icon is the
emblem's silhouette (`assets/notification-icon.png`) on the Society's
green.
