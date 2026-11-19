import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Edit2, Plus, Trash2 } from 'lucide-react';
import { DEFAULT_CATEGORIES, formatCurrency, getCurrentMonthKey } from '../lib/format';
import type { Budget, BudgetInput, Transaction } from '../types/finance';

interface BudgetsViewProps {
  budgets: Budget[];
  transactions: Transaction[];
  currency: string;
  onSave: (input: BudgetInput, existingId?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  budgets,
  transactions,
  currency,
  onSave,
  onDelete,
}) => {
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentMonth = getCurrentMonthKey();

  const monthSpendByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.kind === 'expense' && tx.tx_date.startsWith(currentMonth)) {
        map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
      }
    }
    return map;
  }, [transactions, currentMonth]);

  const resetForm = () => {
    setEditingId(null);
    setCategory(DEFAULT_CATEGORIES[0]);
    setMonthlyLimit('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedLimit = Number(monthlyLimit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      setError('Monthly limit must be greater than 0.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          category: category.trim(),
          monthly_limit: Math.round(parsedLimit * 100) / 100,
        },
        editingId ?? undefined
      );
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budget.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (b: Budget) => {
    setEditingId(b.id);
    setCategory(b.category);
    setMonthlyLimit(String(b.monthly_limit));
    setError(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="block-card p-5 h-fit">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-earth-900">
            {editingId ? 'Edit Budget' : 'Set Category Budget'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-earth-700 hover:text-earth-900"
            >
              Cancel
            </button>
          )}
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-red-50 border-2 border-red-300 rounded text-xs text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="pixel-input"
              disabled={Boolean(editingId)}
            >
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Monthly Limit ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder="5000"
              className="pixel-input"
            />
          </div>

          <button type="submit" disabled={saving} className="pixel-btn-primary w-full">
            <Plus className="w-4 h-4" />
            {saving ? 'Saving...' : editingId ? 'Update Budget' : 'Save Budget'}
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="block-card p-5">
          <h2 className="text-base font-bold text-earth-900">
            Monthly Budgets ({currentMonth})
          </h2>
          <p className="text-xs text-earth-700 mb-4">
            Compares this month&apos;s recorded expenses against your category limits.
          </p>

          {budgets.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-parchment-300 rounded-md text-sm text-earth-700">
              No category budgets yet. Create one on the left to track monthly limits.
            </div>
          ) : (
            <div className="space-y-4">
              {budgets.map((b) => {
                const spent = monthSpendByCategory.get(b.category) ?? 0;
                const remaining = b.monthly_limit - spent;
                const pct = Math.round((spent / b.monthly_limit) * 100);
                const isOver = spent > b.monthly_limit;
                const isNear = !isOver && pct >= 80;

                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-md border-2 ${
                      isOver
                        ? 'bg-red-50/70 border-red-300'
                        : isNear
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-white border-parchment-300'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-earth-900">{b.category}</span>
                        {isOver ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-red-100 text-red-800 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            Over limit ({pct}%)
                          </span>
                        ) : isNear ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            Near limit ({pct}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-forest-50 text-forest-700 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            On track ({pct}%)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(b)}
                          className="p-1 text-earth-700 hover:text-forest-700"
                          title="Edit budget"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(b.id)}
                          className="p-1 text-earth-700 hover:text-red-700"
                          title="Delete budget"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="h-3 bg-parchment-200 border border-parchment-300 rounded-sm overflow-hidden mb-2">
                      <div
                        className={`h-full transition-all ${
                          isOver ? 'bg-red-600' : isNear ? 'bg-amber-600' : 'bg-forest-600'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap justify-between text-xs text-earth-700">
                      <span>
                        Spent: <strong className="text-earth-900">{formatCurrency(spent, currency)}</strong> of{' '}
                        {formatCurrency(b.monthly_limit, currency)}
                      </span>
                      <span className={isOver ? 'text-red-700 font-semibold' : 'font-semibold'}>
                        {isOver
                          ? `Over by ${formatCurrency(Math.abs(remaining), currency)}`
                          : `${formatCurrency(remaining, currency)} remaining`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
