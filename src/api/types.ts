// The member-facing contract this app is built against: /api/v1/member/*.
//
// The web application's /api/v1 is a staff API — every endpoint carries a
// staff permission and is reached with the staff session cookie. Members
// have no account there, so this app talks to a member surface layered on
// the same framework (defineEndpoint, envelope, rate limit, audit) and
// authenticated with a bearer token instead of the cookie. The full
// contract, and what the backend has to add, is in docs/member-api.md.
//
// Types here mirror the web application's own where one exists
// (MembershipType, MembershipTypeField, FieldSubject in
// src/lib/config/reference.ts), so a field configured for the officer's
// form renders identically on the phone.

export type FieldSubject =
  | 'applicant'
  | 'nominee'
  | 'guardian'
  | 'beneficiary'
  | 'employment';

export type FieldDataType =
  | 'text'
  | 'number'
  | 'date'
  | 'email'
  | 'phone'
  | 'choice';

export interface MembershipTypeField {
  id: string;
  fieldKey: string;
  label: string;
  dataType: FieldDataType;
  choices: string[];
  subject: FieldSubject;
  isVisible: boolean;
  isMandatory: boolean;
  sortOrder: number;
}

export interface MembershipType {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  fields: MembershipTypeField[];
  nomineeCount: number;
  // What the applicant must file. Mirrors the checklist the officer sees.
  checklist: ChecklistItem[];
  fees: FeeComponent[];
}

export interface ChecklistItem {
  id: string;
  documentCode: string;
  documentName: string;
  subject: FieldSubject;
  requirement: 'required' | 'optional';
  tracksExpiry: boolean;
  sortOrder: number;
}

export interface FeeComponent {
  code: string;
  name: string;
  amount: string; // decimal string, never a number
  requirement: 'required' | 'optional' | 'not_applicable';
}

export interface Reference {
  membershipTypes: MembershipType[];
}

// ---------------------------------------------------------------------------
// Identity. Four different things, kept apart on purpose:
//
//   identification  NIC + AB Number name one active member (link-member)
//   verification    a one-time code proves the person holds that member's
//                   registered mobile (verify-otp)
//   authentication  the session that results, held on the device, is what
//                   every later request presents (Bearer accessToken)
//   memberId        the internal link from that session to the member row —
//                   server-side only, never sent to the phone
//
// NIC + AB Number on their own open nothing: the code goes to the number
// on record, which the person entering them does not get to choose.
// ---------------------------------------------------------------------------
export interface LinkMemberRequest {
  nic: string;
  // The Member No. printed on the card: AB followed by digits.
  abNumber: string;
}

export interface OtpChallenge {
  challengeId: string;
  // What the challenge will produce once the code is verified.
  purpose: 'link_member' | 'sign_up';
  // The number the code went to, masked (+2305xxx234), for a sign-up: the
  // person just typed it. Always null for a link: the server answers a
  // NIC + AB Number that names nobody exactly as one that does, so even a
  // masked number would give the game away.
  sentTo: string | null;
  expiresInSeconds: number;
}

export type IdentityKind = 'member' | 'customer' | 'applicant';

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  identity: {
    kind: IdentityKind;
    // Present for a member; a customer has accounts but no Member No.; an
    // applicant has neither yet. The internal memberId is deliberately not
    // here — the server resolves it from the session.
    memberNo: string | null;
    displayName: string;
    mobile: string;
    // When this device was linked to the member record.
    linkedAt: string;
  };
}

// ---------------------------------------------------------------------------
// The signed-in person
// ---------------------------------------------------------------------------
export interface PartyValues {
  subject: FieldSubject;
  ordinal: number;
  values: Record<string, string>;
}

export interface MemberProfile {
  kind: IdentityKind;
  memberNo: string | null;
  status: string;
  joinedAt: string | null;
  membershipType: { code: string; name: string } | null;
  parties: PartyValues[];
  // A change the member submitted that staff have not yet actioned.
  pendingUpdate: { id: string; submittedAt: string } | null;
  // The last change they sent, whatever became of it. A declined one
  // carries the reason staff wrote, which is the only way the member
  // learns why nothing changed.
  lastUpdate: {
    id: string;
    status: 'pending' | 'applied' | 'declined';
    submittedAt: string;
    decidedAt: string | null;
    comment: string | null;
  } | null;
}

export interface AccountSummary {
  id: string;
  accountNo: string;
  typeCode: string;
  typeName: string;
  category: string;
  status: string;
  openedAt: string;
  // Decimal string. Null when the ledger behind this account cannot state one.
  balance: string | null;
}

export interface AccountTransaction {
  id: string;
  occurredAt: string;
  direction: 'credit' | 'debit';
  amount: string;
  description: string;
  receiptNo: string | null;
}

export interface FiledDocument {
  id: string;
  documentCode: string;
  documentName: string;
  status: 'pending' | 'filed' | 'verified' | 'rejected';
  filedAt: string;
  expiresAt: string | null;
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------
export type ApplicationStatus =
  | 'draft'
  // Submitted from this app; with the branch, not yet in the chain.
  | 'received'
  | 'new'
  | 'submitted_for_review'
  | 'returned'
  | 'approved'
  | 'rejected';

export interface ApplicationTimelineEntry {
  at: string;
  label: string;
  comment: string | null;
}

export interface Application {
  id: string;
  reference: string;
  status: ApplicationStatus;
  membershipTypeCode: string;
  membershipTypeName: string;
  parties: PartyValues[];
  documents: ApplicationDocument[];
  submittedAt: string | null;
  decidedAt: string | null;
  updatedAt: string;
  timeline: ApplicationTimelineEntry[];
  // Why it was returned, when it was. Null otherwise.
  returnComment: string | null;
}

export interface ApplicationDocument {
  checklistItemId: string;
  documentCode: string;
  documentName: string;
  requirement: 'required' | 'optional';
  status: 'missing' | 'pending' | 'filed' | 'verified' | 'rejected';
  fileName: string | null;
  rejectionReason: string | null;
}

export interface UploadTicket {
  uploadId: string;
  // A scoped PUT URL; see docs/documents.md in the web repository. The
  // client sends the bytes there, then commits.
  uploadUrl: string;
  expiresAt: string;
  maxBytes: number;
  acceptedTypes: string[];
}

export interface ChangeRequest {
  id: string;
  status: 'pending' | 'applied' | 'declined';
  submittedAt: string;
}

// ---------------------------------------------------------------------------
// Envelope and errors — identical to the web application's (docs/api.md)
// ---------------------------------------------------------------------------
export type ErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'validation_failed'
  | 'conflict'
  | 'rate_limited'
  | 'internal_error';

export interface ApiFailure {
  error: {
    code: ErrorCode;
    message: string;
    correlationId: string;
    // Keyed `${subject}.${ordinal}.${fieldKey}` for party fields, or a plain
    // field name for anything else.
    details?: Record<string, string[]>;
  };
}

export interface ApiSuccess<T> {
  data: T;
  correlationId: string;
}
