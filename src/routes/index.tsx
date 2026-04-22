import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, CircleDot, GalleryVerticalEnd, KeyRound, Layers3, LogIn, LogOut, Mail, MonitorPlay, Play, Sparkles, SquarePlay, UserRound, Waves, X } from 'lucide-react';
import { toast } from 'sonner';
import { BUILT_IN_SCENES } from './app';
import { useAuth } from '../components/auth-provider';
import { SITE_MODE_CARDS, type SiteModeId, getModeLaunchHref } from '../lib/siteModes';

export const Route = createFileRoute('/')({
  component: OrbitalPolymeterLanding,
});

const websiteStandardImage = '/scene-captures/website_standard_replacement.png';
const websiteSceneOverrides: Record<string, string> = {
  glass_cathedral: websiteStandardImage,
  metallic_whorl: '/scene-captures/website_metallic_whorl.png',
  rose_engine: '/scene-captures/website_rose_engine.png',
  prime_ritual: '/scene-captures/website_prime_ritual.png',
};

const showcaseCards = BUILT_IN_SCENES.map((scene, index) => ({
  id: scene.id,
  title: scene.name,
  tag: index === 0 ? 'Featured Orbit Scene' : 'Orbit Scene',
  description: scene.description,
  accent: ['#00FFAA', '#88CCFF', '#FFAA00', '#66DDFF', '#AA88FF', '#AA88FF', '#44E0B0', '#FF7799'][index % 8],
  image: websiteSceneOverrides[scene.id] ?? scene.thumbnailDataUrl,
}));

const featureGrid = [
  { icon: GalleryVerticalEnd, title: 'Scene Library', text: 'Built-in scenes give Orbit, Study, and Riff a strong starting point instead of a blank canvas.' },
  { icon: SquarePlay, title: 'Focused Editors', text: 'Open a close writing view when you want to shape one ring or one groove directly.' },
  { icon: MonitorPlay, title: 'Loop Capture', text: 'Record short moving studies directly from the live canvas.' },
  { icon: Play, title: 'Presentation Mode', text: 'Strip the chrome back for cleaner watching, sharing, and playback.' },
  { icon: Layers3, title: 'Desktop + Mobile', text: 'A wide desktop instrument or a tighter mobile flow, without changing the core ideas.' },
  { icon: Waves, title: 'Three Clear Entries', text: 'Orbit is for discovery, Study is for clarity, and Riff is for writing.' },
] as const;

const proHighlights = [
  {
    label: 'Keep',
    title: 'A Living Library',
    text: 'Save the scenes worth returning to and build a body of work over time.',
  },
  {
    label: 'Bring Out',
    title: 'Still And Motion',
    text: 'Carry the work beyond the instrument as clean stills and short moving loops.',
  },
  {
    label: 'Shape',
    title: 'The Instrument',
    text: 'Tune color, tone, and structure with a more deliberate hand.',
  },
  {
    label: 'Open',
    title: 'Richer Studies',
    text: 'Step into premium scenes, deeper randomization, and broader control across every mode.',
  },
] as const;

function getModeIcon(modeId: SiteModeId) {
  if (modeId === 'orbital') {
    return CircleDot;
  }
  if (modeId === 'polyrhythm-study') {
    return Layers3;
  }
  return SquarePlay;
}

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

      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, rgba(0,255,170,0.08), transparent 28%), radial-gradient(circle at 78% 22%, rgba(51,136,255,0.08), transparent 24%), radial-gradient(circle at 72% 70%, rgba(255,51,102,0.08), transparent 22%), linear-gradient(180deg, #090a10 0%, #0d1017 48%, #090a10 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,0.55), rgba(0,0,0,0.9))',
          }}
        />
        <div className="absolute left-1/2 top-28 h-[44rem] w-[44rem] -translate-x-1/2 rounded-full border border-white/6" />
        <div className="absolute left-1/2 top-28 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full border border-[#3388ff]/10" />
        <div className="absolute left-1/2 top-28 h-[21rem] w-[21rem] -translate-x-1/2 rounded-full border border-[#ff3366]/10" />
        <div className="absolute left-1/2 top-28 h-[12rem] w-[12rem] -translate-x-1/2 rounded-full border border-[#00ffaa]/12" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/6 bg-[#090a10]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="group block">
            <div className="text-[15px] font-medium uppercase tracking-[0.34em] text-white/82 transition-colors group-hover:text-white sm:text-[17px]">
              Rhythmic Geometry
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-[12px] font-mono uppercase tracking-[0.14em] text-white/54 md:flex">
            <a href="#modes" className="transition-colors hover:text-white">Modes</a>
            <a href="#showcase" className="transition-colors hover:text-white">Showcase</a>
            <a href="#why" className="transition-colors hover:text-white">Why It Matters</a>
            <a href="#export" className="transition-colors hover:text-white">Export</a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-white/72 transition hover:border-white/20 hover:text-white"
            >
              {user ? <UserRound size={14} /> : <LogIn size={14} />}
              {user ? 'Account' : 'Sign In'}
            </button>
            <a
              href="#modes"
              className="hidden rounded-full border border-white/10 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-white/72 transition hover:border-white/20 hover:text-white sm:inline-flex"
            >
              See Modes
            </a>
            <Link
              to="/launch"
              className="inline-flex items-center gap-2 rounded-full border border-[#00ffaa]/25 bg-[#00ffaa]/12 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[#00ffaa] transition hover:bg-[#00ffaa]/18"
            >
              Launch App
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-mono uppercase tracking-[0.16em] text-white/62">
                <Sparkles size={14} className="text-[#00ffaa]" />
                Three instruments for rhythmic form
              </div>
              <h1 className="mt-8 max-w-3xl text-5xl font-light tracking-[-0.058em] leading-[0.98] text-white sm:text-6xl lg:text-[4.9rem]">
                See form. Compare rhythm. Write the groove.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-white/62 sm:text-lg">
                Set the constraints. Watch the structure appear.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/44 sm:text-base">
                Rhythmic Geometry opens into three entry points. Orbit is the moving surface. Study reveals shared rhythm relationships. Riff lets you build a groove against a clear bar frame.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {SITE_MODE_CARDS.map((mode) => (
                  <div
                    key={mode.id}
                    className="rounded-[1.15rem] border border-white/8 bg-white/[0.03] px-4 py-3"
                  >
                    <div
                      className="text-[10px] font-mono uppercase tracking-[0.16em]"
                      style={{ color: mode.accent }}
                    >
                      {mode.name}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/58">
                      {mode.bestFor}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  to="/launch"
                  className="inline-flex items-center gap-2 rounded-full border border-[#00ffaa]/25 bg-[#00ffaa]/12 px-5 py-3 text-[12px] font-mono uppercase tracking-[0.14em] text-[#00ffaa] transition hover:bg-[#00ffaa]/18"
                >
                  Choose A Mode
                  <ArrowRight size={15} />
                </Link>
                <a
                  href="#showcase"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-[12px] font-mono uppercase tracking-[0.14em] text-white/74 transition hover:border-white/20 hover:text-white"
                >
                  View Structures
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_50%_40%,rgba(0,255,170,0.14),transparent_34%),radial-gradient(circle_at_66%_58%,rgba(51,136,255,0.14),transparent_30%),radial-gradient(circle_at_42%_66%,rgba(255,51,102,0.12),transparent_26%)] blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/72">Choose Your Entry</div>
                    <div className="mt-2 text-[11px] font-mono text-white/38">Start with the mode that matches what you want to do first.</div>
                  </div>
                  <Link
                    to="/launch"
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-white/74 transition hover:border-white/20 hover:text-white"
                  >
                    Compare
                  </Link>
                </div>

                <div className="mt-5 grid gap-3">
                  {SITE_MODE_CARDS.map((mode) => {
                    const ModeIcon = getModeIcon(mode.id);

                    return (
                      <a
                        key={mode.id}
                        href={getModeLaunchHref(mode.id)}
                        className="group rounded-[1.4rem] border border-white/8 bg-[#090a10]/88 p-4 transition hover:border-white/14 hover:bg-[#0c0f16]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: mode.accent }}>
                              {mode.eyebrow}
                            </div>
                            <div className="mt-2 text-xl font-light text-white">
                              {mode.name}
                            </div>
                          </div>
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border"
                            style={{
                              background: `${mode.accent}12`,
                              borderColor: `${mode.accent}22`,
                              color: mode.accent,
                            }}
                          >
                            <ModeIcon size={16} />
                          </div>
                        </div>
                        <div className="mt-4 overflow-hidden rounded-[1.1rem] border border-white/8 bg-[#090a10]">
                          <img
                            src={mode.image}
                            alt={`${mode.name} preview`}
                            className="h-28 w-full object-cover"
                            style={{ objectPosition: mode.imagePosition ?? '50% 50%' }}
                          />
                        </div>
                        <p className="mt-4 text-sm leading-7 text-white/56">{mode.summary}</p>
                        <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.16em] text-white/34">
                          First move
                        </div>
                        <p className="mt-2 text-sm leading-7 text-white/46">{mode.firstMove}</p>
                        <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: mode.accent }}>
                          {mode.launchLabel}
                          <ArrowRight size={14} />
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="showcase" className="px-5 py-18 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/42">Orbit Showcase</div>
              <h2 className="mt-4 text-3xl font-light tracking-[-0.04em] text-white sm:text-4xl">
                Orbit scenes where moving ratios leave visible form behind.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {showcaseCards.map((card) => (
                <a
                  key={card.title}
                  href={`/app?mode=orbital&scene=${card.id}`}
                  className="group rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-4 transition hover:border-white/14 hover:bg-white/[0.045]"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: card.accent }}>
                      {card.tag}
                    </div>
                    <CircleDot size={14} style={{ color: card.accent }} />
                  </div>
                  <div className="relative mt-4 aspect-square overflow-hidden rounded-[1.25rem] border border-white/8 bg-[#090a10]">
                    <img src={card.image} alt={card.title} className="h-full w-full p-3 object-contain" />
                  </div>
                  <div className="mt-4 text-lg font-light text-white">{card.title}</div>
                  <p className="mt-2 text-sm leading-7 text-white/52">{card.description}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/6 bg-white/[0.02] px-5 py-18 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/42">How To Enter</div>
              <h2 className="mt-4 text-3xl font-light tracking-[-0.04em] text-white sm:text-4xl">
                A simple first path, whether you are on desktop or mobile.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: Layers3,
                  title: 'Choose by intent',
                  text: 'Orbit for motion, Study for relationship, Riff for groove writing.',
                  accent: '#00FFAA',
                },
                {
                  icon: CircleDot,
                  title: 'Start from a scene',
                  text: 'Each mode opens faster when you begin from a built-in example instead of a blank surface.',
                  accent: '#88CCFF',
                },
                {
                  icon: Waves,
                  title: 'Change one thing',
                  text: 'Press Play, then change one control at a time. The system teaches itself better that way.',
                  accent: '#FFAA00',
                },
              ].map((step) => (
                <div key={step.title} className="rounded-[1.5rem] border border-white/8 bg-[#0c0f16] p-6">
                  <step.icon size={18} style={{ color: step.accent }} />
                  <div className="mt-5 text-xl font-light text-white">{step.title}</div>
                  <p className="mt-3 text-sm leading-7 text-white/54">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="modes" className="px-5 py-18 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/42">Three Instruments</div>
              <h2 className="mt-4 text-3xl font-light tracking-[-0.04em] text-white sm:text-4xl">
                Three clear ways into the same rhythmic world.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/46 sm:text-base">
                The system is shared, but the entry point matters. Pick the mode that matches your intent, then move between them once the idea is clear.
              </p>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {SITE_MODE_CARDS.map((mode) => {
                const ModeIcon = getModeIcon(mode.id);

                return (
                <div key={mode.id} className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-[0.18em]" style={{ color: mode.accent }}>
                        {mode.eyebrow}
                      </div>
                      <div className="mt-3 text-3xl font-light tracking-[-0.04em] text-white">
                        {mode.name}
                      </div>
                    </div>
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                      style={{
                        background: `${mode.accent}12`,
                        borderColor: `${mode.accent}24`,
                        color: mode.accent,
                      }}
                    >
                      <ModeIcon size={18} />
                    </div>
                  </div>
                  <div className="relative mt-5 aspect-[1.15/1] overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#090a10]">
                    <img
                      src={mode.image}
                      alt={`${mode.name} preview`}
                      className="h-full w-full object-cover"
                      style={{ objectPosition: mode.imagePosition ?? '50% 50%' }}
                    />
                  </div>
                  <p className="mt-5 text-sm leading-7 text-white/56">{mode.description}</p>
                  <div className="mt-5 rounded-[1.15rem] border border-white/8 bg-[#090a10]/72 px-4 py-3">
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/34">
                      Best for
                    </div>
                    <div className="mt-2 text-sm leading-7 text-white/62">{mode.bestFor}</div>
                  </div>
                  <div className="mt-4 rounded-[1.15rem] border border-white/8 bg-white/[0.025] px-4 py-3">
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/34">
                      First move
                    </div>
                    <div className="mt-2 text-sm leading-7 text-white/62">{mode.firstMove}</div>
                  </div>
                  <div className="mt-5 space-y-2">
                    {mode.details.map((detail) => (
                      <div key={detail} className="flex items-start gap-3 text-sm text-white/66">
                        <div
                          className="mt-[0.42rem] h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: mode.accent }}
                        />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    href={getModeLaunchHref(mode.id)}
                    className="mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] transition"
                    style={{
                      borderColor: `${mode.accent}30`,
                      background: `${mode.accent}12`,
                      color: mode.accent,
                    }}
                  >
                    {mode.launchLabel}
                    <ArrowRight size={14} />
                  </a>
                </div>
              )})}
            </div>
          </div>
        </section>

        <section id="why" className="border-y border-white/6 bg-white/[0.02] px-5 py-18 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/42">Why It Matters</div>
              <h2 className="mt-4 text-3xl font-light tracking-[-0.04em] text-white sm:text-4xl">
                Not decoration. A structure you can steer.
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/58">
                The point is not to decorate sound. It is to make structure visible enough to shape. Orbit reveals form through motion. Study reveals relationship through overlap. Riff reveals groove through return and phrase.
              </p>
              <div className="mt-8 space-y-4 text-sm leading-7 text-white/52">
                <p>Orbit is for discovery.</p>
                <p>Study is for clarity.</p>
                <p>Riff is for writing.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: 'Orbit reveals form', text: 'Pulse counts and motion turn into visible geometry.' },
                { title: 'Study reveals relationship', text: 'Shared loops make polyrhythms easier to hear and see.' },
                { title: 'Riff reveals structure', text: 'Bar, phrase, and ending stay separate enough to edit clearly.' },
                { title: 'One app, multiple entry points', text: 'You can move between discovery, learning, and writing without leaving the system.' },
              ].map((item) => (
                <div key={item.title} className="rounded-[1.4rem] border border-white/8 bg-[#0c0f16] p-5">
                  <div className="text-lg font-light text-white">{item.title}</div>
                  <p className="mt-3 text-sm leading-7 text-white/52">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="export" className="px-5 py-18 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/42">Tools Around The Form</div>
              <h2 className="mt-4 text-3xl font-light tracking-[-0.04em] text-white sm:text-4xl">
                Keep what you find, export what you make, and present it cleanly.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featureGrid.map((feature) => (
                <div key={feature.title} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
                  <feature.icon size={18} className="text-white/72" />
                  <div className="mt-5 text-lg font-light text-white">{feature.title}</div>
                  <p className="mt-3 text-sm leading-7 text-white/54">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.1rem] border border-white/8 bg-[#0d1017]/88 shadow-[0_30px_120px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="relative px-6 py-8 sm:px-8 sm:py-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,170,0,0.12),transparent_30%),radial-gradient(circle_at_76%_72%,rgba(0,255,170,0.08),transparent_28%)]" />
                <div className="relative">
                  <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#FFAA00]">Pro Mode</div>
                  <h2 className="mt-4 max-w-lg text-3xl font-light tracking-[-0.04em] text-white sm:text-[2.65rem] sm:leading-[1.02]">
                    For the forms you want to keep.
                  </h2>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
                    Pro is where discovery becomes authorship. Save what you find across Orbit, Study, and Riff, shape the instruments more deeply, and carry the work out as stills, loops, and a lasting library of scenes.
                  </p>
                  <p className="mt-4 max-w-xl text-[13px] leading-7 text-white/42 sm:text-sm">
                    Free is for exploration. Pro is for keeping, refining, and releasing the work.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <Link
                      to="/launch"
                      className="inline-flex items-center gap-2 rounded-full border border-[#FFAA00]/25 bg-[#FFAA00]/10 px-5 py-3 text-[12px] font-mono uppercase tracking-[0.14em] text-[#FFAA00] transition hover:bg-[#FFAA00]/16"
                    >
                      {account?.plan === 'pro' ? 'Choose Pro Mode' : 'Unlock Pro In App'}
                      <ArrowRight size={15} />
                    </Link>
                    <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-white/42">
                      {account?.plan === 'pro' ? 'Pro already active on this account' : 'One-time unlock inside the app'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/8 px-6 py-8 sm:px-8 sm:py-10 lg:border-l lg:border-t-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  {proHighlights.map((item) => (
                    <div key={item.title} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#FFAA00]/84">{item.label}</div>
                      <div className="mt-3 text-xl font-light text-white">{item.title}</div>
                      <p className="mt-3 text-sm leading-7 text-white/52">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 pt-8 sm:px-8 sm:pb-28">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/8 bg-white/[0.035] px-6 py-10 text-center sm:px-10 sm:py-14">
            <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/42">Open The Instrument</div>
            <h2 className="mt-4 text-3xl font-light tracking-[-0.04em] text-white sm:text-5xl">
              Start where it makes sense.
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/launch"
                className="inline-flex items-center gap-2 rounded-full border border-[#00ffaa]/25 bg-[#00ffaa]/12 px-5 py-3 text-[12px] font-mono uppercase tracking-[0.14em] text-[#00ffaa] transition hover:bg-[#00ffaa]/18"
              >
                Choose A Mode
                <ArrowRight size={15} />
              </Link>
              <a
                href="#modes"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-[12px] font-mono uppercase tracking-[0.14em] text-white/74 transition hover:border-white/20 hover:text-white"
              >
                Explore The Modes
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
