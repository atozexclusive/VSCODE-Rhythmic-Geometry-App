import { useEffect, useRef, useState } from 'react';
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
  tag: index === 0 ? 'Featured Orbits Scene' : 'Orbits Scene',
  description: scene.description,
  accent: ['#00FFAA', '#88CCFF', '#FFAA00', '#66DDFF', '#AA88FF', '#AA88FF', '#44E0B0', '#FF7799'][index % 8],
  image: websiteSceneOverrides[scene.id] ?? scene.thumbnailDataUrl,
}));

const showcaseGridCards = showcaseCards.slice(0, 4);

const featureGrid = [
  { icon: GalleryVerticalEnd, label: 'Library', title: 'Scene Library', text: 'Built-in scenes give Orbits, Polyrhythm Study, and Riff Cycle a strong starting point instead of a blank canvas.' },
  { icon: SquarePlay, label: 'Edit', title: 'Focused Editors', text: 'Open a close writing view when you want to shape one ring or one groove directly.' },
  { icon: MonitorPlay, label: 'Capture', title: 'Loop Capture', text: 'Record short moving studies directly from the live canvas.' },
  { icon: Play, label: 'Present', title: 'Presentation Mode', text: 'Strip the chrome back for cleaner watching, sharing, and playback.' },
  { icon: Layers3, label: 'Layouts', title: 'Desktop + Mobile', text: 'A wide desktop instrument or a tighter mobile flow, without changing the core ideas.' },
  { icon: Waves, label: 'Entry', title: 'Three Clear Entries', text: 'Orbits is for discovery, Polyrhythm Study is for clarity, and Riff Cycle is for writing.' },
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
  const [activeModeId, setActiveModeId] = useState<SiteModeId>('orbital');
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    hero: true,
    modes: false,
    showcase: false,
    tools: false,
    pro: false,
    cta: false,
  });
  const modeStepRefs = useRef<Record<SiteModeId, HTMLDivElement | null>>({
    orbital: null,
    'polyrhythm-study': null,
    'riff-cycle-study': null,
  });
  const revealSectionRefs = useRef<Record<string, HTMLElement | null>>({
    hero: null,
    modes: null,
    showcase: null,
    tools: null,
    pro: null,
    cta: null,
  });
  const planLabel = account?.plan === 'pro' ? (account.comped ? 'Pro Included' : 'Pro') : 'Free';
  const isCreateMode = authMode === 'create-account';
  const activeMode = SITE_MODE_CARDS.find((mode) => mode.id === activeModeId) ?? SITE_MODE_CARDS[0];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((entryA, entryB) => entryB.intersectionRatio - entryA.intersectionRatio)[0];

        if (!mostVisible) {
          return;
        }

        const nextModeId = mostVisible.target.getAttribute('data-mode-id') as SiteModeId | null;
        if (nextModeId) {
          setActiveModeId(nextModeId);
        }
      },
      {
        threshold: [0.35, 0.55, 0.75],
        rootMargin: '-18% 0px -18% 0px',
      },
    );

    Object.values(modeStepRefs.current).forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const sectionId = entry.target.getAttribute('data-reveal-id');
          if (!sectionId) {
            return;
          }

          setVisibleSections((current) => (
            current[sectionId] ? current : { ...current, [sectionId]: true }
          ));
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: '-10% 0px -10% 0px',
      },
    );

    Object.values(revealSectionRefs.current).forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  const getRevealClass = (sectionId: keyof typeof visibleSections) =>
    visibleSections[sectionId]
      ? 'translate-y-0 scale-100 opacity-100'
      : 'translate-y-8 scale-[0.985] opacity-0';

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
            <a href="#tools" className="transition-colors hover:text-white">Tools</a>
            <a href="#pro" className="transition-colors hover:text-white">Pro</a>
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
        <section className="relative overflow-hidden border-b border-white/10 px-5 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-16">
          <div
            ref={(element) => {
              revealSectionRefs.current.hero = element;
            }}
            data-reveal-id="hero"
            className={`mx-auto grid max-w-7xl gap-12 transition-all duration-700 ease-out lg:grid-cols-[0.84fr_1.16fr] lg:items-end ${getRevealClass('hero')}`}
          >
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-mono uppercase tracking-[0.16em] text-white/62">
                <Sparkles size={14} className="text-[#00ffaa]" />
                Three instruments for rhythmic form
              </div>
              <h1 className="mt-12 max-w-2xl font-serif text-[3.45rem] font-light tracking-[-0.05em] leading-[0.92] text-white sm:mt-14 sm:text-[4.65rem] lg:text-[5.45rem]">
                Watch
                <br />
                Rhythm
                <br />
                Create
                <br />
                Structure
              </h1>
              <p className="mt-12 max-w-xl text-lg leading-8 text-white/64">
                Set constraints. Write Patterns. Create Form
              </p>
              <p className="mt-10 max-w-xl text-sm leading-8 text-white/44 sm:text-base">
                Orbits, Polyrhythm Study, and Riff Cycle are three perspectives of the same rhythmic system.
              </p>
              <div className="mt-14 flex flex-wrap items-center gap-4">
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
                  See How They Differ
                </a>
              </div>
              <div className="mt-12 grid gap-3 sm:grid-cols-3">
                {SITE_MODE_CARDS.map((mode) => {
                  const ModeIcon = getModeIcon(mode.id);
                  const isActive = mode.id === activeModeId;

                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setActiveModeId(mode.id)}
                      onMouseEnter={() => setActiveModeId(mode.id)}
                      className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${isActive ? 'bg-white/[0.07] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]' : 'bg-white/[0.02] hover:bg-white/[0.04]'}`}
                      style={{
                        borderColor: isActive ? `${mode.accent}30` : 'rgba(255,255,255,0.08)',
                        boxShadow: isActive ? `0 0 48px ${mode.accent}22, inset 0 1px 0 rgba(255,255,255,0.06)` : 'none',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: mode.accent }}>
                          {mode.name}
                        </div>
                        <ModeIcon size={15} style={{ color: mode.accent }} />
                      </div>
                      <div className="mt-3 text-sm leading-6 text-white/60">{mode.bestFor}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute inset-0 rounded-[2.6rem] blur-3xl"
                style={{
                  background: `radial-gradient(circle at 30% 24%, ${activeMode.accent}34, transparent 30%), radial-gradient(circle at 74% 26%, rgba(255,255,255,0.14), transparent 20%), radial-gradient(circle at 70% 72%, ${activeMode.accent}14, transparent 26%), linear-gradient(180deg, rgba(9,10,16,0.22), rgba(9,10,16,0.02))`,
                }}
              />
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0b0e14]/82 shadow-[0_40px_160px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="mx-auto flex max-w-xl flex-col items-center text-center">
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: activeMode.accent }}>
                      {activeMode.eyebrow}
                    </div>
                    <div className="mt-2 font-serif text-[2.05rem] font-light tracking-[-0.05em] leading-[0.95] text-white">
                      {activeMode.name}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/58">{activeMode.summary}</p>
                  </div>
                </div>

                <div className="relative aspect-[1.08/0.86] overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,10,16,0.08),rgba(9,10,16,0.2)_36%,rgba(9,10,16,0.72)_100%)]" />
                  <div
                    className="absolute inset-0 opacity-60"
                    style={{
                      background: `radial-gradient(circle at 20% 22%, ${activeMode.accent}26, transparent 24%), radial-gradient(circle at 74% 20%, rgba(255,255,255,0.12), transparent 18%), radial-gradient(circle at 70% 76%, ${activeMode.accent}16, transparent 24%)`,
                    }}
                  />
                  <div className="absolute inset-[3.1rem] rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_80px_rgba(0,0,0,0.34)]">
                    <div className="absolute inset-[1.35rem] overflow-hidden rounded-[1.4rem] bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.06),rgba(9,10,16,0.22)_52%,rgba(9,10,16,0.92)_100%)]">
                      <img
                        src={activeMode.image}
                        alt={`${activeMode.name} preview`}
                        className="h-full w-full object-contain object-center p-5"
                        style={{ objectPosition: '50% 50%' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 border-t border-white/10 px-6 py-6 md:grid-cols-[1fr_1fr]">
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/24 p-4 backdrop-blur-md">
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/34">Best for</div>
                    <div className="mt-2 text-sm leading-7 text-white/68">{activeMode.bestFor}</div>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/24 p-4 backdrop-blur-md">
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/34">First move</div>
                    <div className="mt-2 text-sm leading-7 text-white/68">{activeMode.firstMove}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="modes" className="border-y border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-5 py-18 sm:px-8 sm:py-24">
          <div
            ref={(element) => {
              revealSectionRefs.current.modes = element;
            }}
            data-reveal-id="modes"
            className={`mx-auto max-w-7xl transition-all duration-700 ease-out lg:grid lg:grid-cols-[0.6fr_0.4fr] lg:gap-14 ${getRevealClass('modes')}`}
          >
            <div>
              <div className="max-w-2xl">
                <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/42">Three Clear Entries</div>
                <h2 className="mt-4 font-serif text-3xl font-light tracking-[-0.04em] text-white sm:text-5xl sm:leading-[0.98]">
                  One rhythmic world, three different modes.
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-8 text-white/48 sm:text-base">
                  Scroll through the three surfaces and experiment. Orbits gives polymeter shape. Polyrhythm Study makes shared rhythmic patterns legible. Riff Cycle turns the idea into a phrase you can actually shape and play.
                </p>
              </div>

              <div className="mt-12 space-y-10 lg:space-y-0">
                {SITE_MODE_CARDS.map((mode) => {
                  const ModeIcon = getModeIcon(mode.id);
                  const isActive = mode.id === activeModeId;

                  return (
                    <div
                      key={mode.id}
                      ref={(element) => {
                        modeStepRefs.current[mode.id] = element;
                      }}
                      data-mode-id={mode.id}
                      className="lg:flex lg:min-h-[78vh] lg:items-center"
                    >
                      <div
                        className={`max-w-xl rounded-[2rem] border p-6 transition sm:p-8 ${isActive ? 'bg-white/[0.055]' : 'bg-white/[0.02]'}`}
                        style={{
                          borderColor: isActive ? `${mode.accent}30` : 'rgba(255,255,255,0.08)',
                          boxShadow: isActive ? `0 0 80px ${mode.accent}10, inset 0 1px 0 rgba(255,255,255,0.06)` : 'none',
                        }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: mode.accent }}>
                            {mode.eyebrow}
                          </div>
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border"
                            style={{
                              background: `${mode.accent}12`,
                              borderColor: `${mode.accent}1f`,
                              color: mode.accent,
                            }}
                          >
                            <ModeIcon size={16} />
                          </div>
                        </div>
                        <div className="mt-5 font-serif text-[2.65rem] font-light tracking-[-0.05em] leading-[0.95] text-white">{mode.name}</div>
                        <p className="mt-4 text-lg leading-8 text-white/72">{mode.summary}</p>
                        <div className="mt-6 border-t border-white/10 pt-6">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1.3rem] border border-white/8 bg-[#090a10]/72 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/34">Best for</div>
                              <div className="mt-2 text-sm leading-7 text-white/66">{mode.bestFor}</div>
                            </div>
                            <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.025] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/34">First move</div>
                              <div className="mt-2 text-sm leading-7 text-white/66">{mode.firstMove}</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 border-t border-white/10 pt-6">
                          <div className="space-y-3">
                            {mode.details.slice(0, 2).map((detail) => (
                              <div key={detail} className="flex items-start gap-3 text-sm leading-7 text-white/62">
                                <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: mode.accent, boxShadow: `0 0 10px ${mode.accent}` }} />
                                <span>{detail}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-7">
                          <a
                            href={getModeLaunchHref(mode.id)}
                            className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-[12px] font-mono uppercase tracking-[0.14em] transition"
                            style={{
                              borderColor: `${mode.accent}30`,
                              background: `${mode.accent}12`,
                              color: mode.accent,
                              boxShadow: `0 0 26px ${mode.accent}10`,
                            }}
                          >
                            {mode.launchLabel}
                            <ArrowRight size={15} />
                          </a>
                        </div>

                        <div className="mt-8 lg:hidden">
                          <div className="overflow-hidden rounded-[1.6rem] border border-white/8 bg-[#090a10] shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
                            <img
                              src={mode.image}
                              alt={`${mode.name} preview`}
                              className="h-72 w-full object-contain object-center p-5"
                              style={{ objectPosition: '50% 50%' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="sticky top-24 pt-24">
                <div
                  className="absolute inset-0 rounded-[2.2rem] blur-3xl"
                  style={{
                    background: `radial-gradient(circle at 40% 26%, ${activeMode.accent}28, transparent 30%), radial-gradient(circle at 72% 18%, rgba(255,255,255,0.14), transparent 18%), radial-gradient(circle at 68% 74%, ${activeMode.accent}14, transparent 22%)`,
                  }}
                />
                <div className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#0b0e14]/86 shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                  <div className="relative aspect-[0.95/1.18] overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,10,16,0.08),rgba(9,10,16,0.22)_32%,rgba(9,10,16,0.78)_100%)]" />
                    <div className="absolute inset-[2rem] rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_80px_rgba(0,0,0,0.34)]">
                      <div className="absolute inset-[1.1rem] overflow-hidden rounded-[1.35rem] bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.06),rgba(9,10,16,0.22)_52%,rgba(9,10,16,0.92)_100%)]">
                        <img
                          src={activeMode.image}
                          alt={`${activeMode.name} preview`}
                          className="h-full w-full object-contain p-5"
                          style={{ objectPosition: activeMode.imagePosition ?? '50% 50%' }}
                        />
                      </div>
                    </div>
                    <div className="absolute inset-x-6 top-6 flex justify-start">
                      <div className="rounded-full border border-white/10 bg-black/28 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/66">
                        Scroll To Compare
                      </div>
                    </div>
                    <div className="absolute inset-x-6 bottom-6 rounded-[1.6rem] border border-white/10 bg-black/34 p-5 backdrop-blur-md">
                      <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: activeMode.accent }}>
                        {activeMode.name}
                      </div>
                      <div className="mt-3 font-serif text-[2.15rem] font-light tracking-[-0.05em] leading-[0.95] text-white">{activeMode.eyebrow}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="showcase" className="border-y border-white/10 px-5 py-18 sm:px-8 sm:py-24">
          <div
            ref={(element) => {
              revealSectionRefs.current.showcase = element;
            }}
            data-reveal-id="showcase"
            className={`mx-auto max-w-7xl transition-all duration-700 ease-out ${getRevealClass('showcase')}`}
          >
            <div className="max-w-2xl">
              <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/42">Orbits Showcase</div>
              <h2 className="mt-4 font-serif text-3xl font-light tracking-[-0.04em] text-white sm:text-5xl sm:leading-[0.98]">
                Orbits scenes where moving ratios leave visible form behind.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {showcaseGridCards.map((card, index) => (
                <a
                  key={card.title}
                  href={`/app?mode=orbital&scene=${card.id}`}
                  className="group overflow-hidden rounded-[1.8rem] border border-white/8 bg-white/[0.03] shadow-[0_24px_80px_rgba(0,0,0,0.24)] transition hover:border-white/14 hover:bg-white/[0.045]"
                >
                  <div className="flex items-center justify-between px-5 pt-5">
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: card.accent }}>
                      {index === 0 ? 'Featured Orbits Scene' : 'Orbits Scene'}
                    </div>
                    <CircleDot size={14} style={{ color: card.accent }} />
                  </div>
                  <div className="relative mt-4 aspect-[1.14/1] overflow-hidden border-y border-white/8 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.05),rgba(9,10,16,0.22)_52%,rgba(9,10,16,0.92)_100%)]">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="h-full w-full object-contain p-5 transition duration-500 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="px-5 py-5">
                    <div className="font-serif text-[1.75rem] font-light leading-[0.96] text-white">{card.title}</div>
                    <p className="mt-2 text-sm leading-7 text-white/52">{card.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="tools" className="border-y border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-5 py-18 sm:px-8 sm:py-24">
          <div
            ref={(element) => {
              revealSectionRefs.current.tools = element;
            }}
            data-reveal-id="tools"
            className={`mx-auto grid max-w-7xl gap-12 transition-all duration-700 ease-out lg:grid-cols-[0.92fr_1.08fr] ${getRevealClass('tools')}`}
          >
            <div className="max-w-xl">
              <div className="inline-flex items-center rounded-full border border-[#FFB454]/20 bg-[#FFB454]/[0.08] px-4 py-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[#FFB454] shadow-[0_0_24px_rgba(255,180,84,0.09)]">
                Tools Around The Form
              </div>
              <h2 className="mt-4 font-serif text-3xl font-light tracking-[-0.04em] text-white sm:text-5xl sm:leading-[0.98]">
                Keep what you find, export what you make, and present it cleanly.
              </h2>
              <p className="mt-5 text-sm leading-8 text-white/48 sm:text-base">
                The site should not just describe the instrument. It should show that the app can move from discovery into authorship. These are the parts that make that promise credible.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {featureGrid.slice(0, 4).map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(10,12,18,0.96))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_64px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#FFB454] drop-shadow-[0_0_10px_rgba(255,180,84,0.16)]">
                      {feature.label}
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#FFB454]/16 bg-[#FFB454]/[0.08] text-[#FFB454] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_18px_rgba(255,180,84,0.08)]">
                      <feature.icon size={18} />
                    </div>
                  </div>
                  <div className="mt-5 h-px bg-white/10" />
                  <div className="mt-5 text-[1.7rem] font-light tracking-[-0.04em] text-white">{feature.title}</div>
                  <p className="mt-4 text-sm leading-7 text-white/54">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pro" className="border-y border-white/10 px-5 py-8 sm:px-8 sm:py-10">
          <div
            ref={(element) => {
              revealSectionRefs.current.pro = element;
            }}
            data-reveal-id="pro"
            className={`mx-auto max-w-7xl transition-all duration-700 ease-out ${getRevealClass('pro')}`}
          >
          <div className="overflow-hidden rounded-[2.1rem] border border-white/10 bg-[#0d1017]/88 shadow-[0_30px_120px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="relative px-6 py-8 sm:px-8 sm:py-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,170,0,0.12),transparent_30%),radial-gradient(circle_at_76%_72%,rgba(0,255,170,0.08),transparent_28%)]" />
                <div className="relative">
                  <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#FFAA00]">Pro Mode</div>
                  <h2 className="mt-4 max-w-lg text-3xl font-light tracking-[-0.04em] text-white sm:text-[2.65rem] sm:leading-[1.02]">
                    For the forms you want to keep.
                  </h2>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
                    Pro is where discovery becomes authorship. Save what you find across Orbits, Polyrhythm Study, and Riff Cycle, shape the instruments more deeply, and carry the work out as stills, loops, and a lasting library of scenes.
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
          </div>
        </section>

        <section className="border-t border-white/10 px-5 pb-20 pt-8 sm:px-8 sm:pb-28">
          <div
            ref={(element) => {
              revealSectionRefs.current.cta = element;
            }}
            data-reveal-id="cta"
            className={`mx-auto max-w-5xl transition-all duration-700 ease-out ${getRevealClass('cta')}`}
          >
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] px-6 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_80px_rgba(0,0,0,0.24)] sm:px-10 sm:py-14">
            <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/42">Open The Instrument</div>
            <h2 className="mt-4 font-serif text-3xl font-light tracking-[-0.04em] text-white sm:text-5xl">
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
          </div>
        </section>
      </main>
    </div>
  );
}
