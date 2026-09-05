# The member API — `/api/v1/member`

What the mobile app calls, and what the web application has to add to serve
it. The web application's `/api/v1` today is a **staff** API: every endpoint
carries a staff permission and is reached with the staff session cookie
(`ab_session`). Members have no account there. So the mobile app needs a
member-facing surface — built with the same `defineEndpoint`, the same
envelope, the same rate limit and audit trail (`docs/api.md` in that
repository names this phase, AD-03, as the reason `/api/v1` is a versioned
contract at all) — but with its own identity and its own scope: **a member
reads and writes their own record, and nothing else.**

The machine-readable version is [`member-api.openapi.json`](member-api.openapi.json).
The app's TypeScript types are `src/api/types.ts`; the mock backend that
implements this contract in memory is `src/api/mock/transport.ts` and is
the fastest way to see every rule below exercised (`npm test`).

## Identity

Four different things, kept apart because conflating them is how a phone
app ends up letting a card number open an account:

| Concern | What it is | Where it happens |
| --- | --- | --- |
| **Identification / linking** | NIC + AB Number name exactly one active member | `POST /auth/link-member` |
| **Verification** | A one-time code proves the person holds the mobile on that member's record | `POST /auth/verify-otp` |
| **Authentication** | The session that results — access token + refresh token held in the device keychain — is what every later request presents | `Authorization: Bearer` on everything else; `POST /auth/refresh` |
| **memberId** | The internal link from that session to the `member` row | `member_session.member_id`, server-side only; never sent to the phone |

**NIC + AB Number alone open nothing.** They select whose registered mobile
the code goes to. The person typing them does not get to choose that
number, cannot see it unmasked, and cannot change it from the app — a
member whose number has changed goes to a branch with their ID. So a lost
card, a NIC seen on a form, or both together, get an attacker exactly as
far as the SMS they will not receive.

**AB Number.** The Member No. printed on the card, `AB` followed by digits
(`member.member_no`, allocated by `next_member_number()`). The business
also calls it the Shares Account Number; the app labels the field "AB
Number (Shares Account No.)" for that reason. If the two ever differ —
the shares account has its own `account_no` — matching is on
`member.member_no` and the label should be revisited, not the rule.

### Linking an existing member

| Step | Endpoint | Rules |
| --- | --- | --- |
| 1 | `POST /auth/link-member` `{ nic, abNumber }` | Exact match, both together, against the applicant party's `nic` on the member's founding application (or the imported record for M7 legacy members) and `member.member_no`; `member.status = 'active'` only. 422 if either is malformed (`details.nic`, `details.abNumber`). **404 if the pair does not name one active member** — one message for "no such NIC", "no such AB Number" and "not together", so the response never says which half was right. Returns an `OtpChallenge` with `purpose: 'link_member'` and the registered mobile **masked** (`+2305xxx234`). Audit: `member.link.requested`, with the NIC hashed, never stored plain in the log. |
| 2 | `POST /auth/verify-otp` `{ challengeId, code }` | Five wrong codes burn the challenge (404 from then on); expiry five minutes. On success: a `member_session` row with `member_id` set, and a `Session` whose `identity.kind` is `member`. Audit: `member.link.completed`. |
| 3 | `POST /auth/refresh` `{ refreshToken }` | New pair; the old refresh token is dead the moment it is used. Refresh tokens live 90 days from last use, so a phone that opens the app now and then never re-links; one left in a drawer for a season does. |
| 4 | `POST /auth/logout` `{ refreshToken }` | Revokes the session. The device must link again — NIC + AB Number + code — to get back in. A branch can do the same for a member who lost their phone by revoking every `member_session` for that `member_id`. |
| — | `POST /auth/resend-otp` `{ challengeId }` | New code, same purpose, same masked number; the previous code is dead. Counts against the same rate limit as the request that started it. |

This is **not** the staff `GET /api/v1/applications/existing-member-search`.
That endpoint matches a fragment of a name, NIC or Member No. against every
active member and returns names — right for an officer with
`application.capture`, and exactly what a public endpoint must never do.
`link-member` is a separate endpoint on the member surface: exact pair
only, no search, no names in the response, rate-limited per NIC, per AB
Number and per IP, and the staff endpoint stays behind its staff permission
where a member token cannot reach it.

### A new applicant

Someone applying has no AB Number, and must not need one.

| Step | Endpoint | Rules |
| --- | --- | --- |
| 1 | `POST /auth/sign-up` `{ mobile }` | Any form `toInternational` accepts. **Always 200 for a well-formed number**, whether or not it is on some record — the response must not reveal who is a member. Returns an `OtpChallenge` with `purpose: 'sign_up'`. |
| 2 | `POST /auth/verify-otp` | On success a `member_session` with `member_id` **null** and `identity.kind: 'applicant'`. That session can start, save and submit an application and read its own applications — nothing else. **It never resolves to a member record, even when the verified mobile is the one on a member's file**: member access comes only through linking. That is what makes step 1 safe to answer 200 for everyone. |

The verified mobile becomes the applicant's `mobile` on the application,
pre-filled and read-only in the app: the backend has already proved they
hold it, staff have a confirmed number to call, and M9's notifications
have a destination before anything is approved. The NIC is captured on
the application form like every other field, and checked by staff against
the ID card they file.

An existing member who chooses "Become a member" by mistake gets an
applicant session and an empty Home telling them to link instead; nothing
about their membership is shown or implied.

**Why not Entra External ID?** It is the right long-term answer if the
Society wants one identity across a future member portal, financing
applications and the app, and it gives password reset, MFA and account
recovery for free. It is also a second tenant to operate, a consumer
sign-up flow to brand, and a mapping from Entra subject to member row that
the link flow gets from NIC + AB Number. The endpoints above do not change
if `verify-otp` later becomes an OIDC callback; the app changes one screen.

### What the phone holds

`Session` — `accessToken` (short-lived, ~1 h), `refreshToken` (rotated on
use, revocable), and `identity { kind, memberNo, displayName, mobile,
linkedAt }`. It is stored in SecureStore (keychain / keystore), never in
plain storage, and cleared on sign-out or when a refresh is refused. The
NIC and AB Number are never stored on the device; the internal `memberId`
is never sent to it.

## Tables the web application needs

```sql
-- migration 00xx_member_identity.sql
-- One code, one purpose. For link_member the mobile is the member's
-- registered one and member_id is already known; for sign_up it is the
-- number the applicant typed and member_id is null.
create table member_login_challenge (
    id            uuid primary key default gen_random_uuid(),
    purpose       text not null check (purpose in ('link_member', 'sign_up')),
    mobile        text not null,               -- E.164
    member_id     uuid references member(id),  -- set for link_member
    code_hash     text not null,               -- never the code
    attempts      int  not null default 0,
    expires_at    timestamptz not null,
    consumed_at   timestamptz,
    created_at    timestamptz not null default now(),
    constraint member_login_challenge_purpose_agrees_with_member
        check ((purpose = 'link_member') = (member_id is not null))
);

-- The authenticated mobile identity. member_id is the link to the member
-- record (null for an applicant); it is resolved server-side on every
-- request and never returned to the phone.
create table member_session (
    id                 uuid primary key default gen_random_uuid(),
    mobile             text not null,          -- verified, E.164
    member_id          uuid references member(id),
    customer_id        uuid references customer(id),
    refresh_token_hash text not null unique,
    linked_at          timestamptz not null default now(),
    last_used_at       timestamptz not null default now(),
    expires_at         timestamptz not null,   -- 90 days from last_used_at
    revoked_at         timestamptz,
    device_label       text
);
create index member_session_member_idx on member_session (member_id) where revoked_at is null;

-- A member's own capture of their details: verified by staff before it
-- touches member/application_party.
create table member_details_request (
    id            uuid primary key default gen_random_uuid(),
    member_id     uuid not null references member(id),
    parties       jsonb not null,              -- same shape as application_party values
    status        text not null default 'pending'
                  check (status in ('pending', 'applied', 'declined')),
    submitted_at  timestamptz not null default now(),
    decided_at    timestamptz,
    decided_by    uuid references app_user(id),
    comment       text
);

-- Which application a member session started, so a member can only see
-- their own. captured_by stays not null: a system app_user 'member-app'
-- captures on the applicant's behalf, and the audit trail says so.
alter table membership_application
    add column applicant_mobile text;          -- E.164; set for app-started rows
create index membership_application_applicant_mobile_idx
    on membership_application (applicant_mobile) where applicant_mobile is not null;
```

Migrations are applied by the pipeline, never by hand, and never edited
once on `main` — the web repository's `CLAUDE.md` is explicit.

## Endpoints

All under `/api/v1/member`. Every response is the standard envelope; every
error is one of the standard codes. Where a rule below says "422", the
`details` object carries one entry per problem, keyed
`subject.ordinal.fieldKey` for party fields and `document.<code>` for a
missing document — the app folds these onto the fields by that key.

### Public

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/reference` | `{ membershipTypes: MembershipType[] }` — active types only, each with its `fields` (exactly as `GET /api/v1/config/reference` serves them), `nomineeCount`, its applicant-facing `checklist` (the membership type's `checklist_id`, minus `signed_form` — that is a branch step) and the current `fees` from its fee schedule. No workflows, no account types, no admin detail. |

### The signed-in person (`caller: 'member'`)

| Method | Path | Returns / rules |
| --- | --- | --- |
| GET | `/me` | `MemberProfile`: `kind`, `memberNo`, `status`, `joinedAt`, `membershipType`, `parties` (the approved application's `application_party` rows, or the imported record's equivalent for M7 legacy members), `pendingUpdate` (the open `member_details_request`, if any). An `applicant` gets `kind: 'applicant'` and empty parties. |
| PUT | `/me/details` `{ parties }` | Creates a `member_details_request`. 422 on a mandatory field left blank or a phone that cannot be placed (`toInternational`); 409 if one is already pending; 403 for a non-member. The applicant's `mobile` is ignored if it differs from the session's — the registered number changes at a branch. Audit: `member.details.requested`. |
| GET | `/me/accounts` | `AccountSummary[]` for `member_id` (or `customer_id`). `balance` is a decimal string, **null until the ledger exists** — today `transactionsForAccount` knows only the opening payment and any refund, so the balance is that sum, or null if the business would rather show nothing than a partial figure. |
| GET | `/me/accounts/{id}/transactions` | `AccountTransaction[]`, oldest first, from `transactionsForAccount`. 404 unless the account belongs to the caller. |
| GET | `/me/documents` | `FiledDocument[]` from `documentsForMember`: name, status, filed date, expiry. No download URL — `view-url` stays staff-only until a member-facing viewer is decided. |

### Applications (`caller: 'member'`)

| Method | Path | Rules |
| --- | --- | --- |
| GET | `/applications` | The caller's own: `applicant_mobile = session.mobile`, plus (for a member) any application whose `existing_member_id` is theirs. Each with `parties`, `documents` (checklist status per item), `timeline` (from `applications/timeline.ts`, member-safe labels only — no officer names) and `returnComment` when status is `returned`. |
| POST | `/applications` `{ membershipTypeCode }` | `startApplication` as the `member-app` system user with `applicant_mobile` set; pre-fills the applicant's `mobile`. 409 if the caller already has one not yet decided. 404 for an unknown or inactive type. |
| GET | `/applications/{id}` | 404 unless it is the caller's. |
| PUT | `/applications/{id}/parties` `{ parties }` | `saveDraft` — accepts anything typed, checks nothing but ownership and that the field keys exist on the type (S-302: a draft save must never fail on content). 409 unless status is `draft` or `returned`. |
| DELETE | `/applications/{id}` | `deleteDraftApplication`. Draft only, 409 otherwise. |
| POST | `/applications/{id}/documents/begin-upload` `{ checklistItemId, fileName, sizeBytes, contentType }` | Same broker as staff `begin-upload` (`docs/documents.md`): type and size checked first, folder created, scoped Graph upload URL returned as `UploadTicket`. The app PUTs the bytes there. |
| POST | `/applications/{id}/documents/commit-upload` `{ uploadId }` | Same as staff `commit-upload`; only the session that began it may commit. Returns the application with the checklist updated. |
| POST | `/applications/{id}/submit` | `submitApplication`: 422 naming every mandatory field left blank, every phone that cannot be placed and every required document not filed — all of them in one response, not the first. On success the status is `new` and it enters the regional review queue exactly as an officer-captured one does. |

### What a member never gets

Officer names, other members, `view-url`, guardian or existing-member
search (the Minor form takes the guardian's Member No. typed; the server
validates it at submit the way `S-605` already does), payments, receipts,
configuration beyond `/reference`. If a screen in the app seems to need one
of these, the screen is wrong.

## Why a change request rather than an edit

A member's details are what KYC verified. Letting the record change from a
phone with no officer in the loop would put unverified data behind a
verified stamp; letting nothing change would leave a member who moved house
unable to say so. The request sits in between: the member says what
changed, staff check it against a document where one is needed (a new
utility bill for a new address) and apply it, and the audit trail shows
both halves. On the Members page this is one more queue —
"Details updates awaiting verification" — with Apply and Decline, which
is a small addition to the web application and outside this repository.

## Rate limits and abuse

- `link-member`: 5 per NIC and per AB Number per hour, 20 per IP per hour,
  counted whether or not the pair matched. This is the endpoint an
  attacker with a stolen card would hit.
- `sign-up`: 3 per number per 10 minutes, 20 per IP per hour, regardless
  of whether the number is known. SMS costs money and the endpoint is public.
- `verify-otp`: 5 attempts per challenge, then it is dead.
- Everything else inherits the existing fixed-window limiter, keyed on the
  session rather than the staff user.
- Access tokens are short so a lost phone is a bounded problem; refresh
  tokens are revocable from the member's row so a branch can sign a phone
  out.

## Sequence, if it is built in this order

1. `member_login_challenge`, `member_session`, `link-member` / `verify-otp`
   / `refresh` / `logout`, a member principal and `caller: 'member'` in
   `defineEndpoint`, `/reference` and `/me`. The app's Home and My details
   work against test data.
2. `/me/accounts`, `/transactions`, `/me/documents`. The member area is
   complete.
3. `sign-up`, `applicant_mobile`, the `member-app` system user, the
   application endpoints. Sign-up works end to end, into the existing
   workflow.
4. `member_details_request`, `PUT /me/details`, the verification queue on
   the Members page.
5. Push or WhatsApp notification when an application's status changes
   (M9), deep-linking `albarakah://applications/<id>`.
