import type { GeometryMode } from '../lib/geometry';
import { useId, useState } from 'react';
import { getOrbitCanvasNumbers, getOrbitTurnExplanation } from '../lib/orbitReadingAids';
import type { OrbitCountMode } from '../lib/orbitalEngine';
import { CircleDot, CircleHelp, Orbit, Zap, Hash, Circle, Sparkles, Spline, Sun } from 'lucide-react';

interface OrbitReadAidsProps {
  guidePrefix?: 'mobile' | 'desktop';
  counts?: number[];
  numberMode?: OrbitCountMode | 'sweep';
  geometryMode?: GeometryMode;
  traceAura?: boolean;
  outlineOnly?: boolean;
  onToggleOutline?: () => void;
  onToggleTraceAura?: () => void;
  trace: boolean;
  markers: boolean;
  orbits: boolean;
  onToggleOrbits: () => void;
  impacts: boolean;
  alignments: boolean;
  onToggleAlignments: () => void;
  sun: boolean;
  ratioLabels?: boolean;
  onToggleTrace: () => void;
  onToggleMarkers: () => void;
  onToggleImpacts: () => void;
  onToggleSun?: () => void;
  onToggleRatioLabels?: () => void;
}

export default function OrbitReadAids({
  geometryMode = 'standard-trace', traceAura = false, onToggleTraceAura, outlineOnly = false, onToggleOutline,
  counts = [], numberMode = 'beats-per-turn', guidePrefix = 'mobile', trace, markers, orbits, onToggleOrbits, impacts, alignments, onToggleAlignments, sun, ratioLabels = true,
  onToggleTrace, onToggleMarkers, onToggleImpacts, onToggleSun, onToggleRatioLabels,
}: OrbitReadAidsProps) {
  const [explanationOpen, setExplanationOpen] = useState(false);
  const explanationId = useId();
  const explanation = getOrbitTurnExplanation(counts, numberMode);
  const canvasNumbers = getOrbitCanvasNumbers(counts, numberMode);
  const items = [
    { label: 'Trace', Icon: Spline, active: trace, action: onToggleTrace, guide: guidePrefix === 'mobile' ? 'mobile-trail' : 'desktop-trace', title: 'Show the path left by the moving orbits' },
    { label: 'Orbits', Icon: Circle, active: orbits, action: onToggleOrbits, title: 'Show the moving planets and nodes' },
    { label: 'Markers', Icon: CircleDot, active: markers, action: onToggleMarkers, guide: `${guidePrefix}-markers`, title: 'Show the 12 o’clock starting ticks' },
    { label: 'Alignments', Icon: Orbit, active: alignments, action: onToggleAlignments, title: 'Highlight shared returns; double gold halos mark the full-cycle restart' },
    { label: 'Impacts', Icon: Zap, active: impacts, action: onToggleImpacts, title: 'Show a flash when an orbit passes its starting point' },
    { label: 'Sun', Icon: Sun, active: sun, action: onToggleSun, title: 'Show a sun at the center of the orbits' },
    ...(geometryMode === 'standard-trace' || geometryMode === 'interference-trace'
      ? [{ label: 'Outline', Icon: Circle, active: outlineOnly, action: onToggleOutline, title: geometryMode === 'interference-trace' ? 'Show a faint preview of the complete interference shape' : 'Highlight the pattern’s curves, corners and turning points without the dense interior web' }] : []),
    ...(geometryMode === 'interference-trace' || geometryMode === 'sweep'
      ? [{ label: 'Aura', Icon: Sparkles, active: traceAura, action: onToggleTraceAura, title: 'Add a soft colored halo behind the trace lines' }] : []),
    { label: 'Numbers', Icon: Hash, active: ratioLabels, action: onToggleRatioLabels, title: 'Show the ratio numbers beside the orbit rings' },
  ];
  const groups = [
    { label: 'Pattern', labels: ['Trace', 'Outline', 'Aura'] },
    { label: 'Motion', labels: ['Orbits', 'Sun'] },
    { label: 'Timing', labels: ['Markers', 'Impacts', 'Alignments', 'Numbers'] },
  ];
  return (
    <div className="space-y-3" onKeyDown={(event) => { if (event.key === 'Escape') setExplanationOpen(false); }}>
      {groups.map((group, groupIndex) => (
        <section key={group.label} aria-label={group.label} className={groupIndex ? 'border-t border-white/[0.06] pt-3' : ''}>
          <h3 className="mb-1.5 text-[9px] font-mono font-medium uppercase tracking-[0.14em] text-white/40">{group.label}</h3>
          <div className="grid grid-cols-2 gap-1.5">
      {group.labels.map(name => items.find(item => item.label === name)).filter(item => item !== undefined).map(({ label, Icon, active, action, guide, title }) => (
        <div key={label} className="flex min-w-0 items-stretch overflow-hidden rounded-[9px] border" style={{ borderColor: active ? 'rgba(127,215,255,.18)' : 'rgba(255,255,255,.045)', background: active ? 'rgba(127,215,255,.09)' : 'rgba(255,255,255,.025)' }}>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          data-guide={guide}
          title={title}
          onClick={action}
          className={`flex min-h-10 min-w-0 items-center gap-2 border-0 bg-transparent px-2.5 py-2 text-[10px] font-normal normal-case tracking-normal transition-colors hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/70 flex-1`}
          style={{
            color: active ? '#B5DCEF' : 'rgba(255,255,255,.55)',
          }}
        >
          <span className="opacity-65" aria-hidden="true"><Icon size={13} /></span>
          <span>{label}</span>
          <span aria-hidden="true" className="ml-auto h-1 w-1 shrink-0 rounded-full" style={{ background: active ? '#9ED9F0' : 'rgba(255,255,255,.15)' }} />
        </button>
        {label === 'Numbers' && explanation ? (
          <button
            type="button"
            aria-label="Explain Numbers"
            aria-expanded={explanationOpen}
            aria-controls={explanationId}
            title="Explain Numbers"
            onClick={() => setExplanationOpen(open => !open)}
            className="flex min-h-10 w-7 shrink-0 items-center justify-center border-0 border-l border-white/[0.06] transition-colors hover:bg-sky-200/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/70"
            style={{ color: explanationOpen ? '#B5DCEF' : 'rgba(255,255,255,.55)', background: explanationOpen ? 'rgba(127,215,255,.09)' : 'transparent' }}
          >
            <CircleHelp size={13} aria-hidden="true" />
          </button>
        ) : null}
        </div>
      ))}
          </div>
        </section>
      ))}
      {explanation && explanationOpen ? (
        <div id={explanationId} role="region" aria-label="Numbers explanation" className="col-span-2 rounded-[9px] border border-sky-200/10 bg-sky-200/[0.025] text-[10px] text-white/60">
          <div className="space-y-1 px-2.5 py-2 leading-snug">
            <p>The numbers help you follow each orbit as it moves around the center.</p>
            <p>{explanation.sharedBeats
              ? `These ${counts.length} orbits share a ${explanation.sharedBeats}-beat cycle. That’s when they all meet back at the start. Here’s how many turns each makes:`
              : `These ${counts.length} orbits meet back at the start after making these turns:`}</p>
            <div className="font-mono text-[9px] text-sky-100/75">
              {counts.map((count, index) => (
                <div key={index}>
                  Orbit {canvasNumbers[index]}: {explanation.sharedBeats ? `${explanation.sharedBeats} ÷ ${count} = ` : ''}{explanation.turns[index]} {explanation.turns[index] === '1' ? 'turn' : 'turns'}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
