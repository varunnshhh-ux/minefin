export const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Housing & Rent',
  'Utilities',
  'Shopping',
  'Entertainment',
  'Health',
  'Education',
  'Salary',
  'Allowance & Gift',
  'Freelance',
  'Other',
];

export function formatCurrency(amount: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toFixed(2)}`;
  }
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentMonthKey(): string {
  return getTodayISO().slice(0, 7); // YYYY-MM
}

export function getLastSixMonths(): Array<{ key: string; label: string }> {
  const result: Array<{ key: string; label: string }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    result.push({ key, label });
  }
  return result;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Deterministic FNV-1a 64-bit-like hex hash for CSV row deduplication.
 * Includes occurrence index within the same CSV so two legitimate identical
 * rows in one file are both imported, while re-importing the same file is blocked.
 */
export function computeCsvRowHash(
  txDate: string,
  description: string,
  category: string,
  kind: string,
  amount: number,
  occurrenceInFile: number
): string {
  const normalized = [
    txDate.trim(),
    description.trim().toLowerCase(),
    category.trim().toLowerCase(),
    kind.trim().toLowerCase(),
    amount.toFixed(2),
    String(occurrenceInFile),
  ].join('|');

  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `csv_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}
