import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  LayoutDashboard,
  ListOrdered,
  LogIn,
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

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');
  const [authPromptMessage, setAuthPromptMessage] = useState<string | undefined>(undefined);

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

  const openAuthPrompt = (mode: 'signin' | 'signup', message?: string) => {
    setAuthModalMode(mode);
    setAuthPromptMessage(message);
    setAuthModalOpen(true);
  };

  const requireAuth = <T extends unknown[]>(
    fn: (...args: T) => Promise<void>,
    message: string
  ) => {
    return async (...args: T) => {
      if (!session) {
        openAuthPrompt('signup', message);
        return;
      }
      await fn(...args);
    };
  };

  const requireAuthBulkImport = async (
    rows: Parameters<typeof finance.bulkImportTransactions>[0]
  ) => {
    if (!session) {
      openAuthPrompt('signup', 'Create a free account to import and save CSV transactions.');
      return { inserted: 0 };
    }
    return finance.bulkImportTransactions(rows);
  };

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

  if (!isSupabaseConfigured) {
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
          {session ? (
            <>
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
            </>
          ) : (
            <button
              type="button"
              onClick={() =>
                openAuthPrompt('signup', 'Create a free account to save your records.')
              }
              className="pixel-btn-primary w-full text-xs py-2"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In / Sign Up
            </button>
          )}
          ) : (
            <button
              type="button"
              onClick={() =>
                openAuthPrompt('signup', 'Create a free account to save your records.')
              }
              className="pixel-btn-primary w-full text-xs py-2"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In / Sign Up
            </button>
          )}

          <div className="pt-1 flex justify-center">
            <a
              href="https://destroy.spritefusion.com/?from=badge&url=https://minefin-omega.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://destroy.spritefusion.com/badge.svg"
                alt="Destroy this website"
                width={180}
                height={40}
              />
            </a>
         </div>
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
            {session ? (
              <>
                <span className="text-xs text-earth-700 truncate">{session.user.email}</span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-xs font-semibold text-red-700 flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthPrompt('signup', 'Create a free account to save your records.');
                }}
                className="pixel-btn-primary w-full text-xs py-2"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In / Sign Up
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-5">
        {!session && (
          <div className="p-3.5 bg-forest-50 border-2 border-forest-600 rounded-md flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-forest-800 font-medium">
              You are previewing MINEFIN. Create a free account when you&apos;re ready to save
              transactions, budgets, and goals.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openAuthPrompt('signin', 'Sign in to load your saved MINEFIN records.')
                }
                className="pixel-btn-secondary text-xs py-1.5 px-3"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() =>
                  openAuthPrompt('signup', 'Create a free account to save your financial data.')
                }
                className="pixel-btn-primary text-xs py-1.5 px-3"
              >
                Create Free Account
              </button>
            </div>
          </div>
        )}

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
            onAdd={requireAuth(
              finance.addTransaction,
              'Sign up or sign in to save your first transaction.'
            )}
            onUpdate={requireAuth(
              finance.updateTransaction,
              'Sign up or sign in to edit transactions.'
            )}
            onDelete={requireAuth(
              finance.deleteTransaction,
              'Sign up or sign in to delete transactions.'
            )}
            onBulkImport={requireAuthBulkImport}
          />
        )}

        {activeSection === 'budgets' && (
          <BudgetsView
            budgets={finance.budgets}
            transactions={finance.transactions}
            currency={currency}
            onSave={requireAuth(
              finance.saveBudget,
              'Sign up or sign in to save monthly budgets.'
            )}
            onDelete={requireAuth(
              finance.deleteBudget,
              'Sign up or sign in to delete budgets.'
            )}
          />
        )}

        {activeSection === 'savings' && (
          <SavingsView
            goals={finance.savingsGoals}
            currency={currency}
            onSave={requireAuth(
              finance.saveSavingsGoal,
              'Sign up or sign in to save your savings goals.'
            )}
            onDelete={requireAuth(
              finance.deleteSavingsGoal,
              'Sign up or sign in to delete savings goals.'
            )}
          />
        )}

        {activeSection === 'milo' && (
          <MiloChatView
            messages={finance.messages}
            currency={currency}
            onAppendMessage={requireAuth(
              finance.appendMiloMessage,
              'Sign up or sign in to chat with MILO and save transactions.'
            )}
            onSaveTransaction={requireAuth(
              finance.addTransaction,
              'Sign up or sign in to save this transaction.'
            )}
            onClearHistory={requireAuth(
              finance.clearMiloHistory,
              'Sign up or sign in to manage chat history.'
            )}
          />
        )}
      </main>

      {authModalOpen && (
        <AuthView
          isModal
          defaultMode={authModalMode}
          promptMessage={authPromptMessage}
          onClose={() => setAuthModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
