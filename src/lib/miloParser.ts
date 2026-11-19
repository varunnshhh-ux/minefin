import { getTodayISO } from './format';
import type { ParsedTransactionDraft, TransactionKind } from '../types/finance';

export type MiloParseResult =
  | { intent: 'transaction'; draft: ParsedTransactionDraft }
  | { intent: 'clarification'; question: string }
  | { intent: 'question' };

const INCOME_KEYWORDS = [
  'gave me',
  'received',
  'got paid',
  'salary',
  'income',
  'earned',
  'bonus',
  'refund',
  'freelance',
  'stipend',
  'pocket money',
  'credited',
];

const EXPENSE_KEYWORDS = [
  'spent',
  'paid',
  'bought',
  'purchased',
  'ordered',
  'ate',
  'lunch',
  'dinner',
  'breakfast',
  'coffee',
  'uber',
  'auto',
  'taxi',
  'rent',
  'bill',
  'groceries',
  'debited',
  'expense',
];

const QUESTION_STARTERS = [
  'how much',
  'what is',
  "what's",
  'where did',
  'which category',
  'am i',
  'can i',
  'should i',
  'summarize',
  'summary',
  'compare',
  'analyze',
  'show me',
  'why',
  'total',
  'balance',
  'budget',
  'savings',
];

function inferCategory(text: string, kind: TransactionKind): string {
  const lower = text.toLowerCase();
  if (kind === 'income') {
    if (/(salary|paycheck|stipend|payroll)/.test(lower)) return 'Salary';
    if (/(freelance|client|project|gig)/.test(lower)) return 'Freelance';
    if (/(papa|mom|dad|mother|father|gift|allowance|pocket money)/.test(lower)) {
      return 'Allowance & Gift';
    }
    return 'Other';
  }

  if (/(lunch|dinner|breakfast|coffee|tea|cafe|restaurant|food|pizza|burger|snack|zomato|swiggy)/.test(lower)) {
    return 'Food & Dining';
  }
  if (/(grocer|milk|vegetable|fruit|supermarket|mart|zepto|blinkit)/.test(lower)) {
    return 'Groceries';
  }
  if (/(uber|ola|auto|bus|train|metro|fuel|petrol|diesel|cab|taxi|transport)/.test(lower)) {
    return 'Transport';
  }
  if (/(rent|landlord|maintenance|housing)/.test(lower)) return 'Housing & Rent';
  if (/(electricity|water|wifi|internet|phone|recharge|gas|utility|bill)/.test(lower)) {
    return 'Utilities';
  }
  if (/(movie|netflix|spotify|game|entertainment|concert)/.test(lower)) return 'Entertainment';
  if (/(doctor|medicine|pharmacy|hospital|health|gym)/.test(lower)) return 'Health';
  if (/(book|course|tuition|school|college|education)/.test(lower)) return 'Education';
  if (/(clothes|shoes|amazon|flipkart|shopping|mall)/.test(lower)) return 'Shopping';
  return 'Other';
}

function inferDate(text: string): string {
  const lower = text.toLowerCase();
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const today = new Date();
  if (/\byesterday\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }

  return getTodayISO();
}

export function parseMiloInput(input: string): MiloParseResult {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  const looksLikeQuestion =
    trimmed.endsWith('?') || QUESTION_STARTERS.some((starter) => lower.startsWith(starter));

  // Extract numeric amount (supports ₹2,000, Rs. 500, 150.50, $20)
  const amountMatch = trimmed.match(/(?:₹|rs\.?|inr|\$|usd)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
  const parsedAmount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : NaN;

  const hasIncomeCue = INCOME_KEYWORDS.some((kw) => lower.includes(kw));
  const hasExpenseCue = EXPENSE_KEYWORDS.some((kw) => lower.includes(kw));

  if (looksLikeQuestion && (!amountMatch || (!hasIncomeCue && !hasExpenseCue))) {
    return { intent: 'question' };
  }

  // If user clearly intends to log a transaction (has cue or amount)
  if (hasIncomeCue || hasExpenseCue) {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return {
        intent: 'clarification',
        question:
          'I spotted a transaction, but I missed the amount. How much was it (for example: "Spent ₹150 on lunch")?',
      };
    }

    if (hasIncomeCue && hasExpenseCue) {
      return {
        intent: 'clarification',
        question:
          'Should I record this as an **income** or an **expense**? Let me know and I will prepare the preview.',
      };
    }

    const kind: TransactionKind = hasIncomeCue ? 'income' : 'expense';
    const tx_date = inferDate(trimmed);
    const category = inferCategory(trimmed, kind);

    // Clean up description
    let description = trimmed
      .replace(/^(i\s+)?(spent|paid|bought|purchased|received|earned|got)\s+/i, '')
      .replace(/(?:₹|rs\.?|inr|\$)\s*\d[\d,]*(?:\.\d{1,2})?/gi, '')
      .replace(/\b(today|yesterday|\d{4}-\d{2}-\d{2})\b/gi, '')
      .replace(/\b(on|for)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (description.length < 2) {
      description = category;
    } else {
      description = description.charAt(0).toUpperCase() + description.slice(1);
    }

    return {
      intent: 'transaction',
      draft: {
        kind,
        amount: Math.round(parsedAmount * 100) / 100,
        category,
        description,
        tx_date,
      },
    };
  }

  // If there's an amount without clear income/expense cue and not a question
  if (Number.isFinite(parsedAmount) && parsedAmount > 0 && !looksLikeQuestion) {
    return {
      intent: 'clarification',
      question: `I see ₹${parsedAmount}, but I'm not sure if that's income or an expense (and what it was for). Could you clarify?`,
    };
  }

  return { intent: 'question' };
}
