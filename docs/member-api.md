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

Sign-in is a one-time code to the mobile number on record. That number is
already stored in E.164 for the WhatsApp notifications of M9, so it is the
one thing every member record reliably has and every member has in hand.

| Step | Endpoint | Notes |
| --- | --- | --- |
| 1 | `POST /auth/request-otp` `{ mobile, purpose }` | `mobile` in any form the web app's `toInternational` accepts. `purpose` is `sign_in` or `sign_up`. Returns `{ challengeId, sentTo (masked), expiresInSeconds }`. **Always returns 200 for a well-formed number**, whether or not a record exists — the response must not reveal who is a member. Rate-limit per number and per IP, hard. |
| 2 | `POST /auth/verify-otp` `{ challengeId, code }` | Returns a `Session`: `accessToken` (short-lived, ~1h), `refreshToken` (long-lived, rotated on use, revocable), and `identity { kind, memberNo, displayName, mobile }`. `kind` is `member` (a `member` row whose applicant party carries this mobile), `customer` (a non-member customer, migration 0027), or `applicant` (nobody yet — the sign-up path). Five wrong codes burn the challenge. |
| 3 | `POST /auth/refresh` `{ refreshToken }` | New pair; the old refresh token is dead. |
| 4 | `POST /auth/logout` | Revokes the refresh token. |

Every other endpoint takes `Authorization: Bearer <accessToken>`. The
principal it resolves to is a **member principal**, a different thing from
the staff `Principal` in `src/lib/access/principal.ts`: it has no
permissions, only an identity — one `member.id`, or one `customer.id`, or
one verified mobile with neither. `defineEndpoint` gains a `caller:
'member'` option (alongside `permission`) so a staff endpoint can never be
reached with a member token and vice versa, and the OpenAPI generator tags
the surface separately.

**Why not Entra External ID?** It is the right long-term answer if the
Society wants one identity across a future member portal, financing
applications and the app, and it gives password reset, MFA and account
recovery for free. It is also a second tenant to operate, a consumer
sign-up flow to brand, and a mapping from Entra subject to member row that
the OTP flow gets for free from the phone number. The endpoints above do
not change if the exchange behind `verify-otp` becomes an OIDC callback
later; the app changes one screen.

**Sign-up identity.** A person with no record verifies their number the
same way and gets an `applicant` session. That number becomes the
applicant's `mobile` on the application, pre-filled and read-only in the
app: the backend has already proved they hold it. It also gives the officer
a verified number to call back on, and the workflow's M9 notifications a
destination, before anything is approved.

## Tables the web application needs

```sql
-- migration 00xx_member_identity.sql
create table member_login_challenge (
    id            uuid primary key default gen_random_uuid(),
    mobile        text not null,               -- E.164
    purpose       text not null check (purpose in ('sign_in', 'sign_up')),
    code_hash     text not null,               -- never the code
    attempts      int  not null default 0,
    expires_at    timestamptz not null,
    consumed_at   timestamptz,
    created_at    timestamptz not null default now()
);

create table member_session (
    id                 uuid primary key default gen_random_uuid(),
    mobile             text not null,
    member_id          uuid references member(id),
    customer_id        uuid references customer(id),
    refresh_token_hash text not null unique,
    issued_at          timestamptz not null default now(),
    expires_at         timestamptz not null,
    revoked_at         timestamptz,
    device_label       text
);

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
| PUT | `/me/details` `{ parties }` | Creates a `member_details_request`. 422 on a mandatory field left blank or a phone that cannot be placed (`toInternational`); 409 if one is already pending; 403 for a non-member. The applicant's `mobile` is ignored if it differs from the session's — the sign-in number changes at a branch. Audit: `member.details.requested`. |
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

- `request-otp`: 3 per number per 10 minutes, 20 per IP per hour, regardless
  of whether the number is known. SMS costs money and the endpoint is public.
- `verify-otp`: 5 attempts per challenge, then it is dead.
- Everything else inherits the existing fixed-window limiter, keyed on the
  session rather than the staff user.
- Access tokens are short so a lost phone is a bounded problem; refresh
  tokens are revocable from the member's row so a branch can sign a phone
  out.

## Sequence, if it is built in this order

1. `member_login_challenge`, `member_session`, the two auth endpoints, a
   member principal and `caller: 'member'` in `defineEndpoint`, `/reference`
   and `/me`. The app's Home and My details work against test data.
2. `/me/accounts`, `/transactions`, `/me/documents`. The member area is
   complete.
3. `applicant_mobile`, the `member-app` system user, the application
   endpoints. Sign-up works end to end, into the existing workflow.
4. `member_details_request`, `PUT /me/details`, the verification queue on
   the Members page.
5. Push or WhatsApp notification when an application's status changes
   (M9), deep-linking `albarakah://applications/<id>`.
