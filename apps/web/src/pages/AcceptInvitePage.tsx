import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, User, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import api from '../lib/api';

export const AcceptInvitePage: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteData, setInviteData] = useState<{
    email: string;
    role: string;
    tenantName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token found in the link. Please check your invitation email.');
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/invitations/validate?token=${token}`);
        setInviteData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'This invitation link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Please enter your full name');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/invitations/accept', {
        token,
        fullName: fullName.trim(),
        password,
      });

      localStorage.setItem('keeper_token', res.data.token);
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 relative overflow-hidden">
        {/* Top Accent Graphic */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-400" />

        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 shadow-xs">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Join Keeper</h1>
          <p className="text-xs text-slate-500 mt-1">
            Community Membership & Treasury Platform
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
            <p className="mt-3 text-xs text-slate-500">Validating your invitation link...</p>
          </div>
        ) : error ? (
          <div className="space-y-6">
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-center">
              <AlertCircle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-rose-800">{error}</p>
            </div>
            <a
              href="/login"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              Back to Login
            </a>
          </div>
        ) : success ? (
          <div className="text-center py-8 space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Welcome aboard!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your account is active. Redirecting you to your community portal...
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                  {inviteData?.tenantName?.charAt(0) || 'K'}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-emerald-950">
                    {inviteData?.tenantName}
                  </h3>
                  <p className="text-[11px] text-emerald-700">
                    Role: <span className="font-semibold uppercase tracking-wider">{inviteData?.role}</span>
                  </p>
                  <p className="text-[10px] text-emerald-600/80 truncate">
                    Invited: {inviteData?.email}
                  </p>
                </div>
              </div>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 transition mt-2 cursor-pointer"
              >
                <span>{submitting ? 'Setting up account...' : 'Accept Invitation & Join'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
