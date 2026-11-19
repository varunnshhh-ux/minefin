import { computeCsvRowHash } from './format';
import type { CsvPreviewRow, TransactionKind } from '../types/finance';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function parseTransactionsCsv(
  csvText: string,
  existingHashes: Set<string>
): { rows: CsvPreviewRow[]; headerError?: string } {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      headerError: 'CSV must include a header row and at least one transaction row.',
    };
  }

  const rawHeaders = parseCsvLine(lines[0]).map(normalizeHeader);
  const dateIdx = rawHeaders.findIndex((h) => h === 'date' || h === 'txdate' || h === 'transactiondate');
  const descIdx = rawHeaders.findIndex((h) => h === 'description' || h === 'desc' || h === 'memo' || h === 'note');
  const catIdx = rawHeaders.findIndex((h) => h === 'category' || h === 'cat');
  const kindIdx = rawHeaders.findIndex((h) => h === 'kind' || h === 'type' || h === 'txtype');
  const amountIdx = rawHeaders.findIndex((h) => h === 'amount' || h === 'value');

  if (dateIdx === -1 || descIdx === -1 || catIdx === -1 || kindIdx === -1 || amountIdx === -1) {
    return {
      rows: [],
      headerError:
        'Missing required columns. Expected headers: date, description, category, type (or kind), amount.',
    };
  }

  const occurrenceCounter = new Map<string, number>();
  const rows: CsvPreviewRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const tx_date = (cols[dateIdx] ?? '').trim();
    const description = (cols[descIdx] ?? '').trim();
    const category = (cols[catIdx] ?? '').trim();
    const rawKind = (cols[kindIdx] ?? '').trim().toLowerCase();
    const rawAmount = (cols[amountIdx] ?? '').replace(/[₹$,\s]/g, '');
    const amount = Number(rawAmount);

    const errors: string[] = [];
    if (!isValidISODate(tx_date)) errors.push('Invalid date (use YYYY-MM-DD)');
    if (!description) errors.push('Missing description');
    if (!category) errors.push('Missing category');

    let kind: TransactionKind = 'expense';
    if (rawKind === 'income' || rawKind === 'credit') {
      kind = 'income';
    } else if (rawKind === 'expense' || rawKind === 'debit') {
      kind = 'expense';
    } else {
      errors.push('Type must be income or expense');
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push('Amount must be a positive number');
    }

    const baseKey = `${tx_date}|${description.toLowerCase()}|${category.toLowerCase()}|${kind}|${
      Number.isFinite(amount) ? amount.toFixed(2) : '0'
    }`;
    const occ = (occurrenceCounter.get(baseKey) ?? 0) + 1;
    occurrenceCounter.set(baseKey, occ);

    const import_hash = computeCsvRowHash(
      tx_date,
      description,
      category,
      kind,
      Number.isFinite(amount) ? amount : 0,
      occ
    );
    const isDuplicate = existingHashes.has(import_hash);

    rows.push({
      rowNumber: i + 1,
      tx_date,
      description,
      category,
      kind,
      amount: Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0,
      import_hash,
      isValid: errors.length === 0,
      isDuplicate,
      error: errors.length > 0 ? errors.join('; ') : isDuplicate ? 'Already imported' : undefined,
    });
  }

  return { rows };
}
