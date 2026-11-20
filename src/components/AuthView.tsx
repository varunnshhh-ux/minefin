import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Lock, Mail, User, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { MiloMascot } from './MiloMascot';

interface AuthViewProps {
  isModal?: boolean;
  defaultMode?: 'signin' | 'signup';
  promptMessage?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  isModal = false,
  defaultMode = 'signup',
  promptMessage,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || undefined,
            },
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          onSuccess?.();
          onClose?.();
        } else {
          setNotice(
            'Account created! Check your inbox and click the confirmation link, then sign in below.'
          );
          setMode('signin');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        onSuccess?.();
        onClose?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const card = (
    <div className="w-full max-w-md block-card p-6 bg-parchment-50 relative">
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1 text-earth-700 hover:text-earth-900 rounded"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="flex items-center gap-3 mb-4 pr-6">
        <div className="p-2 bg-forest-50 border-2 border-forest-600 rounded-md">
          <MiloMascot size={36} />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-earth-900">
            {mode === 'signup' ? 'Create Free Account' : 'Sign In to MINEFIN'}
          </h2>
          <p className="text-xs text-earth-700">
            {promptMessage || 'Keep your financial records private and synced.'}
          </p>
        </div>
      </div>

      {!isSupabaseConfigured ? (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-md space-y-2 text-sm text-amber-950">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
            <span>Supabase is not configured yet</span>
          </div>
          <p>
            Add <code className="px-1 py-0.5 bg-amber-100 rounded">VITE_SUPABASE_URL</code> and{' '}
            <code className="px-1 py-0.5 bg-amber-100 rounded">VITE_SUPABASE_ANON_KEY</code> to
            your <code className="px-1 py-0.5 bg-amber-100 rounded">.env</code> file, run{' '}
            <code className="px-1 py-0.5 bg-amber-100 rounded">
              supabase/migrations/001_init_minefin.sql
            </code>{' '}
            in your Supabase SQL Editor, and restart the dev server.
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-md text-sm text-red-800">
              {error}
            </div>
          )}

          {notice && (
            <div className="mb-4 p-3 bg-forest-50 border-2 border-forest-500 rounded-md text-sm text-forest-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-forest-600" />
              <span>{notice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-earth-700 mb-1">
                  Name (optional)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-earth-700/60 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex"
                    className="pixel-input pl-9"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-earth-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-earth-700/60 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pixel-input pl-9"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-earth-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-earth-700/60 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pixel-input pl-9"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="pixel-btn-primary w-full py-2.5">
              {loading
                ? 'Please wait...'
                : mode === 'signup'
                ? 'Create Account & Continue'
                : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-parchment-200 text-center text-xs text-earth-700">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                  }}
                  className="font-bold text-forest-700 hover:underline"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                New to MINEFIN?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className="font-bold text-forest-700 hover:underline"
                >
                  Create Free Account
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-earth-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
        {card}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment-100 flex items-center justify-center p-4">
      {card}
    </div>
  );
};
