export type NavSection = 'dashboard' | 'transactions' | 'budgets' | 'savings' | 'milo';

export type TransactionKind = 'income' | 'expense';

export interface Profile {
  id: string;
  full_name: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  kind: TransactionKind;
  amount: number;
  category: string;
  description: string;
  tx_date: string; // YYYY-MM-DD
  import_hash: string | null;
  created_at: string;
}

export interface TransactionInput {
  kind: TransactionKind;
  amount: number;
  category: string;
  description: string;
  tx_date: string;
  import_hash?: string | null;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
}

export interface BudgetInput {
  category: string;
  monthly_limit: number;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  created_at: string;
}

export interface SavingsGoalInput {
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
}

export interface ParsedTransactionDraft {
  kind: TransactionKind;
  amount: number;
  category: string;
  description: string;
  tx_date: string;
}

export interface MiloMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    draft?: ParsedTransactionDraft;
    draftSaved?: boolean;
    mode?: 'parsed_tx' | 'clarification' | 'ai_answer' | 'ai_unavailable';
  } | null;
  created_at: string;
}

export interface CsvPreviewRow {
  rowNumber: number;
  tx_date: string;
  description: string;
  category: string;
  kind: TransactionKind;
  amount: number;
  import_hash: string;
  isValid: boolean;
  isDuplicate: boolean;
  error?: string;
}
