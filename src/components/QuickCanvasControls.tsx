import type { ReactNode } from 'react';
import { AudioLines, Dice5, Lock, Plus, ScanEye, Shuffle, Palette } from 'lucide-react';
import type { ProFeature } from '../lib/entitlements';

export type CanvasQuickPanel = 'audio' | 'canvas' | 'read' | null;
interface Props {
  prefix: string;
  panel: CanvasQuickPanel;
  onPanelChange: (panel: CanvasQuickPanel) => void;
  soundLocked: boolean;
  canvasLocked: boolean;
  randomPlusLocked: boolean;
  remixLocked: boolean;
  onLocked: (feature: ProFeature) => void;
  onRandom: () => void;
  onRandomPlus: () => void;
  onRemix: () => void;
  headerAccessory?: ReactNode;
  children: ReactNode;
}

export default function QuickCanvasControls({ prefix, panel, onPanelChange, soundLocked, canvasLocked, randomPlusLocked, remixLocked, onLocked, onRandom, onRandomPlus, onRemix, headerAccessory, children }: Props) {
  return <>
    <div className="absolute left-3 bottom-2 z-20 flex items-center gap-0.5 rounded-full border border-white/[0.05] bg-[#17171e]/40 p-0.5 backdrop-blur-md" role="toolbar" aria-label="Pattern quick actions">
      {[
        { id: 'random', label: 'Random', icon: <Dice5 size={14} strokeWidth={1.5} />, locked: false, action: onRandom },
        { id: 'random-plus', label: 'Random+', icon: <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden="true"><Dice5 size={14} strokeWidth={1.5} /><Plus size={9} strokeWidth={2} className="absolute -right-1 -top-0.5 rounded-full bg-[#17171e]" /></span>, locked: randomPlusLocked, action: onRandomPlus },
        { id: 'remix', label: 'Remix', icon: <Shuffle size={14} strokeWidth={1.5} />, locked: remixLocked, action: onRemix },
      ].map(({ id, label, icon, locked, action }) => <button key={id} type="button" data-guide={`${prefix}-${id}`} aria-label={locked ? `${label} (Pro)` : label} title={label}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white/75 active:bg-white/10"
        onClick={() => { onPanelChange(null); action(); }}>{icon}{locked ? <Lock size={7} aria-hidden="true" className="absolute right-1.5 bottom-1.5 text-white/30" /> : null}</button>)}
    </div>
    <div className="absolute right-3 bottom-2 z-20 flex items-center gap-0.5 rounded-full border border-white/[0.05] bg-[#17171e]/40 p-0.5 backdrop-blur-md" role="toolbar" aria-label="Canvas quick controls">
      {[
        { id: 'audio' as const, label: 'Sound', guide: 'sound-button', icon: AudioLines, locked: soundLocked, feature: 'sound-editing' as const },
        { id: 'canvas' as const, label: 'Canvas', guide: 'canvas-button', icon: Palette, locked: canvasLocked, feature: 'canvas-options' as const },
        { id: 'read' as const, label: 'Read Aids', guide: 'read-aids-button', icon: ScanEye, locked: false, feature: null },
      ].map(({ id, label, guide, icon: Icon, locked, feature }) => <button key={id} type="button" data-guide={`${prefix}-${guide}`} aria-label={locked ? `${label} (Pro)` : label} title={locked ? `${label} (Pro)` : label} aria-expanded={panel === id} aria-controls={`${prefix}-quick-settings`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors"
        style={{ color: panel === id ? '#7FD7FF' : 'rgba(255,255,255,.46)', background: panel === id ? 'rgba(127,215,255,.1)' : 'transparent' }}
        onClick={() => { if (locked && feature) { onLocked(feature); return; } onPanelChange(panel === id ? null : id); }}>
        <Icon size={14} strokeWidth={1.5} />{locked ? <Lock size={7} aria-hidden="true" className="absolute right-1.5 bottom-1.5 text-white/30" /> : null}
      </button>)}
    </div>
    {panel ? <section id={`${prefix}-quick-settings`} data-canvas-quick-settings aria-label="Canvas quick settings"
      className="absolute right-3 bottom-[54px] z-30 w-[min(280px,calc(100%-24px))] max-h-[60%] overflow-y-auto rounded-[18px] border border-white/[0.12] p-3"
      style={{ background: 'linear-gradient(145deg, rgba(39,42,51,.66), rgba(17,19,26,.56))', backdropFilter: 'blur(20px) saturate(140%)', boxShadow: `0 12px 36px rgba(0,0,0,.24), 0 0 22px ${panel === 'audio' ? 'rgba(114,241,184,.08)' : panel === 'canvas' ? 'rgba(255,209,102,.08)' : 'rgba(127,215,255,.08)'}, inset 0 1px 0 rgba(255,255,255,.09)`, scrollbarWidth: 'thin' }}
      onKeyDown={(event) => { if (event.key === 'Escape') onPanelChange(null); }}>
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1">
        <span className="flex shrink-0 items-center gap-2 text-[11px] font-medium tracking-wide text-white/80">{panel === 'audio' ? <AudioLines size={13} className="text-emerald-200/60" /> : panel === 'canvas' ? <Palette size={13} className="text-amber-200/60" /> : <ScanEye size={13} className="text-sky-200/60" />}{panel === 'audio' ? 'Sound' : panel === 'canvas' ? 'Canvas' : 'Read Aids'}</span>
        {headerAccessory ? <div className="ml-auto shrink-0">{headerAccessory}</div> : null}
        <button type="button" aria-label="Close quick settings" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/10" onClick={() => onPanelChange(null)}><Plus size={14} className="rotate-45" /></button>
      </div>
      {children}
    </section> : null}
  </>;
}
