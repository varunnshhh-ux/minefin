import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Lock, Mail, User } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { MiloMascot } from './MiloMascot';

export const AuthView: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
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

        if (!data.session) {
          setNotice(
            'Account created! Check your inbox and click the confirmation link before signing in.'
          );
          setMode('signin');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="block-card p-6 bg-parchment-50">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-forest-50 border-2 border-forest-600 rounded-md">
              <MiloMascot size={40} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-earth-900">MINEFIN</h1>
              <p className="text-sm text-earth-700">
                Calm, block-structured personal finance with MILO
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
              <p className="text-xs text-amber-800">
                Financial records are stored privately in Supabase with Row Level Security — nothing
                is saved locally when disconnected.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 p-1 bg-parchment-200 border-2 border-parchment-300 rounded-md mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                  }}
                  className={`py-2 text-sm font-semibold rounded transition-colors ${
                    mode === 'signin'
                      ? 'bg-forest-600 text-parchment-50'
                      : 'text-earth-700 hover:text-earth-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className={`py-2 text-sm font-semibold rounded transition-colors ${
                    mode === 'signup'
                      ? 'bg-forest-600 text-parchment-50'
                      : 'text-earth-700 hover:text-earth-900'
                  }`}
                >
                  Create Account
                </button>
              </div>

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

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    : mode === 'signin'
                    ? 'Sign In to MINEFIN'
                    : 'Create Private Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
