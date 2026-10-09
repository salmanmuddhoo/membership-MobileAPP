// Typed calls for the member surface. One function per endpoint; the path
// strings here are the contract in docs/member-api.md.
import type { RequestOptions, Transport } from './client';
import type {
  AccountBalance,
  AccountSummary,
  AccountTransaction,
  Application,
  ChangeRequest,
  DepositInput,
  DepositOptions,
  Dependent,
  DeviceRegistration,
  FiledDocument,
  LinkMemberRequest,
  MemberProfile,
  MemberRequest,
  OtpChallenge,
  Outlet,
  PartyValues,
  Promotion,
  Reference,
  Session,
  TransferInput,
  UploadTicket,
  WithdrawalInput,
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

    dependents: (token: string) => call<Dependent[]>('/me/dependents', { token }),
    dependentTransactions: (token: string, dependentId: string, accountId: string) =>
      call<AccountTransaction[]>(
        `/me/dependents/${encodeURIComponent(dependentId)}/accounts/${encodeURIComponent(accountId)}/transactions`,
        { token }
      ),
    transactions: (token: string, accountId: string) =>
      call<AccountTransaction[]>(
        `/me/accounts/${encodeURIComponent(accountId)}/transactions`,
        { token }
      ),

    documents: (token: string) => call<FiledDocument[]>('/me/documents', { token }),

    // What is being promoted right now, in the order to show it.
    promotions: (token: string) => call<Promotion[]>('/promotions', { token }),

    // Where the membership card earns a discount, in the order to show it.
    outlets: (token: string) => call<Outlet[]>('/outlets', { token }),

    // --- moving money ------------------------------------------------------
    // Every request goes to officers for validation (never straight onto
    // the ledger) and is listed by requests() as "Pending approval" until
    // they decide. The idempotency key is the form's own: the same key
    // again is the same request.
    requests: (token: string) => call<MemberRequest[]>('/me/transactions', { token }),

    // How a deposit may be paid, and the Society's bank account numbers.
    depositOptions: (token: string) => call<DepositOptions>('/me/deposit-options', { token }),

    accountBalance: (token: string, accountId: string) =>
      call<AccountBalance>(`/me/accounts/${encodeURIComponent(accountId)}/balance`, { token }),

    deposit: (token: string, input: DepositInput, idempotencyKey: string) =>
      call<unknown>('/me/deposits', { method: 'POST', body: input, token, idempotencyKey }),

    withdraw: (token: string, input: WithdrawalInput, idempotencyKey: string) =>
      call<unknown>('/me/withdrawals', { method: 'POST', body: input, token, idempotencyKey }),

    transfer: (token: string, input: TransferInput, idempotencyKey: string) =>
      call<unknown>('/me/transfers', { method: 'POST', body: input, token, idempotencyKey }),

    // --- push notifications ------------------------------------------------
    // This phone's push token, tied to the session. Idempotent: the same
    // token again just refreshes it.
    registerDevice: (token: string, device: DeviceRegistration) =>
      call<{ ok: true }>('/me/devices', { method: 'POST', body: device, token }),

    // Withdraw it, before signing out. The backend also disables every
    // token of a session it revokes, so this is belt and braces.
    unregisterDevice: (token: string, pushToken: string) =>
      call<{ ok: true }>('/me/devices', { method: 'DELETE', body: { token: pushToken }, token }),

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
