import { useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Filter,
  LockKeyhole,
  Play,
  Search,
  Sparkles,
  SquarePlay,
} from 'lucide-react';
import { RIFF_SCENE_CATALOG, type CatalogScene, type CatalogSceneMode } from '../lib/sceneCatalog';

export const Route = createFileRoute('/scenes')({
  component: SceneLibraryPage,
});

type PriceFilter = 'all' | 'free' | 'pro';
type ModeFilter = 'all' | CatalogSceneMode;

const initialCatalog: CatalogScene[] = RIFF_SCENE_CATALOG;

function modeLabel(mode: CatalogSceneMode): string {
  if (mode === 'study') return 'Study';
  if (mode === 'riff') return 'Riff';
  return 'Orbits';
}

function ModeIcon() {
  return <SquarePlay size={14} />;
}

function downloadCatalogScene(item: CatalogScene): void {
  if (item.downloadUrl) {
    const anchor = document.createElement('a');
    anchor.href = item.downloadUrl;
    anchor.download = item.downloadUrl.split('/').pop() || 'rhythmic-geometry-scene.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return;
  }
}

function SceneLibraryPage() {
  const catalog = initialCatalog;
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [query, setQuery] = useState('');

  const filteredScenes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return catalog.filter((scene) => {
      const matchesMode = modeFilter === 'all' || scene.mode === modeFilter;
      const matchesPrice =
        priceFilter === 'all' ||
        scene.tier === priceFilter;
      const matchesQuery =
        !normalizedQuery ||
        scene.name.toLowerCase().includes(normalizedQuery) ||
        scene.description.toLowerCase().includes(normalizedQuery);
      return matchesMode && matchesPrice && matchesQuery;
    });
  }, [catalog, modeFilter, priceFilter, query]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#090a10] text-white">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#090a10]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/58 transition hover:text-white sm:text-[11px]">
            <ArrowLeft size={15} />
            Home
          </Link>
          <div className="text-center">
            <div className="text-[12px] font-medium uppercase tracking-[0.24em] text-white/84 sm:text-[14px]">Scene Library</div>
            <div className="hidden text-[9px] font-mono uppercase tracking-[0.16em] text-white/32 sm:block">Rhythmic Geometry</div>
          </div>
          <div className="w-14 sm:w-20" aria-hidden="true" />
        </div>
      </header>

      <main>
        <section className="border-b border-white/8 px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-[#7FD7FF]">
                <Sparkles size={14} />
                Downloadable Scenes
              </div>
              <h1 className="mt-5 font-serif text-3xl font-light leading-[1.02] tracking-[-0.04em] text-white sm:text-6xl sm:leading-[0.95]">
                Start from a finished idea.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/54 sm:text-base sm:leading-8">
                Browse curated Rhythmic Geometry scenes, download the editable file, then import it into the app and make it your own.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-3 border-b border-white/8 pb-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 flex-1 lg:max-w-sm">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/32" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search scenes"
                  className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.035] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#7FD7FF]/35"
                />
              </div>
              <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:pb-0">
                <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/8 bg-white/[0.025] p-1">
                  <Filter size={13} className="mx-2 text-white/30" />
                  {(['all', 'orbits', 'study', 'riff'] as ModeFilter[]).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setModeFilter(filter)}
                      className={`h-8 rounded-md px-3 text-[9px] font-mono uppercase tracking-[0.12em] transition ${modeFilter === filter ? 'bg-[#7FD7FF]/14 text-[#A8E6FF]' : 'text-white/42 hover:text-white/70'}`}
                    >
                      {filter === 'all' ? 'All Modes' : modeLabel(filter)}
                    </button>
                  ))}
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/8 bg-white/[0.025] p-1">
                  {(['all', 'free', 'pro'] as PriceFilter[]).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setPriceFilter(filter)}
                      className={`h-8 rounded-md px-3 text-[9px] font-mono uppercase tracking-[0.12em] transition ${priceFilter === filter ? 'bg-[#00FFAA]/12 text-[#70FFC8]' : 'text-white/42 hover:text-white/70'}`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/38">
                {filteredScenes.length} {filteredScenes.length === 1 ? 'scene' : 'scenes'}
              </div>
              <div className="text-[10px] text-white/30">Download → Open Export menu → Import Scene</div>
            </div>

            {filteredScenes.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredScenes.map((scene) => (
                  <article key={scene.id} className="group overflow-hidden rounded-lg border border-white/9 bg-[#0d1017] transition hover:border-white/16">
                    <div className="relative aspect-[1.18/1] overflow-hidden border-b border-white/8 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.06),rgba(9,10,16,0.4)_54%,rgba(9,10,16,0.96)_100%)]">
                      <img src={scene.image} alt={scene.name} className="h-full w-full object-contain p-5 transition duration-500 group-hover:scale-[1.025]" />
                      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-black/30 bg-black/60 px-2.5 py-1 text-[8px] font-mono uppercase tracking-[0.12em] backdrop-blur-md" style={{ color: scene.accent }}>
                        <ModeIcon />
                        {modeLabel(scene.mode)}
                      </div>
                      <div className={`absolute right-3 top-3 rounded-full border px-2.5 py-1 text-[8px] font-mono uppercase tracking-[0.12em] backdrop-blur-md ${scene.tier === 'free' ? 'border-[#00FFAA]/25 bg-black/60 text-[#70FFC8]' : 'border-[#B6A0FF]/25 bg-black/60 text-[#C8B9FF]'}`}>
                        {scene.tier === 'free' ? 'Free' : 'Pro'}
                      </div>
                    </div>
                    <div className="p-4 sm:p-5">
                      <h2 className="font-serif text-2xl font-light tracking-[-0.03em] text-white">{scene.name}</h2>
                      <p className="mt-2 min-h-14 text-sm leading-6 text-white/48">{scene.description}</p>
                      <div className="mt-5 flex gap-2">
                        <a
                          href={`/app?mode=riff-cycle-study&catalogScene=${encodeURIComponent(scene.id)}`}
                          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#7FD7FF]/22 bg-[#7FD7FF]/[0.09] px-3 text-[9px] font-mono uppercase tracking-[0.12em] text-[#A8E6FF] transition hover:bg-[#7FD7FF]/[0.15]"
                        >
                          <Play size={14} />
                          Load Scene
                        </a>
                        <button
                          type="button"
                          onClick={() => downloadCatalogScene(scene)}
                          aria-label={`Download ${scene.name}`}
                          title={`Download ${scene.name}`}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/52 transition hover:border-white/18 hover:text-white"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
                <LockKeyhole size={22} className="text-white/24" />
                <div className="mt-4 text-sm text-white/58">No scenes match those filters.</div>
                <button type="button" onClick={() => { setModeFilter('all'); setPriceFilter('all'); setQuery(''); }} className="mt-3 text-[9px] font-mono uppercase tracking-[0.14em] text-[#7FD7FF]">Clear filters</button>
              </div>
            )}

            <div className="mt-10 border-t border-white/8 pt-8">
              <div className="rounded-lg border border-white/9 bg-white/[0.025] p-5 md:max-w-2xl">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[#00FFAA]"><Check size={14} /> Import Ready</div>
                <p className="mt-3 text-sm leading-7 text-white/46">In Rhythmic Geometry, open Menu - Export - Scroll Down, then press Import Scene to add one to your library.</p>
                <Link to="/launch" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#00FFAA]/18 bg-[#00FFAA]/[0.07] px-4 py-2.5 text-[9px] font-mono uppercase tracking-[0.12em] text-[#70FFC8] transition hover:bg-[#00FFAA]/[0.12]">Open the App <ArrowRight size={14} /></Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
