import { getOrbitCanvasNumbers, getOrbitTurnExplanation } from '../lib/orbitReadingAids';
import type { OrbitCountMode } from '../lib/orbitalEngine';
import { CircleDot, CircleHelp, Flag, Hash, Spline, Sun } from 'lucide-react';

interface OrbitReadAidsProps {
  guidePrefix?: 'mobile' | 'desktop';
  counts?: number[];
  numberMode?: OrbitCountMode | 'sweep';
  trace: boolean;
  markers: boolean;
  cycleCue: boolean;
  sun: boolean;
  ratioLabels?: boolean;
  onToggleTrace: () => void;
  onToggleMarkers: () => void;
  onToggleCycleCue?: () => void;
  onToggleSun?: () => void;
  onToggleRatioLabels?: () => void;
}

export default function OrbitReadAids({
  counts = [], numberMode = 'beats-per-turn', guidePrefix = 'mobile', trace, markers, cycleCue, sun, ratioLabels = true,
  onToggleTrace, onToggleMarkers, onToggleCycleCue, onToggleSun, onToggleRatioLabels,
}: OrbitReadAidsProps) {
  const explanation = getOrbitTurnExplanation(counts, numberMode);
  const canvasNumbers = getOrbitCanvasNumbers(counts, numberMode);
  const items = [
    { label: 'Trace', Icon: Spline, active: trace, action: onToggleTrace, guide: guidePrefix === 'mobile' ? 'mobile-trail' : 'desktop-trace', title: 'Show the path left by the moving orbits' },
    { label: 'Markers', Icon: CircleDot, active: markers, action: onToggleMarkers, guide: `${guidePrefix}-markers`, title: 'Show the moving orbit markers' },
    { label: 'Cycle Cue', Icon: Flag, active: cycleCue, action: onToggleCycleCue, title: 'Marks beat 1 and flashes when all orbits return together' },
    { label: 'Sun', Icon: Sun, active: sun, action: onToggleSun, title: 'Show a sun at the center of the orbits' },
    { label: 'Numbers', Icon: Hash, active: ratioLabels, action: onToggleRatioLabels, title: 'Show the ratio numbers beside the orbit rings' },
  ];
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map(({ label, Icon, active, action, guide, title }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          aria-pressed={active}
          data-guide={guide}
          title={title}
          onClick={action}
          className={`flex min-h-8 items-center gap-2 rounded-[9px] border px-2.5 py-2 text-[10px] font-normal normal-case tracking-normal transition-colors hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/70 ${label === 'Numbers' ? 'col-span-2' : ''}`}
          style={{
            color: active ? '#B5DCEF' : 'rgba(255,255,255,.55)',
            background: active ? 'rgba(127,215,255,.09)' : 'rgba(255,255,255,.025)',
            borderColor: active ? 'rgba(127,215,255,.18)' : 'rgba(255,255,255,.045)',
          }}
        >
          <span className="opacity-65" aria-hidden="true"><Icon size={13} /></span>
          <span>{label}</span>
          <span aria-hidden="true" className="ml-auto h-1 w-1 shrink-0 rounded-full" style={{ background: active ? '#9ED9F0' : 'rgba(255,255,255,.15)' }} />
        </button>
      ))}
      {explanation ? (
        <details className="col-span-2 rounded-[9px] border border-sky-200/10 bg-sky-200/[0.025] text-[10px] text-white/60">
          <summary className="flex min-h-8 cursor-pointer items-center gap-2 px-2.5 py-2 text-sky-100/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300/70">
            <CircleHelp size={13} aria-hidden="true" /> Numbers explained
          </summary>
          <div className="space-y-1 border-t border-white/5 px-2.5 py-2 leading-snug">
            <p>{numberMode === 'beats-per-turn'
              ? 'Labels are flipped reading cues. Timing and editing stay unchanged.'
              : 'In this mode, the numbers already follow each ring’s rotation speed.'}</p>
            <p>{explanation.sharedBeats
              ? `Shared return: ${explanation.sharedBeats} beats ÷ each timing value:`
              : `For ${counts.join(' : ')}, divide by the greatest common factor to count full turns before every ring lines up:`}</p>
            <div className="font-mono text-[9px] text-sky-100/75">
              {counts.map((count, index) => (
                <div key={index}>
                  Label {canvasNumbers[index]}: {explanation.sharedBeats ? `${explanation.sharedBeats} ÷ ${count} = ` : ''}{explanation.turns[index]} {explanation.turns[index] === '1' ? 'turn' : 'turns'}
                </div>
              ))}
            </div>
            <p>Turn counts exclude the starting impact.</p>
          </div>
        </details>
      ) : null}
    </div>
  );
}
