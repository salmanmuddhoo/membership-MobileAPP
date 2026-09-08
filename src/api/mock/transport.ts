// An in-memory backend implementing docs/member-api.md.
//
// It exists so the app can be run, demonstrated and tested before the
// member endpoints exist on the web application. It enforces the same rules
// the real one will — mandatory fields at submit, phone numbers in
// international form, a document per required checklist item — so a flow
// that works here should work there. Anything it does NOT enforce is called
// out in a comment.
//
// Link as the existing member with NIC P1503881234567 and AB Number AB0001
// (the code goes to their registered mobile, 5789 1234). Start an
// application with any mobile, e.g. 5999 0000. The one-time code is always
// 123456.
import { ApiError, type RequestOptions, type Transport } from '../client';
import { toInternational, PhoneFormatError } from '../../lib/phone';
import { missingFields } from '../../forms/validate';
import type {
  AccountSummary,
  AccountTransaction,
  Application,
  ApplicationDocument,
  ChangeRequest,
  FiledDocument,
  MemberProfile,
  MembershipType,
  PartyValues,
  Session,
} from '../types';
import { MEMBERSHIP_TYPES } from './reference';

const OTP = '123456';
const LATENCY_MS = 350;

interface Person {
  id: string;
  mobile: string;
  // Identification for linking: only a member has both.
  nic: string | null;
  displayName: string;
  profile: MemberProfile;
  accounts: AccountSummary[];
  transactions: Record<string, AccountTransaction[]>;
  documents: FiledDocument[];
}

interface Challenge {
  id: string;
  // The number the code went to. For link_member this is the member's
  // registered mobile; the person never typed it.
  mobile: string;
  purpose: 'link_member' | 'sign_up';
  // Set for link_member: the record NIC + AB Number identified.
  personId: string | null;
  attempts: number;
  createdAt: number;
}

interface Upload {
  id: string;
  applicationId: string;
  checklistItemId: string;
  fileName: string;
}

const iso = (d: Date) => d.toISOString();
const masked = (mobile: string) => `${mobile.slice(0, 5)}xxx${mobile.slice(-3)}`;
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));

function seedMember(): Person {
  return {
    id: 'person-ab0001',
    mobile: '+23057891234',
    nic: 'P1503881234567',
    displayName: 'Fatimah Peerally',
    profile: {
      kind: 'member',
      memberNo: 'AB0001',
      status: 'active',
      joinedAt: daysAgo(400),
      membershipType: { code: 'individual', name: 'Individual' },
      pendingUpdate: null,
      lastUpdate: null,
      parties: [
        {
          subject: 'applicant',
          ordinal: 1,
          values: {
            surname: 'Peerally',
            name: 'Fatimah',
            nic: 'P1503881234567',
            gender: 'Female',
            marital_status: 'Married',
            address: '12 Royal Road, Rose Hill',
            mobile: '+23057891234',
            email: 'fatimah@example.mu',
          },
        },
        {
          subject: 'employment',
          ordinal: 1,
          values: { employer_name: '', occupation: '', employment_status: '', monthly_income: '' },
        },
        {
          subject: 'nominee',
          ordinal: 1,
          values: {
            surname: 'Peerally',
            name: 'Ismail',
            nic: 'P1201791234567',
            address: '12 Royal Road, Rose Hill',
            mobile: '+23059876543',
          },
        },
      ],
    },
    accounts: [
      {
        id: 'acc-shares',
        accountNo: 'SH-000001',
        typeCode: 'shares',
        typeName: 'Shares',
        category: 'shares',
        status: 'active',
        openedAt: daysAgo(400),
        balance: '500.00',
      },
      {
        id: 'acc-msa',
        accountNo: 'MSA-000001',
        typeCode: 'msa',
        typeName: 'Multiplier Savings Account',
        category: 'savings',
        status: 'active',
        openedAt: daysAgo(400),
        balance: '5000.00',
      },
    ],
    transactions: {
      'acc-shares': [
        {
          id: 't1',
          occurredAt: daysAgo(400),
          direction: 'credit',
          amount: '500.00',
          description: 'Share capital on admission',
          receiptNo: 'RCT-2025-000014',
        },
      ],
      'acc-msa': [
        {
          id: 't2',
          occurredAt: daysAgo(400),
          direction: 'credit',
          amount: '5000.00',
          description: 'Opening deposit',
          receiptNo: 'RCT-2025-000014',
        },
      ],
    },
    documents: [
      {
        id: 'd1',
        documentCode: 'id_card',
        documentName: 'National identity card',
        status: 'verified',
        filedAt: daysAgo(401),
        expiresAt: null,
      },
      {
        id: 'd2',
        documentCode: 'utility_bill',
        documentName: 'Proof of address (utility bill)',
        status: 'verified',
        filedAt: daysAgo(401),
        expiresAt: daysAgo(-40),
      },
      {
        id: 'd3',
        documentCode: 'signed_form',
        documentName: 'Signed application form',
        status: 'verified',
        filedAt: daysAgo(399),
        expiresAt: null,
      },
    ],
  };
}

export function createMockTransport(): Transport {
  const people = new Map<string, Person>();
  const member = seedMember();
  people.set(member.mobile, member);

  const challenges = new Map<string, Challenge>();
  const sessions = new Map<string, string>(); // accessToken -> mobile
  const refreshTokens = new Map<string, string>(); // refreshToken -> mobile
  const applications = new Map<string, Application>();
  const applicantOf = new Map<string, string>(); // applicationId -> mobile
  const uploads = new Map<string, Upload>();
  const changeRequests: ChangeRequest[] = [];
  let sequence = 100;

  const nextId = (prefix: string) => `${prefix}-${++sequence}`;
  const reference = () => `APP-${new Date().getFullYear()}-${String(sequence).padStart(6, '0')}`;

  const fail = (code: ApiError['code'], message: string, details?: Record<string, string[]>) =>
    new ApiError(code, message, `mock::${Date.now().toString(36)}`, details ?? {}, null);

  function requireSession(options: RequestOptions): string {
    const subject = options.token ? sessions.get(options.token) : undefined;
    if (!subject) throw fail('unauthenticated', 'Sign in to continue.');
    return subject;
  }

  function personOrApplicant(mobile: string): Person {
    let person = people.get(mobile);
    if (person && person.profile.kind !== 'applicant') {
      // The number is on a member's record; a sign-up with it gets its own
      // applicant persona (see personForSubject), never the member.
      return personForSubject(`applicant:${mobile}`);
    }
    if (!person) {
      person = {
        id: nextId('person'),
        mobile,
        nic: null,
        displayName: 'Applicant',
        profile: {
          kind: 'applicant',
          memberNo: null,
          status: 'none',
          joinedAt: null,
          membershipType: null,
          parties: [],
          pendingUpdate: null,
          lastUpdate: null,
        },
        accounts: [],
        transactions: {},
        documents: [],
      };
      people.set(mobile, person);
    }
    return person;
  }

  // The identity a session carries is the person's — for a link_member
  // challenge, the member the NIC + AB Number named; for sign_up, an
  // applicant identified only by the verified mobile, even if that same
  // number is on some member's record. Member access comes only through
  // linking.
  function session(person: Person, asApplicant = false): Session {
    const accessToken = nextId('access');
    const refreshToken = nextId('refresh');
    sessions.set(accessToken, asApplicant ? `applicant:${person.mobile}` : person.mobile);
    refreshTokens.set(refreshToken, asApplicant ? `applicant:${person.mobile}` : person.mobile);
    const applicant = asApplicant || person.profile.kind === 'applicant';
    return {
      accessToken,
      refreshToken,
      expiresInSeconds: 3600,
      identity: {
        kind: applicant ? 'applicant' : person.profile.kind,
        memberNo: applicant ? null : person.profile.memberNo,
        displayName: applicant ? 'Applicant' : person.displayName,
        mobile: person.mobile,
        linkedAt: iso(new Date()),
      },
    };
  }

  // A session subject is either a member's mobile or `applicant:<mobile>`.
  // Both resolve to a Person; an applicant subject never resolves to a
  // member's record even when the mobile matches one.
  function personForSubject(subject: string): Person {
    if (subject.startsWith('applicant:')) {
      const mobile = subject.slice('applicant:'.length);
      const existing = people.get(mobile);
      if (existing && existing.profile.kind === 'applicant') return existing;
      // A member's number used to start an application: a separate
      // applicant persona, keyed so it never collides with the member.
      const key = `applicant:${mobile}`;
      let persona = people.get(key);
      if (!persona) {
        persona = {
          id: nextId('person'),
          mobile,
          nic: null,
          displayName: 'Applicant',
          profile: { kind: 'applicant', memberNo: null, status: 'none', joinedAt: null, membershipType: null, parties: [], pendingUpdate: null, lastUpdate: null },
          accounts: [],
          transactions: {},
          documents: [],
        };
        people.set(key, persona);
      }
      return persona;
    }
    return people.get(subject)!;
  }

  function typeByCode(code: string): MembershipType {
    const type = MEMBERSHIP_TYPES.find(t => t.code === code);
    if (!type) throw fail('not_found', 'Unknown membership type.');
    return type;
  }

  function emptyParties(type: MembershipType): PartyValues[] {
    const subjects = [...new Set(type.fields.map(f => f.subject))];
    const parties: PartyValues[] = [];
    for (const subject of subjects) {
      const count = subject === 'nominee' ? type.nomineeCount : 1;
      for (let ordinal = 1; ordinal <= count; ordinal++) {
        parties.push({ subject, ordinal, values: {} });
      }
    }
    return parties;
  }

  function emptyDocuments(type: MembershipType): ApplicationDocument[] {
    return type.checklist.map(item => ({
      checklistItemId: item.id,
      documentCode: item.documentCode,
      documentName: item.documentName,
      requirement: item.requirement,
      status: 'missing',
      fileName: null,
      rejectionReason: null,
    }));
  }

  function ownApplication(mobile: string, id: string): Application {
    const app = applications.get(id);
    if (!app || applicantOf.get(id) !== mobile) {
      throw fail('not_found', 'That application no longer exists.');
    }
    return app;
  }

  // Store phone fields in international form, refusing what cannot be
  // placed — the same rule as the web application's capture.
  function normalisePhones(type: MembershipType, parties: PartyValues[]) {
    const details: Record<string, string[]> = {};
    const out = parties.map(party => {
      const values = { ...party.values };
      for (const field of type.fields) {
        if (field.subject !== party.subject || field.dataType !== 'phone') continue;
        const raw = values[field.fieldKey];
        if (!raw || raw.trim() === '') continue;
        try {
          values[field.fieldKey] = toInternational(raw);
        } catch (e) {
          if (e instanceof PhoneFormatError) {
            details[`${party.subject}.${party.ordinal}.${field.fieldKey}`] = [e.message];
          } else throw e;
        }
      }
      return { ...party, values };
    });
    if (Object.keys(details).length > 0) {
      throw fail('validation_failed', 'Some details need attention.', details);
    }
    return out;
  }

  const routes: {
    method: string;
    pattern: RegExp;
    handle: (m: string[], body: any, options: RequestOptions) => unknown;
  }[] = [
    {
      method: 'GET',
      pattern: /^\/api\/v1\/member\/reference$/,
      handle: () => ({ membershipTypes: MEMBERSHIP_TYPES.filter(t => t.isActive) }),
    },
    {
      method: 'POST',
      pattern: /^\/api\/v1\/member\/auth\/link-member$/,
      handle: (_, body) => {
        const nic = String(body?.nic ?? '').trim().toUpperCase();
        const abNumber = String(body?.abNumber ?? '').trim().toUpperCase().replace(/\s+/g, '');
        const details: Record<string, string[]> = {};
        if (!/^[A-Z]\d{12}[A-Z0-9]$/.test(nic)) details.nic = ['Enter the NIC exactly as on the card, e.g. A0101801234567.'];
        if (!/^AB\d{4,}$/.test(abNumber)) details.abNumber = ['Enter the AB Number as on your card, e.g. AB0001.'];
        if (Object.keys(details).length > 0) {
          throw fail('validation_failed', 'Check the details.', details);
        }
        // The only lookup the mobile app gets: an exact pair, active members
        // only. Not the staff existing-member-search, which matches on a
        // fragment of a name.
        const person = [...people.values()].find(
          p => p.profile.kind === 'member' && p.profile.status === 'active' && p.nic === nic && p.profile.memberNo === abNumber
        );
        // The same answer whether the pair named someone or not: a miss
        // gets a challenge nothing can verify against, and no code. That is
        // what keeps the response from saying whether a NIC + AB Number
        // combination exists — the real backend does exactly this.
        const id = nextId('otp');
        challenges.set(id, {
          id,
          mobile: person?.mobile ?? '',
          purpose: 'link_member',
          personId: person?.id ?? null,
          attempts: 0,
          createdAt: Date.now(),
        });
        return { challengeId: id, purpose: 'link_member', sentTo: null, expiresInSeconds: 300 };
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/v1\/member\/auth\/sign-up$/,
      handle: (_, body) => {
        let mobile: string;
        try {
          mobile = toInternational(String(body?.mobile ?? ''));
        } catch (e) {
          throw fail('validation_failed', 'Check the mobile number.', { mobile: [(e as Error).message] });
        }
        // Always issued, whether or not the number is on some record: this
        // path only ever produces an applicant session.
        const id = nextId('otp');
        challenges.set(id, { id, mobile, purpose: 'sign_up', personId: null, attempts: 0, createdAt: Date.now() });
        return { challengeId: id, purpose: 'sign_up', sentTo: masked(mobile), expiresInSeconds: 300 };
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/v1\/member\/auth\/resend-otp$/,
      handle: (_, body) => {
        const previous = challenges.get(String(body?.challengeId ?? ''));
        if (!previous) throw fail('not_found', 'Start again.');
        const wait = Math.ceil((previous.createdAt + 30_000 - Date.now()) / 1000);
        if (wait > 0) throw fail('rate_limited', `Wait ${wait} seconds before requesting another code.`);
        challenges.delete(previous.id);
        const id = nextId('otp');
        challenges.set(id, { ...previous, id, attempts: 0, createdAt: Date.now() });
        return { challengeId: id, purpose: previous.purpose, sentTo: masked(previous.mobile), expiresInSeconds: 300 };
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/v1\/member\/auth\/verify-otp$/,
      handle: (_, body) => {
        const challenge = challenges.get(String(body?.challengeId ?? ''));
        if (!challenge || Date.now() - challenge.createdAt > 300_000) {
          throw fail('not_found', 'That code has expired. Request a new one.');
        }
        // A miss (no person behind a link challenge) never matches.
        const miss = challenge.purpose === 'link_member' && !challenge.personId;
        if (miss || String(body?.code ?? '') !== OTP) {
          challenge.attempts += 1;
          if (challenge.attempts >= 5) {
            challenges.delete(challenge.id);
            throw fail('not_found', 'Too many wrong codes. Start again.');
          }
          throw fail('validation_failed', 'That code is not right.', {
            code: ['Enter the 6-digit code that was sent to you.'],
          });
        }
        challenges.delete(challenge.id);
        if (challenge.purpose === 'link_member') {
          const person = [...people.values()].find(p => p.id === challenge.personId);
          if (!person) throw fail('not_found', 'That member record is no longer available.');
          // This is the link: the device's identity is now the member's.
          return session(person);
        }
        return session(personOrApplicant(challenge.mobile), true);
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/v1\/member\/auth\/refresh$/,
      handle: (_, body) => {
        const token = String(body?.refreshToken ?? '');
        const subject = refreshTokens.get(token);
        if (!subject) throw fail('unauthenticated', 'Sign in again.');
        // Rotated: the old one is dead the moment it is used.
        refreshTokens.delete(token);
        const person = personForSubject(subject);
        return session(person, subject.startsWith('applicant:'));
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/v1\/member\/auth\/logout$/,
      handle: (_, body, options) => {
        if (options.token) sessions.delete(options.token);
        if (body?.refreshToken) refreshTokens.delete(String(body.refreshToken));
        return { ok: true };
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/v1\/member\/me$/,
      handle: (_, __, options) => personForSubject(requireSession(options)).profile,
    },
    {
      method: 'PUT',
      pattern: /^\/api\/v1\/member\/me\/details$/,
      handle: (_, body, options) => {
        const person = personForSubject(requireSession(options));
        if (person.profile.kind !== 'member' || !person.profile.membershipType) {
          throw fail('forbidden', 'Only a member can update member details.');
        }
        if (person.profile.pendingUpdate) {
          throw fail(
            'conflict',
            'An update is already waiting for staff to verify it.'
          );
        }
        const type = typeByCode(person.profile.membershipType.code);
        const parties = normalisePhones(type, body?.parties ?? []);
        const missing = missingFields(type, parties);
        if (missing.length > 0) {
          throw fail(
            'validation_failed',
            'Some required details are missing.',
            Object.fromEntries(
              missing.map(m => [`${m.subject}.${m.ordinal}.${m.fieldKey}`, [`${m.label} is required.`]])
            )
          );
        }
        const request: ChangeRequest = {
          id: nextId('change'),
          status: 'pending',
          submittedAt: iso(new Date()),
        };
        changeRequests.push(request);
        // The record itself does not change until staff verify the request;
        // the profile only shows that one is pending. The mock applies the
        // values immediately after that so the demo shows the result.
        person.profile = {
          ...person.profile,
          parties,
          pendingUpdate: { id: request.id, submittedAt: request.submittedAt },
          lastUpdate: {
            id: request.id,
            status: 'pending',
            submittedAt: request.submittedAt,
            decidedAt: null,
            comment: null,
          },
        };
        return request;
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/v1\/member\/me\/accounts$/,
      handle: (_, __, options) => personForSubject(requireSession(options)).accounts,
    },
    {
      method: 'GET',
      pattern: /^\/api\/v1\/member\/me\/accounts\/([^/]+)\/transactions$/,
      handle: ([, id], __, options) => {
        const person = personForSubject(requireSession(options));
        if (!person.accounts.some(a => a.id === id)) {
          throw fail('not_found', 'No such account.');
        }
        return person.transactions[id] ?? [];
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/v1\/member\/me\/documents$/,
      handle: (_, __, options) => personForSubject(requireSession(options)).documents,
    },
    {
      method: 'GET',
      pattern: /^\/api\/v1\/member\/applications$/,
      handle: (_, __, options) => {
        const mobile = requireSession(options);
        return [...applications.values()]
          .filter(a => applicantOf.get(a.id) === mobile)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/v1\/member\/applications$/,
      handle: (_, body, options) => {
        const subject = requireSession(options);
        const mobile = personForSubject(subject).mobile;
        const type = typeByCode(String(body?.membershipTypeCode ?? ''));
        const open = [...applications.values()].find(
          a => applicantOf.get(a.id) === subject && !['approved', 'rejected'].includes(a.status)
        );
        if (open) {
          throw fail('conflict', `You already have an application in progress (${open.reference}).`);
        }
        const now = iso(new Date());
        const id = nextId('app');
        const app: Application = {
          id,
          reference: reference(),
          status: 'draft',
          membershipTypeCode: type.code,
          membershipTypeName: type.name,
          parties: emptyParties(type),
          documents: emptyDocuments(type),
          submittedAt: null,
          decidedAt: null,
          updatedAt: now,
          returnComment: null,
          timeline: [{ at: now, label: 'Started', comment: null }],
        };
        // Pre-fill the applicant's mobile: it is the number they signed in
        // with, and the number the real backend will already have verified.
        const applicant = app.parties.find(p => p.subject === 'applicant');
        if (applicant && type.fields.some(f => f.subject === 'applicant' && f.fieldKey === 'mobile')) {
          applicant.values.mobile = mobile;
        }
        applications.set(id, app);
        applicantOf.set(id, subject);
        return app;
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/v1\/member\/applications\/([^/]+)$/,
      handle: ([, id], __, options) => ownApplication(requireSession(options), id),
    },
    {
      method: 'DELETE',
      pattern: /^\/api\/v1\/member\/applications\/([^/]+)$/,
      handle: ([, id], __, options) => {
        const app = ownApplication(requireSession(options), id);
        if (app.status !== 'draft') {
          throw fail('conflict', 'Only a draft can be deleted.');
        }
        applications.delete(id);
        return { ok: true };
      },
    },
    {
      method: 'PUT',
      pattern: /^\/api\/v1\/member\/applications\/([^/]+)\/parties$/,
      handle: ([, id], body, options) => {
        const app = ownApplication(requireSession(options), id);
        if (!['draft', 'returned'].includes(app.status)) {
          throw fail('conflict', 'This application has been submitted and can no longer be changed.');
        }
        const type = typeByCode(app.membershipTypeCode);
        // A draft save keeps whatever was typed — phones are checked at
        // submit, so a half-typed number never blocks saving (S-302).
        const incoming: PartyValues[] = body?.parties ?? [];
        app.parties = app.parties.map(existing => {
          const match = incoming.find(
            p => p.subject === existing.subject && p.ordinal === existing.ordinal
          );
          if (!match) return existing;
          const allowed = new Set(
            type.fields.filter(f => f.subject === existing.subject).map(f => f.fieldKey)
          );
          const values: Record<string, string> = {};
          for (const [k, v] of Object.entries(match.values ?? {})) {
            if (allowed.has(k)) values[k] = String(v ?? '');
          }
          return { ...existing, values };
        });
        app.updatedAt = iso(new Date());
        return app;
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/v1\/member\/applications\/([^/]+)\/documents\/begin-upload$/,
      handle: ([, id], body, options) => {
        const app = ownApplication(requireSession(options), id);
        const doc = app.documents.find(d => d.checklistItemId === body?.checklistItemId);
        if (!doc) throw fail('not_found', 'That document is not on this checklist.');
        const size = Number(body?.sizeBytes ?? 0);
        if (size > 25 * 1024 * 1024) {
          throw fail('validation_failed', 'That file is too large. The limit is 25 MB.', {
            sizeBytes: ['Up to 25 MB.'],
          });
        }
        const accepted = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
        if (!accepted.includes(String(body?.contentType ?? ''))) {
          throw fail('validation_failed', 'Use a photo (JPEG, PNG, HEIC) or a PDF.', {
            contentType: ['JPEG, PNG, HEIC or PDF.'],
          });
        }
        const uploadId = nextId('upload');
        uploads.set(uploadId, {
          id: uploadId,
          applicationId: id,
          checklistItemId: doc.checklistItemId,
          fileName: String(body?.fileName ?? 'document'),
        });
        doc.status = 'pending';
        return {
          uploadId,
          uploadUrl: `mock://upload/${uploadId}`,
          expiresAt: iso(new Date(Date.now() + 3_600_000)),
          maxBytes: 25 * 1024 * 1024,
          acceptedTypes: accepted,
        };
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/v1\/member\/applications\/([^/]+)\/documents\/commit-upload$/,
      handle: ([, id], body, options) => {
        const app = ownApplication(requireSession(options), id);
        const upload = uploads.get(String(body?.uploadId ?? ''));
        if (!upload || upload.applicationId !== id) {
          throw fail('not_found', 'That upload was not started here.');
        }
        const doc = app.documents.find(d => d.checklistItemId === upload.checklistItemId)!;
        doc.status = 'filed';
        doc.fileName = upload.fileName;
        doc.rejectionReason = null;
        uploads.delete(upload.id);
        app.updatedAt = iso(new Date());
        return app;
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/v1\/member\/applications\/([^/]+)\/submit$/,
      handle: ([, id], __, options) => {
        const app = ownApplication(requireSession(options), id);
        if (!['draft', 'returned'].includes(app.status)) {
          throw fail('conflict', 'This application has already been submitted.');
        }
        const type = typeByCode(app.membershipTypeCode);
        const parties = normalisePhones(type, app.parties);
        const details: Record<string, string[]> = {};
        for (const m of missingFields(type, parties)) {
          details[`${m.subject}.${m.ordinal}.${m.fieldKey}`] = [`${m.label} is required.`];
        }
        for (const doc of app.documents) {
          if (doc.requirement === 'required' && !['filed', 'verified'].includes(doc.status)) {
            details[`document.${doc.documentCode}`] = [`${doc.documentName} is required.`];
          }
        }
        if (Object.keys(details).length > 0) {
          throw fail('validation_failed', 'Some details are missing.', details);
        }
        const now = iso(new Date());
        app.parties = parties;
        app.status = 'received';
        app.submittedAt = now;
        app.updatedAt = now;
        app.returnComment = null;
        app.timeline.push({ at: now, label: 'Submitted', comment: null });
        return app;
      },
    },
  ];

  return {
    async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
      await new Promise(r => setTimeout(r, LATENCY_MS));
      const method = options.method ?? 'GET';
      const url = path.split('?')[0];
      for (const route of routes) {
        const m = url.match(route.pattern);
        if (m && route.method === method) {
          // Deep-copy so a screen never mutates the "database".
          return JSON.parse(JSON.stringify(route.handle(m, options.body, options))) as T;
        }
      }
      throw fail('not_found', `No such endpoint: ${method} ${url}`);
    },
  };
}
