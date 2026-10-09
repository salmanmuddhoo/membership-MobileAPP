// Server state, through React Query. Keys are listed here so a mutation can
// invalidate exactly what it changed.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type DepositInput, type PartyValues, type TransferInput, type WithdrawalInput } from '../api';
import { useAuth } from '../auth/AuthContext';

export const keys = {
  reference: ['reference'] as const,
  me: ['me'] as const,
  accounts: ['accounts'] as const,
  transactions: (id: string) => ['accounts', id, 'transactions'] as const,
  dependents: ['dependents'] as const,
  dependentTransactions: (dependentId: string, accountId: string) =>
    ['dependents', dependentId, 'accounts', accountId, 'transactions'] as const,
  promotions: ['promotions'] as const,
  requests: ['requests'] as const,
  balance: (accountId: string) => ['accounts', accountId, 'balance'] as const,
  outlets: ['outlets'] as const,
  applications: ['applications'] as const,
  application: (id: string) => ['applications', id] as const,
};

export function useReference() {
  return useQuery({ queryKey: keys.reference, queryFn: () => api.reference(), staleTime: 5 * 60_000 });
}

export function useMe() {
  const { withToken, session } = useAuth();
  return useQuery({
    queryKey: keys.me,
    queryFn: () => withToken(t => api.me(t)),
    enabled: !!session,
  });
}

export function useAccounts() {
  const { withToken, session } = useAuth();
  return useQuery({
    queryKey: keys.accounts,
    queryFn: () => withToken(t => api.accounts(t)),
    enabled: !!session,
  });
}

export function useTransactions(accountId: string) {
  const { withToken, session } = useAuth();
  return useQuery({
    queryKey: keys.transactions(accountId),
    queryFn: () => withToken(t => api.transactions(t, accountId)),
    enabled: !!session && !!accountId,
  });
}

export function useDependents() {
  const { withToken, session } = useAuth();
  return useQuery({
    queryKey: keys.dependents,
    queryFn: () => withToken(t => api.dependents(t)),
    enabled: !!session,
  });
}

export function useDependentTransactions(dependentId: string, accountId: string) {
  const { withToken, session } = useAuth();
  return useQuery({
    queryKey: keys.dependentTransactions(dependentId, accountId),
    queryFn: () => withToken(t => api.dependentTransactions(t, dependentId, accountId)),
    enabled: !!session && !!dependentId && !!accountId,
  });
}

// Where the membership card earns a discount: the list on the Cards screen.
export function useOutlets() {
  const { withToken, session } = useAuth();
  return useQuery({
    queryKey: keys.outlets,
    queryFn: () => withToken(t => api.outlets(t)),
    enabled: !!session,
    staleTime: 5 * 60_000,
  });
}

// What the Society is promoting right now: the cards on the home screen.
export function usePromotions() {
  const { withToken, session } = useAuth();
  return useQuery({
    queryKey: keys.promotions,
    queryFn: () => withToken(t => api.promotions(t)),
    enabled: !!session,
    staleTime: 5 * 60_000,
  });
}

export function useApplications() {
  const { withToken, session } = useAuth();
  return useQuery({
    queryKey: keys.applications,
    queryFn: () => withToken(t => api.applications(t)),
    enabled: !!session,
  });
}

export function useApplication(id: string) {
  const { withToken, session } = useAuth();
  return useQuery({
    queryKey: keys.application(id),
    queryFn: () => withToken(t => api.application(t, id)),
    enabled: !!session && !!id,
  });
}

export function useSubmitDetails() {
  const { withToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (parties: PartyValues[]) => withToken(t => api.submitDetails(t, parties)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

export function useStartApplication() {
  const { withToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => withToken(t => api.startApplication(t, code)),
    onSuccess: app => {
      qc.setQueryData(keys.application(app.id), app);
      qc.invalidateQueries({ queryKey: keys.applications });
    },
  });
}

export function useSaveDraft(id: string) {
  const { withToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (parties: PartyValues[]) => withToken(t => api.saveDraft(t, id, parties)),
    onSuccess: app => qc.setQueryData(keys.application(app.id), app),
  });
}

export function useSubmitApplication(id: string) {
  const { withToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => withToken(t => api.submitApplication(t, id)),
    onSuccess: app => {
      qc.setQueryData(keys.application(app.id), app);
      qc.invalidateQueries({ queryKey: keys.applications });
    },
  });
}

export function useDeleteDraft() {
  const { withToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => withToken(t => api.deleteDraft(t, id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.applications }),
  });
}

// --- moving money -------------------------------------------------------------

// What the member asked for from the app, and where each stands.
export function useRequests() {
  const { withToken, session } = useAuth();
  return useQuery({
    queryKey: keys.requests,
    queryFn: () => withToken(t => api.requests(t)),
    enabled: !!session,
  });
}

// What a withdrawal or transfer from this account can draw on.
export function useAccountBalance(accountId: string | null) {
  const { withToken, session } = useAuth();
  return useQuery({
    queryKey: keys.balance(accountId ?? ''),
    queryFn: () => withToken(t => api.accountBalance(t, accountId!)),
    enabled: !!session && !!accountId,
  });
}

// A request changes the list of requests and, once an officer acts, the
// balances: both are refetched.
function useMoneyMutation<I>(send: (token: string, input: I, key: string) => Promise<unknown>) {
  const { withToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: I; idempotencyKey: string }) =>
      withToken(t => send(t, input, idempotencyKey)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.requests });
      qc.invalidateQueries({ queryKey: keys.accounts });
    },
  });
}

export function useDeposit() {
  return useMoneyMutation<DepositInput>(api.deposit);
}

export function useWithdrawal() {
  return useMoneyMutation<WithdrawalInput>(api.withdraw);
}

export function useTransfer() {
  return useMoneyMutation<TransferInput>(api.transfer);
}
