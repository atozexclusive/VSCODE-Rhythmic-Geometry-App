import { useState } from 'react';
import { KeyRound, LogIn, LogOut, Mail, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './auth-provider';
import { openStripeBillingPortal, startStripeCheckout } from '../lib/billing-client';

export default function AccountPanel() {
  const {
    enabled,
    loading,
    user,
    account,
    effectivePlan,
    planOverride,
    setPlanOverride,
    signInWithMagicLink,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordReset,
    updatePassword,
    signOut,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [billingSubmitting, setBillingSubmitting] = useState(false);

  const accountPlanLabel =
    account?.plan === 'pro'
      ? account.access_source === 'beta'
        ? 'Beta Pro'
        : account.access_source === 'comped' || account.comped
          ? 'Comped Pro'
          : account.access_source === 'paid'
            ? 'Paid Pro'
            : 'Pro'
      : 'Free';
  const accessSourceLabel =
    account?.access_source === 'beta'
      ? 'beta'
      : account?.access_source === 'comped'
        ? 'comped'
        : account?.access_source === 'paid'
          ? 'paid'
          : 'none';
  const planLabel = effectivePlan === 'pro' ? 'Pro' : 'Free';

  const handleMagicLink = async () => {
    const nextEmail = email.trim();
    if (!nextEmail) {
      toast.error('Enter an email address first.');
      return;
    }

    setSubmitting(true);
    const { error } = await signInWithMagicLink(nextEmail);
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Magic link sent. Check your email to sign in.');
  };

  const handlePasswordSignIn = async () => {
    const nextEmail = email.trim();
    if (!nextEmail) {
      toast.error('Enter an email address first.');
      return;
    }
    if (!password) {
      toast.error('Enter your password first.');
      return;
    }

    setSubmitting(true);
    const { error } = await signInWithPassword(nextEmail, password);
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Signed in.');
  };

  const handlePasswordSignUp = async () => {
    const nextEmail = email.trim();
    if (!nextEmail) {
      toast.error('Enter an email address first.');
      return;
    }
    if (password.length < 8) {
      toast.error('Use at least 8 characters for your password.');
      return;
    }

    setSubmitting(true);
    const { error, existingUser } = await signUpWithPassword(nextEmail, password);
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (existingUser) {
      toast.message('That email already has an account. Sign in with a password or use reset to set one.');
      return;
    }

    toast.success('Account created. If email confirmation is on, check your inbox once.');
  };

  const handlePasswordReset = async () => {
    const nextEmail = email.trim();
    if (!nextEmail) {
      toast.error('Enter an email address first.');
      return;
    }

    setSubmitting(true);
    const { error } = await sendPasswordReset(nextEmail);
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Password reset link sent.');
  };

  const handleSetPassword = async () => {
    if (password.length < 8) {
      toast.error('Use at least 8 characters for your password.');
      return;
    }

    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setPassword('');
    toast.success('Password updated.');
  };

  const handleUpgradeToPro = async () => {
    setBillingSubmitting(true);
    try {
      await startStripeCheckout();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start Stripe checkout.');
    } finally {
      setBillingSubmitting(false);
    }
  };

  const handleManageBilling = async () => {
    setBillingSubmitting(true);
    try {
      await openStripeBillingPortal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open Stripe billing.');
    } finally {
      setBillingSubmitting(false);
    }
  };

  return (
    <div
      className="rounded-xl border p-3 space-y-3"
      style={{
        background: 'rgba(255,255,255,0.025)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Account
            </div>
            <div className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {enabled ? 'Sign in with email, password, or a magic link.' : 'Set Supabase env vars to enable accounts.'}
            </div>
          </div>
        <div
          className="rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em]"
          style={{
            background: enabled ? 'rgba(255,255,255,0.05)' : 'rgba(255,170,0,0.08)',
            border: `1px solid ${enabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,170,0,0.16)'}`,
            color: enabled ? 'rgba(255,255,255,0.62)' : '#FFAA00',
          }}
        >
          {enabled ? planLabel : 'Offline'}
        </div>
      </div>

      {loading ? (
        <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.46)' }}>
          Restoring session…
        </div>
      ) : !enabled ? (
        <div
          className="rounded-lg px-3 py-2 text-[10px] leading-relaxed"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.44)',
          }}
        >
          Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable sign-in.
        </div>
      ) : user ? (
        <div className="space-y-3">
          <div
            className="rounded-lg border px-3 py-2.5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center gap-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.84)' }}>
              <UserRound size={14} />
              <span className="truncate">{user.email ?? 'Signed in'}</span>
            </div>
            <div className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.42)' }}>
              Session is active on this device.
            </div>
          </div>

          <div
            className="rounded-lg border px-3 py-3 space-y-2"
            style={{
              background: 'rgba(255,255,255,0.025)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Account Plan
                </div>
                <div className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Real entitlement from Supabase.
                </div>
              </div>
              <div
                className="rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em]"
                style={{
                  background: account?.plan === 'pro' ? 'rgba(255,170,0,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${account?.plan === 'pro' ? 'rgba(255,170,0,0.16)' : 'rgba(255,255,255,0.08)'}`,
                  color: account?.plan === 'pro' ? '#FFAA00' : 'rgba(255,255,255,0.58)',
                }}
              >
                {accountPlanLabel}
              </div>
            </div>
            <div className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>
              Source: {accessSourceLabel}
            </div>
          </div>

          <div
            className="rounded-lg border px-3 py-3 space-y-2"
            style={{
              background: 'rgba(255,255,255,0.025)',
              borderColor: planOverride ? 'rgba(255,170,0,0.14)' : 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Pro Preview
                </div>
                <div className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Local override for testing. Turn it off to use the real account plan above.
                </div>
              </div>
              <div
                className="rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em]"
                style={{
                  background: planOverride ? 'rgba(255,170,0,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${planOverride ? 'rgba(255,170,0,0.16)' : 'rgba(255,255,255,0.08)'}`,
                  color: planOverride ? '#FFAA00' : 'rgba(255,255,255,0.58)',
                }}
              >
                {planOverride ? `${planLabel} preview` : 'Using account plan'}
              </div>
            </div>

            <button
              onClick={() => setPlanOverride(planOverride === 'pro' ? null : 'pro')}
              className="w-full rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center gap-2"
              style={{
                background: planOverride === 'pro' ? 'rgba(255,170,0,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${planOverride === 'pro' ? 'rgba(255,170,0,0.18)' : 'rgba(255,255,255,0.08)'}`,
                color: planOverride === 'pro' ? '#FFAA00' : 'rgba(255,255,255,0.74)',
              }}
            >
              {planOverride === 'pro' ? 'Turn Pro Preview Off' : 'Turn Pro Preview On'}
            </button>
          </div>

          <button
            onClick={() => void signOut()}
            className="w-full rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center gap-2"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.74)',
            }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <KeyRound size={14} style={{ color: 'rgba(255,255,255,0.48)' }} />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Set or change password"
              className="w-full bg-transparent text-[12px] focus:outline-none"
              style={{ color: 'rgba(255,255,255,0.82)' }}
            />
          </div>
          <button
            onClick={() => void handleSetPassword()}
            disabled={submitting}
            className="w-full rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center gap-2 disabled:opacity-60"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.82)',
            }}
          >
            <KeyRound size={14} />
            {submitting ? 'Saving…' : 'Set Password'}
          </button>
          {account?.plan !== 'pro' ? (
            <button
              onClick={() => void handleUpgradeToPro()}
              disabled={billingSubmitting}
              className="w-full rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: 'rgba(255,170,0,0.1)',
                border: '1px solid rgba(255,170,0,0.18)',
                color: '#FFAA00',
              }}
            >
              <LogIn size={14} />
              {billingSubmitting ? 'Opening Checkout…' : 'Upgrade To Pro'}
            </button>
          ) : account?.access_source === 'paid' ? (
            <button
              onClick={() => void handleManageBilling()}
              disabled={billingSubmitting}
              className="w-full rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.82)',
              }}
            >
              <KeyRound size={14} />
              {billingSubmitting ? 'Opening Billing…' : 'Manage Billing'}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className="rounded-lg border px-3 py-3 space-y-2"
            style={{
              background: 'rgba(255,255,255,0.025)',
              borderColor: planOverride ? 'rgba(255,170,0,0.14)' : 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Pro Preview
                </div>
                <div className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Local test mode stays available even when you are signed out.
                </div>
              </div>
              <div
                className="rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em]"
                style={{
                  background: planOverride ? 'rgba(255,170,0,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${planOverride ? 'rgba(255,170,0,0.16)' : 'rgba(255,255,255,0.08)'}`,
                  color: planOverride ? '#FFAA00' : 'rgba(255,255,255,0.58)',
                }}
              >
                {planOverride === 'pro' ? 'Pro test' : 'Free test'}
              </div>
            </div>

            <button
              onClick={() => setPlanOverride(planOverride === 'pro' ? 'free' : 'pro')}
              className="w-full rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center gap-2"
              style={{
                background: planOverride === 'pro' ? 'rgba(255,170,0,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${planOverride === 'pro' ? 'rgba(255,170,0,0.18)' : 'rgba(255,255,255,0.08)'}`,
                color: planOverride === 'pro' ? '#FFAA00' : 'rgba(255,255,255,0.74)',
              }}
            >
              {planOverride === 'pro' ? 'Switch To Free Preview' : 'Switch To Pro Preview'}
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <Mail size={14} style={{ color: 'rgba(255,255,255,0.48)' }} />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full bg-transparent text-[12px] focus:outline-none"
              style={{ color: 'rgba(255,255,255,0.82)' }}
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <KeyRound size={14} style={{ color: 'rgba(255,255,255,0.48)' }} />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full bg-transparent text-[12px] focus:outline-none"
              style={{ color: 'rgba(255,255,255,0.82)' }}
            />
          </div>
          <button
            onClick={() => void handleMagicLink()}
            disabled={submitting}
            className="w-full rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center gap-2 disabled:opacity-60"
            style={{
              background: 'rgba(0,255,170,0.1)',
              border: '1px solid rgba(0,255,170,0.18)',
              color: '#00FFAA',
            }}
          >
            <LogIn size={14} />
            {submitting ? 'Sending…' : 'Email Sign In'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => void handlePasswordSignIn()}
              disabled={submitting}
              className="w-full rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.82)',
              }}
            >
              <LogIn size={14} />
              {submitting ? 'Working…' : 'Password Sign In'}
            </button>
            <button
              onClick={() => void handlePasswordSignUp()}
              disabled={submitting}
              className="w-full rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: 'rgba(255,170,0,0.08)',
                border: '1px solid rgba(255,170,0,0.16)',
                color: '#FFAA00',
              }}
            >
              <UserRound size={14} />
              {submitting ? 'Working…' : 'Create Account'}
            </button>
          </div>
          <button
            onClick={() => void handlePasswordReset()}
            disabled={submitting}
            className="w-full rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center gap-2 disabled:opacity-60"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            <KeyRound size={14} />
            {submitting ? 'Working…' : 'Reset Password'}
          </button>
        </div>
      )}
    </div>
  );
}
