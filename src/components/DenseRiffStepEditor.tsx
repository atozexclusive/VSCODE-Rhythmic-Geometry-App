import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getDenseRiffWindow } from '../lib/riffCycleLayout';
import type { RiffPhrase } from '../lib/riffCycleStudy';

interface Props {
  riff: RiffPhrase;
  center: number;
  selected: number | null;
  onCenter: (index: number) => void;
  onSelect: (index: number) => void;
  onSetActive: (index: number, active: boolean) => void;
  onAccent: (index: number) => void;
  canEdit: (index: number) => boolean;
  onClose: () => void;
}

export default function DenseRiffStepEditor({ riff, center, selected, onCenter, onSelect, onSetActive, onAccent, canEdit, onClose }: Props) {
  const [focusStep, setFocusStep] = useState(selected ?? center);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('keydown', closeOnEscape); previousFocus?.focus(); };
  }, [onClose]);
  const move = (direction: number) => {
    const index = (center + direction * 7 + riff.stepCount) % riff.stepCount;
    setFocusStep(index);
    onCenter(index);
    onSelect(index);
  };
  return (
    <div ref={panel} role="dialog" aria-label="Magnified riff steps" tabIndex={-1}
      className="absolute bottom-28 left-1/2 z-40 w-[min(360px,calc(100%-24px))] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#111218]/95 p-3 text-white shadow-2xl backdrop-blur-xl focus:outline-none">
      <div className="flex items-center justify-between gap-2">
        <span className="pl-1 font-mono text-xs tracking-widest text-white/70">STEPS · {riff.stepCount}</span>
        <button type="button" onClick={onClose} aria-label="Close magnified steps" className="flex h-11 w-11 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-300"><X size={18} /></button>
      </div>
      <div className="relative h-28" style={{ color: riff.color }}>
        <svg viewBox="0 0 322 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true"><path d="M23 63 Q161 -10 299 63" fill="none" stroke="currentColor" strokeOpacity=".25" /></svg>
        {getDenseRiffWindow(center, riff.stepCount).map((index, position) => {
          const active = Boolean(riff.activeSteps[index]);
          const accented = active && Boolean(riff.accents[index]);
          return <button key={index} type="button" disabled={!canEdit(index)} aria-label={`Step ${index + 1}, ${active ? accented ? 'accent' : 'hit' : 'rest'}`} aria-pressed={active}
            onClick={() => { setFocusStep(index); onSetActive(index, !active); onSelect(index); }}
            className="absolute flex h-16 w-[14.28%] flex-col items-center justify-center gap-2 rounded-xl hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-40"
            style={{ left: `${position * 100 / 7}%`, top: 16 + Math.pow((position - 3) / 3, 2) * 24, background: focusStep === index ? 'rgba(255,255,255,.07)' : undefined }}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border" style={{ borderColor: accented ? '#FFD166' : active ? riff.color : '#ffffff30', background: active ? riff.color : '#ffffff12', boxShadow: active ? `0 0 10px ${riff.color}55` : undefined }}>
              {accented && <span className="h-2 w-2 rotate-45 border border-black/70 bg-[#FFD166]" />}
            </span>
            <span className="font-mono text-xs text-white/80">{index + 1}</span>
          </button>;
        })}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => move(-1)} aria-label="Previous seven steps" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/70 focus-visible:ring-2 focus-visible:ring-sky-300"><ChevronLeft size={18} /></button>
        <button type="button" disabled={!canEdit(focusStep)} onClick={() => { onAccent(focusStep); onSelect(focusStep); }} aria-pressed={Boolean(riff.accents[focusStep])}
          className="h-11 flex-1 rounded-xl border border-amber-200/20 bg-amber-200/5 font-mono text-xs text-amber-200 focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-40">◇ ACCENT · {focusStep + 1}</button>
        <button type="button" onClick={() => move(1)} aria-label="Next seven steps" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/70 focus-visible:ring-2 focus-visible:ring-sky-300"><ChevronRight size={18} /></button>
      </div>
      <p className="mt-2 text-center text-[11px] text-white/45">Tap a step for hit / rest. Tap outside to close.</p>
    </div>
  );
}
