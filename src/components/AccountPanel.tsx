import { useState } from 'react';
import { LogIn, LogOut, Mail, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './auth-provider';

export default function AccountPanel() {
  const { enabled, loading, user, account, signInWithMagicLink, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const planLabel = account?.plan === 'pro' ? (account.comped ? 'Comped Pro' : 'Pro') : 'Free';

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
            {enabled ? 'Sign in with a magic link.' : 'Set Supabase env vars to enable accounts.'}
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
      ) : (
        <div className="space-y-2">
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
        </div>
      )}
    </div>
  );
}
