import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  MessageSquare,
  PiggyBank,
  Target,
  X,
} from 'lucide-react';
import { AuthView } from './components/AuthView';
import { BudgetsView } from './components/BudgetsView';
import { DashboardView } from './components/DashboardView';
import { MiloChatView } from './components/MiloChatView';
import { MiloMascot } from './components/MiloMascot';
import { SavingsView } from './components/SavingsView';
import { TransactionsView } from './components/TransactionsView';
import { useFinanceData } from './hooks/useFinanceData';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import type { NavSection } from './types/finance';

const NAV_ITEMS: Array<{ id: NavSection; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'transactions', label: 'Transactions', icon: <ListOrdered className="w-4 h-4" /> },
  { id: 'budgets', label: 'Budgets', icon: <Target className="w-4 h-4" /> },
  { id: 'savings', label: 'Savings', icon: <PiggyBank className="w-4 h-4" /> },
  { id: 'milo', label: 'MILO AI', icon: <MessageSquare className="w-4 h-4" /> },
];

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const finance = useFinanceData(session?.user?.id);
  const currency = finance.profile?.currency || 'INR';

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-parchment-100 flex items-center justify-center text-sm text-earth-700">
        Checking session...
      </div>
    );
  }

  if (!isSupabaseConfigured || !session) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-parchment-100 text-earth-900 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-parchment-50 border-r-2 border-parchment-300 p-4 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="p-1.5 bg-forest-50 border-2 border-forest-600 rounded-md">
              <MiloMascot size={32} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-earth-900">MINEFIN</h1>
              <p className="text-[11px] text-earth-700">Personal Finance</p>
            </div>
          </div>

          <nav className="space-y-1.5" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold border-2 transition-colors ${
                    active
                      ? 'bg-forest-600 text-parchment-50 border-forest-800 shadow-block-sm'
                      : 'bg-transparent text-earth-800 border-transparent hover:bg-parchment-200/70'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t-2 border-parchment-200 space-y-2">
          <p className="px-2 text-xs text-earth-700 truncate" title={session.user.email}>
            {session.user.email}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="pixel-btn-secondary w-full text-xs py-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-parchment-50 border-b-2 border-parchment-300 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <MiloMascot size={28} />
          <span className="font-bold text-base text-earth-900">MINEFIN</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="p-2 rounded-md border-2 border-parchment-300 bg-parchment-100"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-parchment-50 border-b-2 border-parchment-300 p-3 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold ${
                  active ? 'bg-forest-600 text-parchment-50' : 'text-earth-800 hover:bg-parchment-200'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-2 border-t border-parchment-200 flex items-center justify-between px-2">
            <span className="text-xs text-earth-700 truncate">{session.user.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs font-semibold text-red-700 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-5">
        {finance.error && (
          <div className="p-3 bg-red-50 border-2 border-red-300 rounded-md text-sm text-red-800">
            {finance.error}
          </div>
        )}

        {activeSection === 'dashboard' && (
          <DashboardView
            transactions={finance.transactions}
            budgets={finance.budgets}
            savingsGoals={finance.savingsGoals}
            currency={currency}
            loading={finance.loading}
            onNavigate={setActiveSection}
          />
        )}

        {activeSection === 'transactions' && (
          <TransactionsView
            transactions={finance.transactions}
            currency={currency}
            loading={finance.loading}
            onAdd={finance.addTransaction}
            onUpdate={finance.updateTransaction}
            onDelete={finance.deleteTransaction}
            onBulkImport={finance.bulkImportTransactions}
          />
        )}

        {activeSection === 'budgets' && (
          <BudgetsView
            budgets={finance.budgets}
            transactions={finance.transactions}
            currency={currency}
            onSave={finance.saveBudget}
            onDelete={finance.deleteBudget}
          />
        )}

        {activeSection === 'savings' && (
          <SavingsView
            goals={finance.savingsGoals}
            currency={currency}
            onSave={finance.saveSavingsGoal}
            onDelete={finance.deleteSavingsGoal}
          />
        )}

        {activeSection === 'milo' && (
          <MiloChatView
            messages={finance.messages}
            currency={currency}
            onAppendMessage={finance.appendMiloMessage}
            onSaveTransaction={finance.addTransaction}
            onClearHistory={finance.clearMiloHistory}
          />
        )}
      </main>
    </div>
  );
}

export default App;
