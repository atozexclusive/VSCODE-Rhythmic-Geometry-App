import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, KeyRound, LogIn, LogOut, Mail, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../components/auth-provider';
import { LandingExperience } from '../components/landing/LandingExperience';

export const Route = createFileRoute('/')({
  component: OrbitalPolymeterLanding,
});

function OrbitalPolymeterLanding() {
  const { enabled, loading, user, account, signInWithPassword, signUpWithPassword, sendPasswordReset, signOut } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'sign-in' | 'create-account'>('sign-in');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const planLabel = account?.plan === 'pro' ? (account.comped ? 'Pro Included' : 'Pro') : 'Free';
  const isCreateMode = authMode === 'create-account';
  const handleSignIn = async () => {
    const email = accountEmail.trim();
    if (!email) {
      toast.error('Enter an email address first.');
      return;
    }
    if (!accountPassword) {
      toast.error('Enter your password first.');
      return;
    }

    setSubmitting(true);
    const { error } = await signInWithPassword(email, accountPassword);
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Signed in.');
    setAccountOpen(false);
  };

  const handleCreateAccount = async () => {
    const email = accountEmail.trim();
    if (!email) {
      toast.error('Enter an email address first.');
      return;
    }
    if (accountPassword.length < 8) {
      toast.error('Use at least 8 characters for your password.');
      return;
    }

    setSubmitting(true);
    const { error, existingUser } = await signUpWithPassword(email, accountPassword);
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (existingUser) {
      setAuthMode('sign-in');
      toast.message('That email already has an account. Sign in or reset your password.');
      return;
    }

    toast.success('Account created. Sign in to continue.');
    setAuthMode('sign-in');
  };

  const handlePasswordReset = async () => {
    const email = accountEmail.trim();
    if (!email) {
      toast.error('Enter an email address first.');
      return;
    }

    setSubmitting(true);
    const { error } = await sendPasswordReset(email);
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Password reset email sent.');
  };

  return (
    <div className="min-h-screen bg-[#090a10] text-white">
      {accountOpen && (
        <>
          <button
            type="button"
            aria-label="Close account panel"
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
            onClick={() => setAccountOpen(false)}
          />
          <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-md rounded-[1.6rem] border border-white/10 bg-[#0d1017]/94 p-5 shadow-[0_40px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/62">Account</div>
                <div className="mt-2 text-sm text-white/54">
                  {enabled ? 'Use one account across the site and the instrument.' : 'Accounts are not available yet.'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountOpen(false)}
                className="rounded-full border border-white/10 p-2 text-white/58 transition hover:border-white/18 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            {loading ? (
              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/58">
                Restoring session…
              </div>
            ) : !enabled ? (
              <div className="mt-5 rounded-2xl border border-[#ffaa00]/18 bg-[#ffaa00]/8 px-4 py-3 text-sm leading-7 text-white/62">
                Website sign-in is unavailable until the auth environment is connected.
              </div>
            ) : user ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center gap-2 text-sm text-white/84">
                    <UserRound size={15} />
                    <span className="truncate">{user.email ?? 'Signed in'}</span>
                  </div>
                  <div className="mt-2 text-[11px] font-mono uppercase tracking-[0.16em] text-white/42">
                    {planLabel} access
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/launch"
                    className="inline-flex items-center gap-2 rounded-full border border-[#00ffaa]/25 bg-[#00ffaa]/12 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[#00ffaa] transition hover:bg-[#00ffaa]/18"
                    onClick={() => setAccountOpen(false)}
                  >
                    Choose Mode
                    <ArrowRight size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-white/72 transition hover:border-white/20 hover:text-white"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-white/58">
                  {isCreateMode ? 'Create an account to keep your work in sync.' : 'Sign in to return to your saved work and Pro access.'}
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <Mail size={15} className="text-white/48" />
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(event) => setAccountEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <KeyRound size={15} className="text-white/48" />
                  <input
                    type="password"
                    value={accountPassword}
                    onChange={(event) => setAccountPassword(event.target.value)}
                    placeholder="Password"
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void (isCreateMode ? handleCreateAccount() : handleSignIn())}
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#00ffaa]/25 bg-[#00ffaa]/12 px-4 py-3 text-[11px] font-mono uppercase tracking-[0.14em] text-[#00ffaa] transition hover:bg-[#00ffaa]/18 disabled:opacity-60"
                >
                  <LogIn size={14} />
                  {submitting ? 'Working…' : isCreateMode ? 'Create Account' : 'Sign In'}
                </button>
                <div className="flex items-center justify-between gap-3 px-1">
                  <button
                    type="button"
                    onClick={() => setAuthMode(isCreateMode ? 'sign-in' : 'create-account')}
                    className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#88CCFF]"
                  >
                    {isCreateMode ? 'Already have an account? Sign in' : 'Need an account? Create one'}
                  </button>
                  {!isCreateMode ? (
                    <button
                      type="button"
                      onClick={() => void handlePasswordReset()}
                      disabled={submitting}
                      className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/58 disabled:opacity-60"
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <LandingExperience isPro={account?.plan === 'pro'} isSignedIn={Boolean(user)} onAccountOpen={() => setAccountOpen(true)} />
    </div>
  );
}
