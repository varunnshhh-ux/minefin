import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Scale, Wallet } from 'lucide-react';
import {
  formatCurrency,
  formatDisplayDate,
  getCurrentMonthKey,
  getLastSixMonths,
} from '../lib/format';
import type { Budget, NavSection, SavingsGoal, Transaction } from '../types/finance';

interface DashboardViewProps {
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  currency: string;
  loading: boolean;
  onNavigate: (section: NavSection) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  budgets,
  savingsGoals,
  currency,
  loading,
  onNavigate,
}) => {
  const currentMonth = getCurrentMonthKey();

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let monthIncome = 0;
    let monthExpense = 0;
    const categorySpend = new Map<string, number>();

    for (const tx of transactions) {
      if (tx.kind === 'income') {
        totalIncome += tx.amount;
        if (tx.tx_date.startsWith(currentMonth)) monthIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
        if (tx.tx_date.startsWith(currentMonth)) {
          monthExpense += tx.amount;
          categorySpend.set(tx.category, (categorySpend.get(tx.category) ?? 0) + tx.amount);
        }
      }
    }

    const categoriesSorted = Array.from(categorySpend.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      balance: totalIncome - totalExpense,
      monthIncome,
      monthExpense,
      categoriesSorted,
      categorySpendMap: categorySpend,
    };
  }, [transactions, currentMonth]);

  const sixMonthData = useMemo(() => {
    const months = getLastSixMonths();
    return months.map(({ key, label }) => {
      let income = 0;
      let expenses = 0;
      for (const tx of transactions) {
        if (tx.tx_date.startsWith(key)) {
          if (tx.kind === 'income') income += tx.amount;
          else expenses += tx.amount;
        }
      }
      return {
        month: label,
        Income: Math.round(income * 100) / 100,
        Expenses: Math.round(expenses * 100) / 100,
      };
    });
  }, [transactions]);

  const recentTransactions = transactions.slice(0, 5);

  if (loading && transactions.length === 0) {
    return (
      <div className="block-card p-8 text-center text-earth-700">
        Loading your financial blocks from Supabase...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="block-card p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-earth-700">
            <span>Total Balance</span>
            <Scale className="w-4 h-4 text-forest-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-earth-900">
            {formatCurrency(summary.balance, currency)}
          </p>
          <p className="mt-1 text-xs text-earth-700">All recorded income minus expenses</p>
        </div>

        <div className="block-card p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-earth-700">
            <span>Income This Month</span>
            <ArrowDownLeft className="w-4 h-4 text-forest-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-forest-700">
            {formatCurrency(summary.monthIncome, currency)}
          </p>
          <p className="mt-1 text-xs text-earth-700">{currentMonth}</p>
        </div>

        <div className="block-card p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-earth-700">
            <span>Expenses This Month</span>
            <ArrowUpRight className="w-4 h-4 text-amber-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-earth-900">
            {formatCurrency(summary.monthExpense, currency)}
          </p>
          <p className="mt-1 text-xs text-earth-700">{currentMonth}</p>
        </div>

        <div className="block-card p-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-earth-700">
            <span>Savings Goals</span>
            <PiggyBank className="w-4 h-4 text-forest-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-earth-900">
            {formatCurrency(
              savingsGoals.reduce((acc, g) => acc + g.current_amount, 0),
              currency
            )}
          </p>
          <p className="mt-1 text-xs text-earth-700">
            Across {savingsGoals.length} active {savingsGoals.length === 1 ? 'goal' : 'goals'}
          </p>
        </div>
      </div>

      {/* 6-Month Chart + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="block-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-earth-900">6-Month Income vs. Expenses</h2>
              <p className="text-xs text-earth-700">Calculated directly from saved transactions</p>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center border-2 border-dashed border-parchment-300 rounded-md p-6">
              <Wallet className="w-8 h-8 text-earth-700/50 mb-2" />
              <p className="text-sm font-medium text-earth-800">No transactions recorded yet</p>
              <p className="text-xs text-earth-700 mt-1">
                Add a transaction or ask MILO to log one to see your 6-month trend.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('transactions')}
                className="pixel-btn-primary mt-4 text-xs"
              >
                Add First Transaction
              </button>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sixMonthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D8C9B0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#4A3F35' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#4A3F35' }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value, currency)}
                    contentStyle={{
                      backgroundColor: '#FBF9F4',
                      border: '2px solid #D8C9B0',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Income" fill="#2E6B47" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#B45309" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Spending by Category */}
        <div className="block-card p-5">
          <h2 className="text-base font-bold text-earth-900 mb-1">Spending by Category</h2>
          <p className="text-xs text-earth-700 mb-4">This month ({currentMonth})</p>

          {summary.categoriesSorted.length === 0 ? (
            <p className="text-sm text-earth-700 py-8 text-center border-2 border-dashed border-parchment-300 rounded-md">
              No expenses recorded this month.
            </p>
          ) : (
            <div className="space-y-3">
              {summary.categoriesSorted.map((item) => {
                const pct =
                  summary.monthExpense > 0
                    ? Math.round((item.amount / summary.monthExpense) * 100)
                    : 0;
                return (
                  <div key={item.category}>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-earth-900 truncate">{item.category}</span>
                      <span className="text-earth-700">
                        {formatCurrency(item.amount, currency)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 bg-parchment-200 border border-parchment-300 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-forest-600"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Recent Transactions, Budget Usage, Savings Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="block-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-earth-900">Recent Transactions</h2>
            <button
              type="button"
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-forest-700 hover:underline"
            >
              View all
            </button>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-earth-700 py-6 text-center">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-parchment-200">
              {recentTransactions.map((tx) => (
                <li key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-earth-900 truncate">{tx.description}</p>
                    <p className="text-xs text-earth-700">
                      {tx.category} · {formatDisplayDate(tx.tx_date)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold shrink-0 ${
                      tx.kind === 'income' ? 'text-forest-700' : 'text-earth-900'
                    }`}
                  >
                    {tx.kind === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Budget Usage */}
        <div className="block-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-earth-900">Budget Usage</h2>
            <button
              type="button"
              onClick={() => onNavigate('budgets')}
              className="text-xs font-semibold text-forest-700 hover:underline"
            >
              Manage
            </button>
          </div>
          {budgets.length === 0 ? (
            <p className="text-sm text-earth-700 py-6 text-center">No category budgets set.</p>
          ) : (
            <div className="space-y-3">
              {budgets.map((b) => {
                const spent = summary.categorySpendMap.get(b.category) ?? 0;
                const remaining = b.monthly_limit - spent;
                const pct = Math.round((spent / b.monthly_limit) * 100);
                const isOver = spent > b.monthly_limit;
                const isNear = !isOver && pct >= 80;

                return (
                  <div key={b.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-earth-900">{b.category}</span>
                      <span className={isOver ? 'text-red-700' : 'text-earth-700'}>
                        {formatCurrency(spent, currency)} / {formatCurrency(b.monthly_limit, currency)}
                      </span>
                    </div>
                    <div className="h-2.5 bg-parchment-200 border border-parchment-300 rounded-sm overflow-hidden">
                      <div
                        className={`h-full ${
                          isOver ? 'bg-red-600' : isNear ? 'bg-amber-600' : 'bg-forest-600'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-earth-700">
                      {isOver
                        ? `Over by ${formatCurrency(Math.abs(remaining), currency)}`
                        : `${formatCurrency(remaining, currency)} remaining`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Savings Progress */}
        <div className="block-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-earth-900">Savings Progress</h2>
            <button
              type="button"
              onClick={() => onNavigate('savings')}
              className="text-xs font-semibold text-forest-700 hover:underline"
            >
              Manage
            </button>
          </div>
          {savingsGoals.length === 0 ? (
            <p className="text-sm text-earth-700 py-6 text-center">No savings goals yet.</p>
          ) : (
            <div className="space-y-3">
              {savingsGoals.map((goal) => {
                const pct = Math.min(
                  100,
                  Math.round((goal.current_amount / goal.target_amount) * 100)
                );
                return (
                  <div key={goal.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-earth-900 truncate">{goal.name}</span>
                      <span className="text-forest-700">{pct}%</span>
                    </div>
                    <div className="h-2.5 bg-parchment-200 border border-parchment-300 rounded-sm overflow-hidden">
                      <div className="h-full bg-emeraldPixel-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[11px] text-earth-700">
                      {formatCurrency(goal.current_amount, currency)} of{' '}
                      {formatCurrency(goal.target_amount, currency)}
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
