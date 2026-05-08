import { useState } from 'react';
import { KeyRound, LogIn, LogOut, Mail, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './auth-provider';
import { startStripeCheckout } from '../lib/billing-client';

export default function AccountPanel() {
  const {
    enabled,
    loading,
    user,
    account,
    effectivePlan,
    planOverride,
    setPlanOverride,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordReset,
    updatePassword,
    signOut,
  } = useAuth();
  const [authMode, setAuthMode] = useState<'sign-in' | 'create-account'>('sign-in');
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
  const isCreateMode = authMode === 'create-account';
  const amberTitleStyle = {
    color: '#FFD166',
    textShadow: '0 0 14px rgba(255,209,102,0.26)',
  } as const;
  const whiteTitleStyle = {
    color: 'rgba(244,250,255,0.9)',
    textShadow: '0 0 12px rgba(255,255,255,0.14)',
  } as const;
  const subtleCardStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.022))',
    borderColor: 'rgba(255,255,255,0.08)',
  } as const;
  const proCardStyle = {
    background: 'linear-gradient(180deg, rgba(255,209,102,0.105), rgba(255,255,255,0.025))',
    borderColor: 'rgba(255,209,102,0.18)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 26px rgba(255,209,102,0.07)',
  } as const;

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
      setAuthMode('sign-in');
      toast.message('That email already has an account. Sign in or reset the password.');
      return;
    }

    toast.success('Account created. You can sign in now.');
    setAuthMode('sign-in');
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

  return (
    <div
      className="rounded-[1.35rem] border p-3.5 space-y-3"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.024))',
        borderColor: 'rgba(255,209,102,0.12)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 34px rgba(0,0,0,0.12)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
          <div>
            <div
              className="text-[12px] font-mono uppercase tracking-[0.22em]"
              style={amberTitleStyle}
            >
              Account
            </div>
            <div className="mt-1 text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)' }}>
              {enabled ? 'Choose Free or Pro, then sign in when you want scenes to follow you.' : 'Accounts are offline until Supabase is configured.'}
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
            className="rounded-2xl border px-3 py-3"
            style={subtleCardStyle}
          >
            <div className="flex items-center gap-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.84)' }}>
              <UserRound size={14} />
              <span className="truncate">{user.email ?? 'Signed in'}</span>
            </div>
            <div className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.42)' }}>
              Account is active on this device.
            </div>
          </div>

          <div
            className="rounded-2xl border px-3 py-3 space-y-2"
            style={account?.plan === 'pro' ? proCardStyle : subtleCardStyle}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={account?.plan === 'pro' ? amberTitleStyle : whiteTitleStyle}>
                  {account?.plan === 'pro' ? 'Pro Is Active' : 'Free Plan'}
                </div>
                <div className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {account?.plan === 'pro' ? 'Everything is unlocked on this login.' : 'Core tools stay focused for learning.'}
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
              {account?.plan === 'pro'
                ? `Access source: ${accessSourceLabel}.`
                : 'Upgrade when you want saved scenes, deeper exports, and the locked creative controls.'}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={subtleCardStyle}>
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
          <div className="grid grid-cols-2 gap-2">
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
                {billingSubmitting ? 'Opening…' : 'Upgrade'}
              </button>
            ) : account?.access_source === 'paid' ? (
              <div
                className="w-full rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center"
                style={{
                  background: 'rgba(255,170,0,0.08)',
                  border: '1px solid rgba(255,170,0,0.16)',
                  color: '#FFAA00',
                }}
              >
                Purchased
              </div>
            ) : (
              <div />
            )}
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
          </div>
          <div
            className="rounded-lg border px-3 py-2.5"
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderColor: planOverride ? 'rgba(255,170,0,0.14)' : 'rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.42)' }}>
                  Pro Preview
                </div>
                <div className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.34)' }}>
                  Temporary testing switch.
                </div>
              </div>
              <button
                onClick={() => setPlanOverride(planOverride === 'pro' ? null : 'pro')}
                className="rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em]"
                style={{
                  background: planOverride ? 'rgba(255,170,0,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${planOverride ? 'rgba(255,170,0,0.16)' : 'rgba(255,255,255,0.08)'}`,
                  color: planOverride ? '#FFAA00' : 'rgba(255,255,255,0.58)',
                }}
              >
                {planOverride ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border px-3 py-3" style={subtleCardStyle}>
              <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={whiteTitleStyle}>
                Free
              </div>
              <div className="mt-1 text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.46)' }}>
                Learn the basics with a tighter set of controls.
              </div>
            </div>
            <div className="rounded-2xl border px-3 py-3" style={proCardStyle}>
              <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={amberTitleStyle}>
                Pro
              </div>
              <div className="mt-1 text-[10px] leading-relaxed" style={{ color: 'rgba(255,239,195,0.68)' }}>
                Unlock scenes, exports, sound, and deeper controls.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border px-3 py-3 space-y-3" style={subtleCardStyle}>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.18em]" style={whiteTitleStyle}>
                {isCreateMode ? 'Create Account' : 'Sign In'}
              </div>
              <div className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.42)' }}>
                {isCreateMode ? 'Create a login so saved scenes can follow you.' : 'Restore saved scenes and Pro access.'}
              </div>
            </div>

          <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
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
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
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
            onClick={() => void (isCreateMode ? handlePasswordSignUp() : handlePasswordSignIn())}
            disabled={submitting}
            className="w-full rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center gap-2 disabled:opacity-60"
            style={{
              background: 'rgba(0,255,170,0.1)',
              border: '1px solid rgba(0,255,170,0.18)',
              color: '#00FFAA',
            }}
          >
            <LogIn size={14} />
            {submitting ? 'Working…' : isCreateMode ? 'Create Account' : 'Sign In'}
          </button>
          <div className="flex items-center justify-between gap-3 px-1">
            <button
              type="button"
              onClick={() => setAuthMode(isCreateMode ? 'sign-in' : 'create-account')}
              className="text-[10px] font-mono uppercase tracking-[0.14em]"
              style={{ color: isCreateMode ? '#88CCFF' : '#88CCFF' }}
            >
              {isCreateMode ? 'Already have an account? Sign in' : 'Need an account? Create one'}
            </button>
            {!isCreateMode ? (
              <button
                type="button"
                onClick={() => void handlePasswordReset()}
                disabled={submitting}
                className="text-[10px] font-mono uppercase tracking-[0.14em] disabled:opacity-60"
                style={{ color: 'rgba(255,255,255,0.58)' }}
              >
                Forgot password?
              </button>
            ) : null}
          </div>
          </div>
          <div
            className="rounded-lg border px-3 py-2.5"
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderColor: planOverride ? 'rgba(255,170,0,0.14)' : 'rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.42)' }}>
                  Pro Preview
                </div>
                <div className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.34)' }}>
                  Temporary testing switch.
                </div>
              </div>
              <button
                onClick={() => setPlanOverride(planOverride === 'pro' ? 'free' : 'pro')}
                className="rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em]"
                style={{
                  background: planOverride ? 'rgba(255,170,0,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${planOverride ? 'rgba(255,170,0,0.16)' : 'rgba(255,255,255,0.08)'}`,
                  color: planOverride ? '#FFAA00' : 'rgba(255,255,255,0.58)',
                }}
              >
                {planOverride === 'pro' ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
