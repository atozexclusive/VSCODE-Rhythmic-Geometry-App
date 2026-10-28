import { CircleDot, Flag, Spline, Sun } from 'lucide-react';

interface OrbitReadAidsProps {
  guidePrefix?: 'mobile' | 'desktop';
  trace: boolean;
  markers: boolean;
  cycleCue: boolean;
  sun: boolean;
  onToggleTrace: () => void;
  onToggleMarkers: () => void;
  onToggleCycleCue?: () => void;
  onToggleSun?: () => void;
}

export default function OrbitReadAids({
  guidePrefix = 'mobile', trace, markers, cycleCue, sun,
  onToggleTrace, onToggleMarkers, onToggleCycleCue, onToggleSun,
}: OrbitReadAidsProps) {
  const items = [
    { label: 'Trace', Icon: Spline, active: trace, action: onToggleTrace, guide: guidePrefix === 'mobile' ? 'mobile-trail' : 'desktop-trace', title: 'Show the path left by the moving orbits' },
    { label: 'Markers', Icon: CircleDot, active: markers, action: onToggleMarkers, guide: `${guidePrefix}-markers`, title: 'Show the moving orbit markers' },
    { label: 'Cycle Cue', Icon: Flag, active: cycleCue, action: onToggleCycleCue, title: 'Marks beat 1 and flashes when all orbits return together' },
    { label: 'Sun', Icon: Sun, active: sun, action: onToggleSun, title: 'Show a sun at the center of the orbits' },
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
          className="flex min-h-8 items-center gap-2 rounded-[9px] border px-2.5 py-2 text-[10px] font-normal normal-case tracking-normal transition-colors hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/70"
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
    </div>
  );
}
