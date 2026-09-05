// Small display helpers. Money is a decimal string end to end; it is only
// ever formatted here, never computed with.
export function formatMoney(amount: string | null, currency = 'Rs'): string {
  if (amount === null) return '—';
  const [whole, fraction = '00'] = amount.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currency} ${grouped}.${fraction.padEnd(2, '0').slice(0, 2)}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  new: 'Submitted',
  submitted_for_review: 'Under review',
  returned: 'Returned to you',
  approved: 'Approved',
  rejected: 'Not approved',
  active: 'Active',
  missing: 'Missing',
  pending: 'Uploading',
  filed: 'Filed',
  verified: 'Verified',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

// Within `days` of expiring, or already expired. Lives here rather than in a
// component so the render itself stays pure.
export function expiresWithin(expiresAt: string | null, days: number): boolean {
  if (!expiresAt) return false;
  const at = new Date(expiresAt).getTime();
  if (Number.isNaN(at)) return false;
  return at < Date.now() + days * 86_400_000;
}
