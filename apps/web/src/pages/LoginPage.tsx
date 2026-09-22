import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { LogIn, UserPlus, AlertCircle, Shield, Key } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [currency, setCurrency] = useState('RWF');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        await register({
          communityName,
          fullName,
          email,
          password,
          currency,
        });
      } else {
        await login({ email, password });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      await login({ email: userEmail, password: 'password123' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
        <div className="bg-slate-50/90 border-b border-slate-100 p-6 text-center">
          <div className="flex justify-center mb-3">
            <Logo size={44} />
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Financial & Disciplinary Operations for Grassroots Communities
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegistering && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Community / Choir Name</label>
                  <input
                    type="text"
                    required
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    placeholder="e.g. Chorale de Kigali"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Admin Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Jean-Paul M."
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="RWF">RWF (Rwanda)</option>
                      <option value="USD">USD ($)</option>
                      <option value="KES">KES (Kenya)</option>
                      <option value="UGX">UGX (Uganda)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.rw"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
            >
              {loading
                ? 'Processing...'
                : isRegistering
                ? 'Create Community Account'
                : 'Sign In to Portal'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              {isRegistering
                ? 'Already have an account? Sign in here'
                : "Need a new community workspace? Register here"}
            </button>
          </div>

          {/* Quick Demo Access Bar */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center mb-2">
              ⚡ Quick Demo 1-Click Login
            </span>
            <div className="mb-2">
              <button
                type="button"
                onClick={async () => {
                  setError(null);
                  setLoading(true);
                  try {
                    await login({ email: 'ishimwejustin67@gmail.com', password: 'Keeper@Admin!@' });
                  } catch (err: any) {
                    setError(err.response?.data?.message || 'Login failed');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full rounded-lg border border-amber-300 bg-amber-50/90 p-2 text-amber-950 font-bold hover:bg-amber-100 transition flex items-center justify-between shadow-2xs text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Super Admin (ishimwejustin67@gmail.com)</span>
                </div>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono">ROOT</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@keeper.rw')}
                className="rounded border border-purple-200 bg-purple-50/60 p-1.5 text-purple-900 font-semibold hover:bg-purple-100 transition text-left"
              >
                👑 Admin (President)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('accountant@keeper.rw')}
                className="rounded border border-emerald-200 bg-emerald-50/60 p-1.5 text-emerald-900 font-semibold hover:bg-emerald-100 transition text-left"
              >
                💰 Treasurer / Manager
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('discipline@keeper.rw')}
                className="rounded border border-blue-200 bg-blue-50/60 p-1.5 text-blue-900 font-semibold hover:bg-blue-100 transition text-left"
              >
                📋 Disciplinary Committee
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('member@keeper.rw')}
                className="rounded border border-slate-200 bg-slate-100/60 p-1.5 text-slate-800 font-semibold hover:bg-slate-200 transition text-left"
              >
                👀 Member / Viewer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
