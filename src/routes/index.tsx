import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, CircleDot, GalleryVerticalEnd, Layers3, LogIn, LogOut, Mail, MonitorPlay, Play, Sparkles, SquarePlay, UserRound, Waves, X } from 'lucide-react';
import { toast } from 'sonner';
import { BUILT_IN_SCENES, createScenePreviewDataUrl, type SceneSnapshot } from './app';
import { useAuth } from '../components/auth-provider';

export const Route = createFileRoute('/')({
  component: OrbitalPolymeterLanding,
});

const modeCards = [
  {
    name: 'Standard',
    description: 'Connects active orbits into a shared string field.',
    accent: '#00FFAA',
    snapshot: {
      orbits: [
        { pulseCount: 3, radius: 96, direction: 1, color: '#00FFAA', harmonyDegree: 0, harmonyRegister: 0 },
        { pulseCount: 4, radius: 156, direction: -1, color: '#FF3366', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 5, radius: 216, direction: 1, color: '#3388FF', harmonyDegree: 4, harmonyRegister: 0 },
        { pulseCount: 7, radius: 276, direction: -1, color: '#FFAA00', harmonyDegree: 1, harmonyRegister: 1 },
      ],
      speedMultiplier: 3,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'C',
        scaleName: 'majorPentatonic',
        mappingMode: 'orbit-index',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 1, showConnectors: true },
    } satisfies SceneSnapshot,
  },
  {
    name: 'Interference',
    description: 'Traces a live path from the relationship between a selected pair.',
    accent: '#88CCFF',
    snapshot: {
      orbits: [
        { pulseCount: 4, radius: 102, direction: 1, color: '#00FFAA', harmonyDegree: 0, harmonyRegister: 0 },
        { pulseCount: 7, radius: 168, direction: -1, color: '#FF3366', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 9, radius: 232, direction: 1, color: '#3388FF', harmonyDegree: 4, harmonyRegister: 1 },
      ],
      speedMultiplier: 3,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'G',
        scaleName: 'dorian',
        mappingMode: 'pulse-count',
        manualOrbitRoles: true,
      },
      geometryMode: 'interference-trace',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 2, showConnectors: false },
    } satisfies SceneSnapshot,
  },
  {
    name: 'Sweep',
    description: 'Plots a finite sampled figure from the selected pair.',
    accent: '#FFAA00',
    snapshot: {
      orbits: [
        { pulseCount: 3, radius: 108, direction: 1, color: '#00FFAA', harmonyDegree: 0, harmonyRegister: 0 },
        { pulseCount: 5, radius: 176, direction: -1, color: '#FF3366', harmonyDegree: 2, harmonyRegister: 0 },
      ],
      speedMultiplier: 3,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'original',
        rootNote: 'C',
        scaleName: 'majorPentatonic',
        mappingMode: 'orbit-index',
        manualOrbitRoles: false,
      },
      geometryMode: 'sweep',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 1, showConnectors: false },
    } satisfies SceneSnapshot,
  },
] as const;

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
  tag: index === 0 ? 'Featured' : 'Built-In Scene',
  description: scene.description,
  accent: ['#00FFAA', '#88CCFF', '#FFAA00', '#66DDFF', '#AA88FF', '#AA88FF', '#44E0B0', '#FF7799'][index % 8],
  image: websiteSceneOverrides[scene.id] ?? scene.thumbnailDataUrl,
}));

const heroImage = websiteStandardImage;
const modePreviews = modeCards.map((mode) => ({
  ...mode,
  image:
    mode.name === 'Standard'
      ? websiteStandardImage
      : createScenePreviewDataUrl(mode.snapshot, 420, {
          oversample: 2,
          format: 'image/png',
          cycleFactor: 0.9,
          scaleRatio: mode.name === 'Sweep' ? 0.33 : 0.34,
        }),
}));

const featureGrid = [
  { icon: GalleryVerticalEnd, title: 'Scenes', text: 'Built-in Scenes, saved scenes, thumbnails, and quick recall.' },
  { icon: SquarePlay, title: 'Square + Story Export', text: 'Clean still export for posts, wallpapers, and vertical stories.' },
  { icon: MonitorPlay, title: 'Short Loop Capture', text: 'Record short WebM loops directly from the artwork.' },
  { icon: Play, title: 'Presentation Mode', text: 'A minimal viewing state for demos, projection, and recording.' },
  { icon: Layers3, title: 'Desktop + Mobile', text: 'Playable on a large screen or in a focused mobile flow.' },
  { icon: Waves, title: 'Structure From Constraint', text: 'Ratios, direction, and mode shape the resulting form.' },
] as const;

function OrbitalPolymeterLanding() {
  const { enabled, loading, user, account, signInWithMagicLink, signOut } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const planLabel = account?.plan === 'pro' ? (account.comped ? 'Comped Pro' : 'Pro') : 'Free';

  const handleMagicLink = async () => {
    const email = accountEmail.trim();
    if (!email) {
      toast.error('Enter an email address first.');
      return;
    }

    setSubmitting(true);
    const { error } = await signInWithMagicLink(email);
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Magic link sent. Check your email to sign in.');
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
                <div className="mt-2 text-sm text-white/5૪">
                  {enabled ? 'Use the same account across the website and app.' : 'Accounts are not configured yet.'}
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
                Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable website sign-in.
              </div>
            ) : user ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center gap-2 text-sm text-white/84">
                    <UserRound size={15} />
                    <span className="truncate">{user.email ?? 'Signed in'}</span>
                  </div>
                  <div className="mt-2 text-[11px] font-mono uppercase tracking-[0.16em] text-white/42">
                    {planLabel} account
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/app"
                    className="inline-flex items-center gap-2 rounded-full border border-[#00ffaa]/25 bg-[#00ffaa]/12 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[#00ffaa] transition hover:bg-[#00ffaa]/18"
                    onClick={() => setAccountOpen(false)}
                  >
                    Open App
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
                  Sign in with a magic link to keep scenes and export history attached to your account.
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
                <button
                  type="button"
                  onClick={() => void handleMagicLink()}
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#00ffaa]/25 bg-[#00ffaa]/12 px-4 py-3 text-[11px] font-mono uppercase tracking-[0.14em] text-[#00ffaa] transition hover:bg-[#00ffaa]/18 disabled:opacity-60"
                >
                  <LogIn size={14} />
                  {submitting ? 'Sending…' : 'Email Sign In'}
                </button>
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
            <div className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/72 transition-colors group-hover:text-white">Rhythmic Geometry</div>
            <div className="mt-1 text-[11px] font-mono text-white/34 transition-colors group-hover:text-white/54">Geometry shaped by rhythm, motion, and tone</div>
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
              to="/app"
              className="inline-flex items-center gap-2 rounded-full border border-[#00ffaa]/25 bg-[#00ffaa]/12 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[#00ffaa] transition hover:bg-[#00ffaa]/18"
            >
              Launch App
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-5 pb-18 pt-18 sm:px-8 sm:pb-24 sm:pt-24">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-mono uppercase tracking-[0.16em] text-white/62">
                <Sparkles size={14} className="text-[#00ffaa]" />
                Form from rhythmic constraint
              </div>
              <h1 className="mt-8 max-w-4xl text-5xl font-light tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
                A rhythmic structure generator for geometry, motion, and sound.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-white/62 sm:text-lg">
                Set orbital constraints. Watch lawful forms emerge.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/44 sm:text-base">
                Rhythmic Geometry turns pulse ratios, direction, and motion into living form. It behaves like a visual instrument for discovering structure, flow, and pattern.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  to="/app"
                  className="inline-flex items-center gap-2 rounded-full border border-[#00ffaa]/25 bg-[#00ffaa]/12 px-5 py-3 text-[12px] font-mono uppercase tracking-[0.14em] text-[#00ffaa] transition hover:bg-[#00ffaa]/18"
                >
                  Open Rhythmic Geometry
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
                    <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/72">Rhythmic Geometry</div>
                    <div className="mt-2 text-[11px] font-mono text-white/38">A visual instrument for form, motion, and sound.</div>
                  </div>
                  <Link
                    to="/app"
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-white/74 transition hover:border-white/20 hover:text-white"
                  >
                    Launch
                  </Link>
                </div>

                <div className="relative mt-8 aspect-[1/1] overflow-hidden rounded-[1.6rem] border border-white/8 bg-[#090a10]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02),transparent_62%)]" />
                  <img
                    src={heroImage}
                    alt="Completed Rhythmic Geometry study"
                    className="h-full w-full p-4 object-contain"
                  />
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {modePreviews.map((mode) => (
                    <div key={mode.name} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="text-[11px] font-mono uppercase tracking-[0.16em]" style={{ color: mode.accent }}>
                        {mode.name}
                      </div>
                      <div className="mt-3 overflow-hidden rounded-2xl border border-white/6 bg-[#090a10]">
                        <img src={mode.image} alt={`${mode.name} preview`} className="h-20 w-full p-2 object-contain" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="showcase" className="px-5 py-18 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/42">Visual Studies</div>
              <h2 className="mt-4 text-3xl font-light tracking-[-0.04em] text-white sm:text-4xl">
                Finished structures that feel discovered, not designed.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {showcaseCards.map((card) => (
                <a
                  key={card.title}
                  href={`/app?scene=${card.id}`}
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
              <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/42">How It Works</div>
              <h2 className="mt-4 text-3xl font-light tracking-[-0.04em] text-white sm:text-4xl">
                Three moves. One system of constraint.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: CircleDot,
                  title: 'Set pulse ratios',
                  text: 'Choose orbit counts and direction to define the rhythmic relationship.',
                  accent: '#00FFAA',
                },
                {
                  icon: Layers3,
                  title: 'Choose a geometry mode',
                  text: 'Standard, Interference, and Sweep each reveal a different truth of the same system.',
                  accent: '#88CCFF',
                },
                {
                  icon: Waves,
                  title: 'Let the structure accumulate',
                  text: 'Trace history turns motion into a finished form that can be saved, exported, or performed.',
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
              <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/42">Geometry Modes</div>
              <h2 className="mt-4 text-3xl font-light tracking-[-0.04em] text-white sm:text-4xl">
                Three projections of the same orbital system.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {modePreviews.map((mode, index) => (
                <div key={mode.name} className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-mono uppercase tracking-[0.18em]" style={{ color: mode.accent }}>
                      {mode.name}
                    </div>
                    <div className="rounded-full border border-white/8 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-white/44">
                      Mode {index + 1}
                    </div>
                  </div>
                  <div className="relative mt-5 aspect-[1.15/1] overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#090a10]">
                    <img src={mode.image} alt={`${mode.name} geometry`} className="h-full w-full p-3 object-contain" />
                  </div>
                  <p className="mt-5 text-sm leading-7 text-white/56">{mode.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="why" className="border-y border-white/6 bg-white/[0.02] px-5 py-18 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/42">Why It Matters</div>
              <h2 className="mt-4 text-3xl font-light tracking-[-0.04em] text-white sm:text-4xl">
                Not random decoration. Form from constraint.
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/58">
                Rhythmic Geometry reveals the forms that emerge when rhythm, direction, and motion are held inside a simple system of constraints.
              </p>
              <div className="mt-8 space-y-4 text-sm leading-7 text-white/52">
                <p>It behaves like a visual instrument, not a template generator.</p>
                <p>It is interactive, mathematically grounded, musically expressive, and visually meditative.</p>
                <p>The resulting structures feel lawful because they are consequences, not decorations.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: 'Rhythm becomes structure', text: 'Pulse counts and direction shape the geometry directly.' },
                { title: 'Geometry becomes memory', text: 'Trace turns passing motion into finished form.' },
                { title: 'Motion becomes sound', text: 'The same system can be heard, not just seen.' },
                { title: 'Constraint becomes discovery', text: 'What appears feels found rather than imposed.' },
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
                Save scenes, export stills, record loops, and present the system cleanly.
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

        <section className="px-5 pb-20 pt-8 sm:px-8 sm:pb-28">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/8 bg-white/[0.035] px-6 py-10 text-center sm:px-10 sm:py-14">
            <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/42">Open The Instrument</div>
            <h2 className="mt-4 text-3xl font-light tracking-[-0.04em] text-white sm:text-5xl">
              A visual instrument for discovering form through rhythmic constraint.
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 rounded-full border border-[#00ffaa]/25 bg-[#00ffaa]/12 px-5 py-3 text-[12px] font-mono uppercase tracking-[0.14em] text-[#00ffaa] transition hover:bg-[#00ffaa]/18"
              >
                Open Rhythmic Geometry
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
