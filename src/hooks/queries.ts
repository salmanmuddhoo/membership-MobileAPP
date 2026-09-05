// Server state, through React Query. Keys are listed here so a mutation can
// invalidate exactly what it changed.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PartyValues } from '../api';
import { useAuth } from '../auth/AuthContext';

export const keys = {
  reference: ['reference'] as const,
  me: ['me'] as const,
  accounts: ['accounts'] as const,
  transactions: (id: string) => ['accounts', id, 'transactions'] as const,
  documents: ['documents'] as const,
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

export function useDocuments() {
  const { withToken, session } = useAuth();
  return useQuery({
    queryKey: keys.documents,
    queryFn: () => withToken(t => api.documents(t)),
    enabled: !!session,
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
