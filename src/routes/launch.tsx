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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-white/58 transition hover:text-white">
            <ArrowLeft size={14} />
            Back To Site
          </Link>
          <div className="text-[14px] font-medium uppercase tracking-[0.28em] text-white/78">
            Rhythmic Geometry
          </div>
          <a
            href="/app"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-white/72 transition hover:border-white/20 hover:text-white"
          >
            Last Used Mode
          </a>
        </div>
      </header>

      <main className="px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-mono uppercase tracking-[0.16em] text-white/62">
              Choose Your Starting Mode
            </div>
            <h1 className="mt-8 text-5xl font-light tracking-[-0.058em] leading-[0.98] text-white sm:text-6xl lg:text-[4.9rem]">
              Start where the idea makes sense.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-white/60 sm:text-lg">
              Orbit is the moving visual surface. Study is the shared-loop rhythm view. Riff is the groove-writing surface.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/42 sm:text-base">
              This only chooses the first mode you see. Once you are inside the app, you can move between the instruments any time.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {SITE_MODE_CARDS.map((mode) => (
                <div
                  key={mode.id}
                  className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3"
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
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {SITE_MODE_CARDS.map((mode) => {
              const ModeIcon = getModeIcon(mode.id);

              return (
                <div
                  key={mode.id}
                  className="overflow-hidden rounded-[1.9rem] border border-white/8 bg-white/[0.03] shadow-[0_30px_100px_rgba(0,0,0,0.28)] backdrop-blur-xl"
                >
                  <div className="border-b border-white/8 px-6 py-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div
                          className="text-[11px] font-mono uppercase tracking-[0.18em]"
                          style={{ color: mode.accent }}
                        >
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
                          borderColor: `${mode.accent}22`,
                          color: mode.accent,
                        }}
                      >
                        <ModeIcon size={18} />
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-white/56">{mode.summary}</p>
                  </div>

                  <div className="px-6 py-6">
                    <div className="overflow-hidden rounded-[1.45rem] border border-white/8 bg-[#090a10]">
                      <img
                        src={mode.image}
                        alt={`${mode.name} preview`}
                        className="h-48 w-full object-cover"
                        style={{ objectPosition: mode.imagePosition ?? '50% 50%' }}
                      />
                    </div>

                    <p className="mt-5 text-sm leading-7 text-white/54">{mode.description}</p>

                    <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-[#090a10]/76 px-4 py-3">
                      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/34">
                        Best for
                      </div>
                      <div className="mt-2 text-sm leading-7 text-white/62">{mode.bestFor}</div>
                    </div>

                    <div className="mt-4 rounded-[1.2rem] border border-white/8 bg-white/[0.025] px-4 py-3">
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
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border px-5 py-3 text-[12px] font-mono uppercase tracking-[0.14em] transition"
                      style={{
                        borderColor: `${mode.accent}30`,
                        background: `${mode.accent}12`,
                        color: mode.accent,
                      }}
                    >
                      {mode.launchLabel}
                      <ArrowRight size={15} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-white/8 bg-white/[0.03] px-5 py-5 text-sm leading-7 text-white/52 sm:px-6">
            <span className="font-mono uppercase tracking-[0.16em] text-white/38">Not sure?</span>{' '}
            Start with Orbit if you want the strongest first impression. Start with Study if you want to understand rhythm relationships. Start with Riff if you already want to write.
          </div>
        </div>
      </main>
    </div>
  );
}
