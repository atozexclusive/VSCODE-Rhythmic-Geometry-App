import { ChevronDown, Eye, EyeOff, Rows3, Frame, Minus, Plus, ScanLine } from 'lucide-react';
import ReadAidOption from './ReadAidOption';

type WindowSize = 1 | 2 | 4 | 'pattern';
export default function RiffLaneOptions({ visible, bars, windowSize, bounds, onVisible, onBars, onWindow, onBounds }: {
  visible: boolean; bars: number; windowSize: WindowSize; bounds: boolean;
  onVisible: (visible: boolean) => void; onBars: (bars: number) => void;
  onWindow: (window: WindowSize) => void; onBounds: () => void;
}) {
  const heading = 'mb-1.5 text-[9px] font-mono font-medium uppercase tracking-[0.14em] text-white/40';
  return <details data-guide="riff-desktop-roll-size" className="desktop-lane-options group">
    <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 text-[10px] text-white/70 [&::-webkit-details-marker]:hidden">
      <Rows3 size={13} className="opacity-65" />Lane View<ChevronDown size={13} className="ml-auto transition-transform group-open:rotate-180" />
    </summary>
    <div className="space-y-3 pt-2">
      <section aria-label="Visibility"><h3 className={heading}>Visibility</h3>
        <div className="grid grid-cols-2 gap-1.5">
          <ReadAidOption active={visible} icon={<Eye size={13} />} onClick={() => onVisible(true)}>Show Lane</ReadAidOption>
          <ReadAidOption active={!visible} icon={<EyeOff size={13} />} onClick={() => onVisible(false)}>Hide Lane</ReadAidOption>
        </div>
      </section>
      <section aria-label="View Bars"><h3 className={heading}>View Bars</h3>
        <div className="lane-bar-count flex items-center gap-1.5">
          <button type="button" aria-label="Show fewer bars in lane" disabled={bars <= 1} onClick={() => onBars(Math.max(1,bars-1))} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-white/10 bg-white/[.025] text-white/60 disabled:opacity-30"><Minus size={13} /></button>
          <span className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-white/10 bg-white/[.025] text-[10px] text-white/70">{bars}<span className="text-white/40">bars</span></span>
          <button type="button" aria-label="Show more bars in lane" disabled={bars >= 16} onClick={() => onBars(Math.min(16,bars+1))} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-white/10 bg-white/[.025] text-white/60 disabled:opacity-30"><Plus size={13} /></button>
        </div>
      </section>
      <section aria-label="Window"><h3 className={heading}>Window</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {([{ value: 1, label: '1 Bar' }, { value: 2, label: '2 Bars' }, { value: 4, label: '4 Bars' }, { value: 'pattern', label: 'Pattern' }] as const).map(option =>
            <ReadAidOption key={option.value} active={windowSize === option.value} icon={option.value === 'pattern' ? <ScanLine size={13} /> : <Rows3 size={13} />} onClick={() => onWindow(option.value)}>{option.label}</ReadAidOption>)}
          <ReadAidOption active={bounds} icon={<Frame size={13} />} onClick={onBounds}>Riff Bounds</ReadAidOption>
        </div>
      </section>
    </div>
  </details>;
}
