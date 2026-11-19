import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Budget,
  BudgetInput,
  MiloMessage,
  Profile,
  SavingsGoal,
  SavingsGoalInput,
  Transaction,
  TransactionInput,
} from '../types/finance';

export function useFinanceData(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [messages, setMessages] = useState<MiloMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    if (!supabase || !userId) {
      setProfile(null);
      setTransactions([]);
      setBudgets([]);
      setSavingsGoals([]);
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [profileRes, txRes, budgetRes, savingsRes, msgRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('tx_date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('budgets')
          .select('*')
          .eq('user_id', userId)
          .order('category', { ascending: true }),
        supabase
          .from('savings_goals')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('milo_messages')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (txRes.error) throw txRes.error;
      if (budgetRes.error) throw budgetRes.error;
      if (savingsRes.error) throw savingsRes.error;
      if (msgRes.error) throw msgRes.error;

      setProfile(profileRes.data as Profile | null);
      setTransactions(
        ((txRes.data as Transaction[]) ?? []).map((t) => ({
          ...t,
          amount: Number(t.amount),
        }))
      );
      setBudgets(
        ((budgetRes.data as Budget[]) ?? []).map((b) => ({
          ...b,
          monthly_limit: Number(b.monthly_limit),
        }))
      );
      setSavingsGoals(
        ((savingsRes.data as SavingsGoal[]) ?? []).map((g) => ({
          ...g,
          target_amount: Number(g.target_amount),
          current_amount: Number(g.current_amount),
        }))
      );
      setMessages((msgRes.data as MiloMessage[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load financial records.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const addTransaction = async (input: TransactionInput) => {
    if (!supabase || !userId) throw new Error('Not authenticated');
    const { error: insertErr } = await supabase.from('transactions').insert({
      user_id: userId,
      kind: input.kind,
      amount: input.amount,
      category: input.category.trim(),
      description: input.description.trim(),
      tx_date: input.tx_date,
      import_hash: input.import_hash ?? null,
    });
    if (insertErr) throw insertErr;
    await refreshAll();
  };

  const bulkImportTransactions = async (rows: TransactionInput[]) => {
    if (!supabase || !userId) throw new Error('Not authenticated');
    if (rows.length === 0) return { inserted: 0 };

    const payload = rows.map((r) => ({
      user_id: userId,
      kind: r.kind,
      amount: r.amount,
      category: r.category.trim(),
      description: r.description.trim(),
      tx_date: r.tx_date,
      import_hash: r.import_hash ?? null,
    }));

    const { data, error: upsertErr } = await supabase
      .from('transactions')
      .upsert(payload, {
        onConflict: 'user_id,import_hash',
        ignoreDuplicates: true,
      })
      .select('id');

    if (upsertErr) throw upsertErr;
    await refreshAll();
    return { inserted: data?.length ?? 0 };
  };

  const updateTransaction = async (id: string, input: TransactionInput) => {
    if (!supabase || !userId) throw new Error('Not authenticated');
    const { error: updateErr } = await supabase
      .from('transactions')
      .update({
        kind: input.kind,
        amount: input.amount,
        category: input.category.trim(),
        description: input.description.trim(),
        tx_date: input.tx_date,
      })
      .eq('id', id)
      .eq('user_id', userId);
    if (updateErr) throw updateErr;
    await refreshAll();
  };

  const deleteTransaction = async (id: string) => {
    if (!supabase || !userId) throw new Error('Not authenticated');
    const { error: delErr } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (delErr) throw delErr;
    await refreshAll();
  };

  const saveBudget = async (input: BudgetInput, existingId?: string) => {
    if (!supabase || !userId) throw new Error('Not authenticated');
    if (existingId) {
      const { error: updErr } = await supabase
        .from('budgets')
        .update({
          category: input.category.trim(),
          monthly_limit: input.monthly_limit,
        })
        .eq('id', existingId)
        .eq('user_id', userId);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase.from('budgets').insert({
        user_id: userId,
        category: input.category.trim(),
        monthly_limit: input.monthly_limit,
      });
      if (insErr) throw insErr;
    }
    await refreshAll();
  };

  const deleteBudget = async (id: string) => {
    if (!supabase || !userId) throw new Error('Not authenticated');
    const { error: delErr } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (delErr) throw delErr;
    await refreshAll();
  };

  const saveSavingsGoal = async (input: SavingsGoalInput, existingId?: string) => {
    if (!supabase || !userId) throw new Error('Not authenticated');
    if (existingId) {
      const { error: updErr } = await supabase
        .from('savings_goals')
        .update({
          name: input.name.trim(),
          target_amount: input.target_amount,
          current_amount: input.current_amount,
          target_date: input.target_date || null,
        })
        .eq('id', existingId)
        .eq('user_id', userId);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase.from('savings_goals').insert({
        user_id: userId,
        name: input.name.trim(),
        target_amount: input.target_amount,
        current_amount: input.current_amount,
        target_date: input.target_date || null,
      });
      if (insErr) throw insErr;
    }
    await refreshAll();
  };

  const deleteSavingsGoal = async (id: string) => {
    if (!supabase || !userId) throw new Error('Not authenticated');
    const { error: delErr } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (delErr) throw delErr;
    await refreshAll();
  };

  const appendMiloMessage = async (
    role: 'user' | 'assistant',
    content: string,
    metadata?: MiloMessage['metadata']
  ) => {
    if (!supabase || !userId) throw new Error('Not authenticated');
    const { error: insErr } = await supabase.from('milo_messages').insert({
      user_id: userId,
      role,
      content,
      metadata: metadata ?? null,
    });
    if (insErr) throw insErr;
    await refreshAll();
  };

  const clearMiloHistory = async () => {
    if (!supabase || !userId) throw new Error('Not authenticated');
    const { error: delErr } = await supabase
      .from('milo_messages')
      .delete()
      .eq('user_id', userId);
    if (delErr) throw delErr;
    await refreshAll();
  };

  return {
    profile,
    transactions,
    budgets,
    savingsGoals,
    messages,
    loading,
    error,
    refreshAll,
    addTransaction,
    bulkImportTransactions,
    updateTransaction,
    deleteTransaction,
    saveBudget,
    deleteBudget,
    saveSavingsGoal,
    deleteSavingsGoal,
    appendMiloMessage,
    clearMiloHistory,
  };
}
