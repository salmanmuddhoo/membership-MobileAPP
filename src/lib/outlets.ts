// Grouping and wording for the partner outlets on the Cards screen.
import type { Outlet } from '../api/types';

// The categories present, in the order to offer them as filters: by how
// many outlets each has, then by name.
export function categoriesOf(outlets: readonly Outlet[]): string[] {
  const counts = new Map<string, number>();
  for (const o of outlets) counts.set(o.category, (counts.get(o.category) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category]) => category);
}

// "education" → "Education"; "home & garden" → "Home & garden".
export function categoryLabel(category: string): string {
  const trimmed = category.trim();
  return trimmed ? trimmed[0].toUpperCase() + trimmed.slice(1) : 'Other';
}

// "10" → "10% off", "12.50" → "12.5% off", "7.00" → "7% off".
export function discountLabel(percent: string): string {
  const n = Number(percent);
  if (!Number.isFinite(n)) return `${percent}% off`;
  return `${Number(n.toFixed(2))}% off`;
}
