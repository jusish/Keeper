import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { SearchableSelect } from '../components/common/SearchableSelect';
import {
  LogIn,
  UserPlus,
  AlertCircle,
  Shield,
  Coins,
  CheckCircle,
  Users,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

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

  const handleQuickLogin = async (userEmail: string, pass: string = 'password123') => {
    setError(null);
    setLoading(true);
    try {
      await login({ email: userEmail, password: pass });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans">
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid lg:grid-cols-12 min-h-[640px]">
        {/* Left Column: Branded Illustration & Feature Highlights (Hidden on mobile, only form shown) */}
        <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 p-8 lg:p-12 text-white flex-col justify-between relative overflow-hidden">
          {/* Subtle Background Decorative SVG Circles & Glows */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-inner">
                <Logo size={36} showText={false} />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                  Keeper
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                    Platform
                  </span>
                </span>
                <p className="text-xs text-emerald-200/80">Community Treasury & Accountability</p>
              </div>
            </div>
          </div>

          {/* Central Hero Illustration & Visuals */}
          <div className="my-8 relative z-10 flex flex-col items-center">
            {/* Custom SVG Modern Vector Art */}
            <div className="w-full max-w-md relative">
              <svg viewBox="0 0 500 320" className="w-full h-auto drop-shadow-2xl">
                <defs>
                  <linearGradient id="gradEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#047857" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="gradTeal" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="gradGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="1" />
                  </linearGradient>
                  <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#064e3b" floodOpacity="0.4" />
                  </filter>
                </defs>

                {/* Base platform */}
                <ellipse cx="250" cy="270" rx="200" ry="36" fill="url(#gradEmerald)" opacity="0.3" />
                <ellipse cx="250" cy="265" rx="160" ry="24" fill="url(#gradTeal)" opacity="0.25" />

                {/* Floating Central Dashboard Card */}
                <g filter="url(#shadow)">
                  <rect x="110" y="50" width="280" height="180" rx="20" fill="#ffffff" fillOpacity="0.95" />
                  {/* Card Header */}
                  <rect x="130" y="70" width="80" height="12" rx="6" fill="#10b981" />
                  <rect x="130" y="90" width="130" height="8" rx="4" fill="#cbd5e1" />
                  <circle cx="360" cy="76" r="14" fill="#ecfdf5" />
                  <path d="M354 76 L358 80 L367 71" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

                  {/* Growth Chart Wave */}
                  <path d="M 130 180 Q 180 160 220 170 T 310 130 T 370 110" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
                  <path d="M 130 180 Q 180 160 220 170 T 310 130 T 370 110 L 370 195 L 130 195 Z" fill="url(#gradEmerald)" fillOpacity="0.12" />

                  {/* Metric Pills */}
                  <rect x="130" y="112" width="70" height="24" rx="8" fill="#f0fdf4" stroke="#a7f3d0" strokeWidth="1" />
                  <text x="140" y="128" fill="#065f46" fontSize="10" fontWeight="bold">98.4% Paid</text>

                  <rect x="210" y="112" width="80" height="24" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="218" y="128" fill="#334155" fontSize="10" fontWeight="bold">RWF 4.2M</text>
                </g>

                {/* Left Floating Badge: Members */}
                <g filter="url(#shadow)">
                  <rect x="40" y="130" width="105" height="74" rx="16" fill="#ffffff" />
                  <circle cx="68" cy="155" r="14" fill="#ecfdf5" />
                  <circle cx="68" cy="152" r="5" fill="#059669" />
                  <path d="M 60 164 Q 68 158 76 164" stroke="#059669" strokeWidth="2" fill="none" />
                  <rect x="90" y="148" width="40" height="6" rx="3" fill="#059669" />
                  <rect x="90" y="160" width="30" height="5" rx="2.5" fill="#94a3b8" />
                  <text x="52" y="192" fill="#047857" fontSize="9" fontWeight="bold">120+ Active</text>
                </g>

                {/* Right Floating Badge: Security Shield */}
                <g filter="url(#shadow)">
                  <rect x="350" y="135" width="115" height="74" rx="16" fill="#ffffff" />
                  <circle cx="380" cy="160" r="14" fill="#eff6ff" />
                  <path d="M380 151 L389 154 V162 C389 167 380 171 380 171 C380 171 371 167 371 162 V154 Z" fill="#3b82f6" />
                  <rect x="402" y="152" width="50" height="6" rx="3" fill="#2563eb" />
                  <rect x="402" y="164" width="35" height="5" rx="2.5" fill="#94a3b8" />
                  <text x="364" y="196" fill="#1d4ed8" fontSize="9" fontWeight="bold">Tamper Proof</text>
                </g>

                {/* Sparkling Gold Coins */}
                <circle cx="105" cy="85" r="15" fill="url(#gradGold)" filter="url(#shadow)" />
                <text x="101" y="90" fill="#78350f" fontSize="13" fontWeight="900">R</text>

                <circle cx="410" cy="70" r="18" fill="url(#gradGold)" filter="url(#shadow)" />
                <text x="404" y="76" fill="#78350f" fontSize="15" fontWeight="900">$</text>
              </svg>
            </div>

            {/* Feature Bullets */}
            <div className="grid grid-cols-2 gap-3 mt-6 w-full max-w-lg text-left">
              <div className="flex items-start gap-2 bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                <CheckCircle className="h-4 w-4 text-emerald-300 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-snug">
                  <span className="font-bold text-white block">Dynamic Contribution Plans</span>
                  <span className="text-emerald-200/70">Flexible monthly, weekly & event dues.</span>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                <CheckCircle className="h-4 w-4 text-emerald-300 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-snug">
                  <span className="font-bold text-white block">Finalized & Locked Sessions</span>
                  <span className="text-emerald-200/70">Reliable attendance with documented reasons.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Trust Quote */}
          <div className="relative z-10 border-t border-emerald-700/60 pt-4">
            <p className="text-xs text-emerald-100/90 italic">
              "Built for associations, cultural groups, youth initiatives, and grassroots communities to operate with full transparency and trust."
            </p>
          </div>
        </div>

        {/* Right Column: Clean Light-Themed Login / Register Form (Full width on mobile) */}
        <div className="col-span-12 lg:col-span-6 xl:col-span-5 bg-white p-6 sm:p-10 flex flex-col justify-center">
          {/* Mobile-only brand logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <Logo size={36} />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isRegistering ? 'Register Community' : 'Welcome Back'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isRegistering
                ? 'Create a unified workspace for your group or association.'
                : 'Sign in to access your treasury, members, and reports.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegistering && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Community / Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    placeholder="e.g. Kigali Unity Association"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Admin Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Jean-Paul M."
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
                    <SearchableSelect
                      options={[
                        { value: 'RWF', label: 'RWF (Rwanda)' },
                        { value: 'USD', label: 'USD ($)' },
                        { value: 'KES', label: 'KES (Kenya)' },
                        { value: 'UGX', label: 'UGX (Uganda)' },
                      ]}
                      value={currency}
                      onChange={setCurrency}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.rw"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Password *</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50 mt-1"
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
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              {isRegistering
                ? 'Already have an account? Sign in here'
                : 'Need a new community workspace? Register here'}
            </button>
          </div>

          {/* Quick Demo Access Bar */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center mb-2.5">
              ⚡ Quick 1-Click Demo Login
            </span>

            <div className="mb-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('ishimwejustin67@gmail.com', 'Keeper@Admin!@')}
                className="w-full rounded-xl border border-amber-300 bg-amber-50/90 p-2 text-amber-950 font-bold hover:bg-amber-100 transition flex items-center justify-between shadow-2xs text-xs"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Super Admin Portal</span>
                </div>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-mono font-bold">
                  ROOT
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@keeper.rw')}
                className="rounded-xl border border-purple-200 bg-purple-50/70 p-2 text-purple-900 font-semibold hover:bg-purple-100 transition text-left"
              >
                👑 President / Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('accountant@keeper.rw')}
                className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 text-emerald-900 font-semibold hover:bg-emerald-100 transition text-left"
              >
                💰 Treasurer
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('discipline@keeper.rw')}
                className="rounded-xl border border-blue-200 bg-blue-50/70 p-2 text-blue-900 font-semibold hover:bg-blue-100 transition text-left"
              >
                📋 Disciplinary Team
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('member@keeper.rw')}
                className="rounded-xl border border-slate-200 bg-slate-100/70 p-2 text-slate-800 font-semibold hover:bg-slate-200 transition text-left"
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
