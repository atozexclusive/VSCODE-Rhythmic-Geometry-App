import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, CircleDot, Layers3, SquarePlay } from 'lucide-react';
import { SITE_MODE_CARDS, type SiteModeId, getModeLaunchHref } from '../lib/siteModes';

export const Route = createFileRoute('/launch')({
  component: LaunchChooserPage,
});

function getModeIcon(modeId: SiteModeId) {
  if (modeId === 'orbital') {
    return CircleDot;
  }
  if (modeId === 'polyrhythm-study') {
    return Layers3;
  }
  return SquarePlay;
}

function LaunchChooserPage() {
  return (
    <div className="min-h-screen bg-[#090a10] text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-85"
          style={{
            background:
              'radial-gradient(circle at 18% 18%, rgba(0,255,170,0.07), transparent 28%), radial-gradient(circle at 80% 20%, rgba(127,215,255,0.08), transparent 26%), radial-gradient(circle at 70% 76%, rgba(255,209,102,0.08), transparent 24%), linear-gradient(180deg, #090a10 0%, #0d1017 48%, #090a10 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.92), rgba(0,0,0,0.6), rgba(0,0,0,0.92))',
          }}
        />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/6 bg-[#090a10]/72 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-white/58 transition hover:text-white">
            <ArrowLeft size={14} />
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back To Site</span>
          </Link>
          <div className="text-[12px] font-medium uppercase tracking-[0.2em] text-white/78 sm:text-[14px] sm:tracking-[0.28em]">
            Rhythmic Geometry
          </div>
          <a
            href="/app"
            className="hidden items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-white/72 transition hover:border-white/20 hover:text-white sm:inline-flex"
          >
            Last Used Mode
          </a>
        </div>
      </header>

      <main className="px-4 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-14">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-serif text-[3rem] font-light tracking-[-0.05em] leading-[0.92] text-white sm:text-6xl lg:text-[5.2rem]">
              Geometry Modes
            </h1>
          </div>

          <div className="-mx-4 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mt-16 sm:gap-5 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
            {SITE_MODE_CARDS.map((mode) => {
              const ModeIcon = getModeIcon(mode.id);

              return (
                <a
                  key={mode.id}
                  href={getModeLaunchHref(mode.id)}
                  className="group relative min-h-[28.5rem] w-[86vw] min-w-[86vw] max-w-xl snap-center overflow-hidden rounded-[1.85rem] border border-white/8 bg-[#0c0f16] shadow-[0_28px_110px_rgba(0,0,0,0.32)] transition hover:border-white/14 sm:min-h-[34rem] sm:rounded-[2.35rem] sm:shadow-[0_34px_140px_rgba(0,0,0,0.36)] lg:min-h-[39rem] lg:w-auto lg:min-w-0 lg:max-w-none"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,10,16,0.12),rgba(9,10,16,0.26)_32%,rgba(9,10,16,0.88)_100%)]" />
                  <div
                    className="absolute inset-0 opacity-75"
                    style={{
                      background: `radial-gradient(circle at 22% 18%, ${mode.accent}24, transparent 24%), radial-gradient(circle at 75% 70%, rgba(255,255,255,0.12), transparent 20%)`,
                    }}
                  />
                  <div
                    className="absolute inset-[1.15rem] rounded-[2rem] blur-3xl"
                    style={{
                      background: `radial-gradient(circle at 35% 28%, ${mode.accent}24, transparent 28%), radial-gradient(circle at 70% 72%, rgba(255,255,255,0.08), transparent 20%)`,
                    }}
                  />

                  <div className="relative flex h-full flex-col justify-between p-5 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div className="max-w-[12.5rem] rounded-full border border-white/10 bg-black/24 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: mode.accent }}>
                        {mode.eyebrow}
                      </div>
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-sm"
                        style={{
                          background: `${mode.accent}12`,
                          borderColor: `${mode.accent}22`,
                          color: mode.accent,
                        }}
                      >
                        <ModeIcon size={18} />
                      </div>
                    </div>

                    <div className="mt-5 flex-1 rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_72px_rgba(0,0,0,0.28)] sm:mt-6 sm:rounded-[1.9rem] sm:p-3 sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_90px_rgba(0,0,0,0.34)]">
                      <div className="h-full overflow-hidden rounded-[1.45rem] bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.06),rgba(9,10,16,0.22)_52%,rgba(9,10,16,0.92)_100%)]">
                        <img
                          src={mode.image}
                          alt={`${mode.name} preview`}
                          className="h-full w-full object-contain p-4 transition duration-700 group-hover:scale-[1.03] sm:p-5"
                          style={{ objectPosition: mode.imagePosition ?? '50% 50%' }}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-5 sm:pt-6">
                      <div>
                        <div className="font-serif text-[2.15rem] font-light tracking-[-0.05em] leading-[0.94] text-white sm:text-[2.7rem]">{mode.name}</div>
                        <p className="mt-3 max-w-sm text-sm leading-7 text-white/66">{mode.summary}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.35rem] border border-white/10 bg-black/28 p-4 backdrop-blur-md">
                          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/36">Best for</div>
                          <div className="mt-2 text-sm leading-7 text-white/70">{mode.bestFor}</div>
                        </div>

                        <div className="rounded-[1.35rem] border border-white/10 bg-black/28 p-4 backdrop-blur-md">
                          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/36">First move</div>
                          <div className="mt-2 text-sm leading-7 text-white/70">{mode.firstMove}</div>
                        </div>
                      </div>

                      <div
                        className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-[12px] font-mono uppercase tracking-[0.14em] transition"
                        style={{
                          borderColor: `${mode.accent}30`,
                          background: `${mode.accent}12`,
                          color: mode.accent,
                          boxShadow: `0 0 34px ${mode.accent}12`,
                        }}
                      >
                        {mode.launchLabel}
                        <ArrowRight size={15} />
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mt-10 lg:mx-0 lg:grid lg:grid-cols-[1.08fr_0.92fr] lg:overflow-visible lg:px-0 lg:pb-0">
            <div className="w-[82vw] min-w-[82vw] snap-center rounded-[1.8rem] border border-white/8 bg-white/[0.03] px-6 py-6 text-sm leading-8 text-white/52 sm:w-auto sm:min-w-0 sm:px-7">
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/38">How to choose</div>
              <div className="mt-4 space-y-3">
                <p>Start with <span className="text-white/78">Orbits</span> if you want the strongest first impression.</p>
                <p>Start with <span className="text-white/78">Polyrhythm Study</span> if you want to hear how layered rhythms meet.</p>
                <p>Start with <span className="text-white/78">Riff Cycle</span> if you already want to write phrases against a bar frame.</p>
              </div>
            </div>
            <div className="w-[82vw] min-w-[82vw] snap-center rounded-[1.8rem] border border-white/8 bg-[#0c0f16] px-6 py-6 text-sm leading-8 text-white/54 sm:w-auto sm:min-w-0 sm:px-7">
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/38">After launch</div>
              <p className="mt-4">
                The choice is not permanent. The app opens on one surface first, but the system stays connected once you are inside.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
