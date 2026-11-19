import React, { useState } from 'react';
import { Calendar, Edit2, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatDisplayDate } from '../lib/format';
import type { SavingsGoal, SavingsGoalInput } from '../types/finance';

interface SavingsViewProps {
  goals: SavingsGoal[];
  currency: string;
  onSave: (input: SavingsGoalInput, existingId?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const SavingsView: React.FC<SavingsViewProps> = ({
  goals,
  currency,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setTargetDate('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedTarget = Number(targetAmount);
    const parsedCurrent = Number(currentAmount || 0);
    if (!name.trim()) {
      setError('Goal name is required.');
      return;
    }
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setError('Target amount must be greater than 0.');
      return;
    }
    if (!Number.isFinite(parsedCurrent) || parsedCurrent < 0) {
      setError('Current saved amount cannot be negative.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          name: name.trim(),
          target_amount: Math.round(parsedTarget * 100) / 100,
          current_amount: Math.round(parsedCurrent * 100) / 100,
          target_date: targetDate || null,
        },
        editingId ?? undefined
      );
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save goal.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (goal: SavingsGoal) => {
    setEditingId(goal.id);
    setName(goal.name);
    setTargetAmount(String(goal.target_amount));
    setCurrentAmount(String(goal.current_amount));
    setTargetDate(goal.target_date ?? '');
    setError(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="block-card p-5 h-fit">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-earth-900">
            {editingId ? 'Edit Savings Goal' : 'New Savings Goal'}
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
            <label className="block text-xs font-semibold text-earth-700 mb-1">Goal Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Emergency Fund"
              className="pixel-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Target Amount ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="50000"
              className="pixel-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Current Saved ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              placeholder="0"
              className="pixel-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Target Date (optional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="pixel-input"
            />
          </div>

          <button type="submit" disabled={saving} className="pixel-btn-primary w-full">
            <Plus className="w-4 h-4" />
            {saving ? 'Saving...' : editingId ? 'Update Goal' : 'Create Goal'}
          </button>
        </form>
      </div>

      <div className="lg:col-span-2">
        <div className="block-card p-5">
          <h2 className="text-base font-bold text-earth-900 mb-1">Savings Goals</h2>
          <p className="text-xs text-earth-700 mb-4">
            Track your progress toward each target. All updates persist to Supabase.
          </p>

          {goals.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-parchment-300 rounded-md text-sm text-earth-700">
              <PiggyBank className="w-8 h-8 mx-auto mb-2 text-earth-700/50" />
              No savings goals yet. Create your first goal on the left.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {goals.map((goal) => {
                const pct = Math.min(
                  100,
                  Math.round((goal.current_amount / goal.target_amount) * 100)
                );
                const remaining = Math.max(0, goal.target_amount - goal.current_amount);

                return (
                  <div key={goal.id} className="p-4 bg-white border-2 border-parchment-300 rounded-md space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-earth-900">{goal.name}</h3>
                        {goal.target_date && (
                          <p className="text-xs text-earth-700 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            Target: {formatDisplayDate(goal.target_date)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(goal)}
                          className="p-1 text-earth-700 hover:text-forest-700"
                          title="Edit goal"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(goal.id)}
                          className="p-1 text-earth-700 hover:text-red-700"
                          title="Delete goal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="h-3 bg-parchment-200 border border-parchment-300 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-emeraldPixel-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-forest-700">{pct}% funded</span>
                      <span className="text-earth-700">
                        {formatCurrency(goal.current_amount, currency)} /{' '}
                        {formatCurrency(goal.target_amount, currency)}
                      </span>
                    </div>
                    <p className="text-[11px] text-earth-700">
                      {remaining === 0
                        ? 'Goal reached!'
                        : `${formatCurrency(remaining, currency)} left to go`}
                    </p>
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
