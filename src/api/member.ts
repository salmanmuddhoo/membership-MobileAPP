// Typed calls for the member surface. One function per endpoint; the path
// strings here are the contract in docs/member-api.md.
import type { RequestOptions, Transport } from './client';
import type {
  AccountSummary,
  AccountTransaction,
  Application,
  ChangeRequest,
  FiledDocument,
  LinkMemberRequest,
  MemberProfile,
  OtpChallenge,
  PartyValues,
  Reference,
  Session,
  UploadTicket,
} from './types';

const base = '/api/v1/member';

export function memberApi(transport: Transport) {
  const call = <T>(path: string, options?: RequestOptions) =>
    transport.request<T>(`${base}${path}`, options);

  return {
    // --- public -----------------------------------------------------------
    reference: () => call<Reference>('/reference'),

    // Existing member: NIC + AB Number identify them; the code goes to the
    // mobile on their record, whatever they typed.
    linkMember: (input: LinkMemberRequest) =>
      call<OtpChallenge>('/auth/link-member', { method: 'POST', body: input }),

    // New applicant: no AB Number yet. The code goes to the number they
    // give, which becomes the verified mobile on their application. This
    // never yields member access, whoever the number belongs to.
    startSignUp: (mobile: string) =>
      call<OtpChallenge>('/auth/sign-up', { method: 'POST', body: { mobile } }),

    // Resend the code for a challenge already issued, either kind.
    resendOtp: (challengeId: string) =>
      call<OtpChallenge>('/auth/resend-otp', { method: 'POST', body: { challengeId } }),

    verifyOtp: (challengeId: string, code: string) =>
      call<Session>('/auth/verify-otp', {
        method: 'POST',
        body: { challengeId, code },
      }),

    refresh: (refreshToken: string) =>
      call<Session>('/auth/refresh', { method: 'POST', body: { refreshToken } }),

    // --- signed in ---------------------------------------------------------
    // Revokes the refresh token too: after this the device must link again.
    logout: (token: string, refreshToken: string) =>
      call<{ ok: true }>('/auth/logout', { method: 'POST', body: { refreshToken }, token }),

    me: (token: string) => call<MemberProfile>('/me', { token }),

    // The member's own capture of their details. Staff verify it before it
    // changes the record, so this returns a change request, not the profile.
    submitDetails: (token: string, parties: PartyValues[]) =>
      call<ChangeRequest>('/me/details', {
        method: 'PUT',
        body: { parties },
        token,
      }),

    accounts: (token: string) => call<AccountSummary[]>('/me/accounts', { token }),

    transactions: (token: string, accountId: string) =>
      call<AccountTransaction[]>(
        `/me/accounts/${encodeURIComponent(accountId)}/transactions`,
        { token }
      ),

    documents: (token: string) => call<FiledDocument[]>('/me/documents', { token }),

    // --- applications ----------------------------------------------------
    applications: (token: string) => call<Application[]>('/applications', { token }),

    application: (token: string, id: string) =>
      call<Application>(`/applications/${encodeURIComponent(id)}`, { token }),

    startApplication: (token: string, membershipTypeCode: string) =>
      call<Application>('/applications', {
        method: 'POST',
        body: { membershipTypeCode },
        token,
      }),

    saveDraft: (token: string, id: string, parties: PartyValues[]) =>
      call<Application>(`/applications/${encodeURIComponent(id)}/parties`, {
        method: 'PUT',
        body: { parties },
        token,
      }),

    beginUpload: (
      token: string,
      id: string,
      input: { checklistItemId: string; fileName: string; sizeBytes: number; contentType: string }
    ) =>
      call<UploadTicket>(
        `/applications/${encodeURIComponent(id)}/documents/begin-upload`,
        { method: 'POST', body: input, token }
      ),

    commitUpload: (token: string, id: string, uploadId: string) =>
      call<Application>(
        `/applications/${encodeURIComponent(id)}/documents/commit-upload`,
        { method: 'POST', body: { uploadId }, token }
      ),

    submitApplication: (token: string, id: string) =>
      call<Application>(`/applications/${encodeURIComponent(id)}/submit`, {
        method: 'POST',
        token,
      }),

    deleteDraft: (token: string, id: string) =>
      call<{ ok: true }>(`/applications/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        token,
      }),
  };
}

export type MemberApi = ReturnType<typeof memberApi>;
