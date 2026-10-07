# Getting on to Google Play

What the Play Console asks for, and where each answer comes from. Done in
this order, a first review usually passes.

## Before the first upload

1. **A Play Console developer account** for the Society (one-off fee),
   with the Society as the organisation, not a person.
2. **A signing key**, kept by GitHub: the four `ANDROID_*` secrets in
   `docs/install-android.md`. Every build from then on is signed with it,
   installs over the last, and is what Play will know as the upload key.
   Opt in to **Play App Signing** when creating the app: Google then holds
   the release key and the GitHub key is only the upload key, which can be
   reset if lost.
3. **A privacy policy at a public URL.** Play requires one for any app that
   handles personal or financial data. `docs/privacy-policy.md` is the
   text; publish it on the Society's website (or the web application) and
   paste the address into the listing. It must stay reachable.
4. **The listing assets**: the app icon (`assets/icon.png`, 512 × 512 for
   the store), a feature graphic (1024 × 500) and at least two phone
   screenshots. `docs/screenshots/` has screenshots; take new ones from the
   current build.

## Each upload

- Upload the **`.aab`**, not the `.apk`. The Android workflow produces one
  beside the APK whenever the repository's key is set; it is in the
  `albarakah-member-apk` artifact and attached to tagged releases.
- Each upload must carry a **higher `versionCode`** than the last.
  `app.config.js` takes it from the workflow's run number, so a later
  build is always a later version. Bump the human-readable `version` in
  `app.json` when the Society wants a new version number shown.
- Build it **live**, with the production origin: run the workflow with
  `api_mode: live` and `api_url` set to the production web application.
  A mock build must never go to the store.

## The forms

| Form                        | Answer                                                                                                                                                                                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App category                | Finance.                                                                                                                                                                                                                                                                                                       |
| Content rating              | Everyone; no user-generated content, no ads beyond the Society's own cards.                                                                                                                                                                                                                                    |
| Target audience             | Adults (18+). Minors' accounts are shown to their guardian, not to minors.                                                                                                                                                                                                                                     |
| Financial features          | Declare: the app shows account balances and transactions of a co-operative society; it does not move money today (the Transact menu is "coming"). Update the declaration when deposits, withdrawals or transfers go live.                                                                                      |
| Data safety — collected     | Name, NIC, mobile number, date of birth and the other details on the membership form (personal info); financial info (balances, transactions); photos (only when the person attaches a document to an application). All encrypted in transit; the member can ask for deletion by contacting the Society.       |
| Data safety — shared        | None with third parties. Vercel hosts the backend as a processor; Google (Firebase Cloud Messaging) carries push notifications — a device token and the notification text, no account data.                                                                                                                 |
| Data safety — security      | Data encrypted in transit (https); a way to request deletion (the office); no data sold.                                                                                                                                                                                                                       |
| Permissions                 | Camera and photos: "to photograph a document for a membership application"; notifications (Android 13+ asks at first start), "to tell you when money moves on your accounts". Nothing else is declared (`app.json` blocks audio and legacy storage).                                                           |
| Login for the reviewer      | Play's reviewer needs to get in. Give them a test member's NIC and AB Number on a test environment where `MEMBER_OTP_FIXED_CODE` is set, with that code, in the "App access" instructions. Never production credentials.                                                                                        |
| Ads                         | "No": the cards on the home screen are the Society's own promotions, not an ad network.                                                                                                                                                                                                                        |

## What a reviewer looks for and the app already does

- Minimal permissions, each asked at the moment of use with a reason.
- No cleartext traffic; no secrets in the bundle.
- A privacy policy link in the listing (step 3 above).
- Edge-to-edge and the Android 15+ target that Expo SDK 57 builds with.
- An app that opens to something useful without an account: the welcome
  screen explains what the app is for and how to join.
