import { useState } from 'react';
import { Check, Crown, KeyRound, LogIn, LogOut, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
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
  const isPro = effectivePlan === 'pro';

  const amberTitleStyle = {
    color: '#FFD166',
    textShadow: '0 0 14px rgba(255,209,102,0.3)',
  } as const;
  const whiteTitleStyle = {
    color: 'rgba(244,250,255,0.92)',
    textShadow: '0 0 12px rgba(255,255,255,0.16)',
  } as const;
  const blueTitleStyle = {
    color: '#88CCFF',
    textShadow: '0 0 14px rgba(136,204,255,0.24)',
  } as const;
  const shellStyle = {
    background:
      'radial-gradient(circle at 18% 0%, rgba(255,209,102,0.12), transparent 34%), radial-gradient(circle at 100% 6%, rgba(136,204,255,0.1), transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.052), rgba(255,255,255,0.022))',
    borderColor: 'rgba(255,209,102,0.14)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.055), 0 18px 40px rgba(0,0,0,0.16)',
  } as const;
  const subtleCardStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.022))',
    borderColor: 'rgba(255,255,255,0.08)',
  } as const;
  const proCardStyle = {
    background:
      'radial-gradient(circle at 20% 0%, rgba(255,209,102,0.12), transparent 40%), linear-gradient(180deg, rgba(255,209,102,0.105), rgba(255,255,255,0.025))',
    borderColor: 'rgba(255,209,102,0.2)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 28px rgba(255,209,102,0.075)',
  } as const;
  const inputStyle = {
    background: 'rgba(255,255,255,0.035)',
    borderColor: 'rgba(255,255,255,0.08)',
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

  const renderPlanCards = () => (
    <div className="grid grid-cols-2 gap-2">
      <div
        className="rounded-2xl border px-3 py-3"
        style={!isPro ? { ...subtleCardStyle, borderColor: 'rgba(136,204,255,0.18)' } : subtleCardStyle}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={blueTitleStyle}>
            Free
          </div>
          {!isPro ? <Check size={13} style={{ color: '#88CCFF' }} /> : null}
        </div>
        <div className="mt-2 text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.48)' }}>
          Focused basics for learning the shape, rhythm, and edit flow.
        </div>
      </div>
      <div
        className="rounded-2xl border px-3 py-3"
        style={isPro ? proCardStyle : { ...proCardStyle, opacity: 0.92 }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={amberTitleStyle}>
            Pro
          </div>
          <Crown size={13} style={{ color: '#FFD166' }} />
        </div>
        <div className="mt-2 text-[10px] leading-relaxed" style={{ color: 'rgba(255,239,195,0.68)' }}>
          Unlock scenes, export, sound, canvas, color, and advanced tools.
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-[1.45rem] border p-3.5 space-y-3" style={shellStyle}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background: isPro ? '#FFD166' : '#88CCFF',
                boxShadow: isPro ? '0 0 14px rgba(255,209,102,0.5)' : '0 0 14px rgba(136,204,255,0.42)',
              }}
            />
            <div className="text-[12px] font-mono uppercase tracking-[0.22em]" style={amberTitleStyle}>
              Account
            </div>
          </div>
          <div className="mt-1 text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.54)' }}>
            {enabled
              ? 'Keep the free path focused, or unlock the full instrument with Pro.'
              : 'Accounts are offline until Supabase is configured.'}
          </div>
        </div>
        <div
          className="rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em]"
          style={{
            background: enabled
              ? isPro
                ? 'rgba(255,209,102,0.1)'
                : 'rgba(136,204,255,0.08)'
              : 'rgba(255,170,0,0.08)',
            border: `1px solid ${
              enabled
                ? isPro
                  ? 'rgba(255,209,102,0.2)'
                  : 'rgba(136,204,255,0.16)'
                : 'rgba(255,170,0,0.16)'
            }`,
            color: enabled ? (isPro ? '#FFD166' : '#88CCFF') : '#FFAA00',
          }}
        >
          {enabled ? planLabel : 'Offline'}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border px-3 py-3 text-[11px]" style={subtleCardStyle}>
          Restoring session…
        </div>
      ) : !enabled ? (
        <div
          className="rounded-2xl border px-3 py-3 text-[10px] leading-relaxed"
          style={{ ...subtleCardStyle, color: 'rgba(255,255,255,0.46)' }}
        >
          Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable sign-in.
        </div>
      ) : user ? (
        <div className="space-y-3">
          <div className="rounded-2xl border px-3 py-3" style={isPro ? proCardStyle : subtleCardStyle}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.86)' }}>
                  <UserRound size={14} />
                  <span className="truncate">{user.email ?? 'Signed in'}</span>
                </div>
                <div className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.42)' }}>
                  {isPro ? `Access source: ${accessSourceLabel}.` : 'Signed in on the Free plan.'}
                </div>
              </div>
              <div
                className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em]"
                style={{
                  background: isPro ? 'rgba(255,209,102,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isPro ? 'rgba(255,209,102,0.18)' : 'rgba(255,255,255,0.08)'}`,
                  color: isPro ? '#FFD166' : 'rgba(255,255,255,0.62)',
                }}
              >
                {accountPlanLabel}
              </div>
            </div>
          </div>

          {renderPlanCards()}

          {account?.plan !== 'pro' ? (
            <button
              onClick={() => void handleUpgradeToPro()}
              disabled={billingSubmitting}
              className="w-full rounded-2xl px-3 py-3 text-[11px] font-mono uppercase tracking-[0.16em] flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: 'linear-gradient(180deg, rgba(255,209,102,0.18), rgba(255,170,0,0.09))',
                border: '1px solid rgba(255,209,102,0.24)',
                color: '#FFD166',
                boxShadow: '0 0 24px rgba(255,209,102,0.08)',
              }}
            >
              <Sparkles size={14} />
              {billingSubmitting ? 'Opening…' : 'Upgrade To Pro'}
            </button>
          ) : null}

          <div className="rounded-2xl border px-3 py-3 space-y-2" style={subtleCardStyle}>
            <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={whiteTitleStyle}>
              Security
            </div>
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={inputStyle}>
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
              className="w-full rounded-xl px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.82)',
              }}
            >
              <ShieldCheck size={14} />
              {submitting ? 'Saving…' : 'Set Password'}
            </button>
          </div>

          <button
            onClick={() => void signOut()}
            className="w-full rounded-xl px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center gap-2"
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
      ) : (
        <div className="space-y-3">
          {renderPlanCards()}

          <div className="rounded-2xl border px-3 py-3 space-y-3" style={subtleCardStyle}>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.18em]" style={whiteTitleStyle}>
                {isCreateMode ? 'Create Account' : 'Sign In'}
              </div>
              <div className="mt-1 text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.44)' }}>
                {isCreateMode
                  ? 'Create a login so saved scenes and Pro access can follow you.'
                  : 'Sign in to restore saved scenes and Pro access.'}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={inputStyle}>
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
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={inputStyle}>
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
              className="w-full rounded-xl px-3 py-2.5 text-[11px] font-mono uppercase tracking-[0.14em] flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: 'linear-gradient(180deg, rgba(0,255,170,0.14), rgba(0,255,170,0.07))',
                border: '1px solid rgba(0,255,170,0.2)',
                color: '#72F1B8',
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
                style={{ color: '#88CCFF' }}
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
        </div>
      )}
    </div>
  );
}
