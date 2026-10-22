import { useId, useRef, useState, type ReactNode } from 'react';
import { Dice5, Lock, Minimize2, MoreHorizontal, Pause, Play, Plus, RotateCcw, Shuffle, Volume2, VolumeX } from 'lucide-react';

interface Props {
  playing: boolean;
  muted: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onRandom: () => void;
  onRandomPlus: () => void;
  onRemix: () => void;
  onToggleMute: () => void;
  onExit: () => void;
  randomPlusLocked?: boolean;
  remixLocked?: boolean;
  muteGuide?: string;
  exitGuide?: string;
  optionsLabel?: string;
  children?: ReactNode;
}

export default function FullscreenControls({ playing, muted, onTogglePlay, onRestart, onRandom, onRandomPlus, onRemix, onToggleMute, onExit, randomPlusLocked, remixLocked, muteGuide, exitGuide, optionsLabel = 'Fullscreen options', children }: Props) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsId = useId();
  const optionsButton = useRef<HTMLButtonElement>(null);
  return <div className="pointer-events-none fixed inset-x-3 z-30 flex justify-center" style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}>
    <div className="pointer-events-auto relative max-w-full" onKeyDown={(event) => {
      if (event.key === 'Escape' && optionsOpen) {
        event.preventDefault(); event.stopPropagation(); setOptionsOpen(false); optionsButton.current?.focus();
      }
    }}>
      {optionsOpen && children ? <>
        <button type="button" aria-label="Close fullscreen options" className="fixed inset-0 -z-10 cursor-default" onClick={() => setOptionsOpen(false)} />
        <div id={optionsId} role="region" aria-label={optionsLabel} className="absolute bottom-[54px] right-0 max-h-[min(360px,65dvh)] w-[min(300px,calc(100vw-24px))] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-[#17171e]/90 p-3 text-white/65 shadow-xl backdrop-blur-xl">
          {children}
        </div>
      </> : null}
      <div role="toolbar" aria-label="Fullscreen controls" className="flex max-w-full items-center gap-0.5 rounded-full border border-white/[0.05] bg-[#17171e]/40 p-1 backdrop-blur-md">
        {[
          { id: 'play', label: playing ? 'Pause' : 'Play', icon: playing ? <Pause size={14} strokeWidth={1.5} /> : <Play size={14} strokeWidth={1.5} />, action: onTogglePlay, pressed: playing },
          { id: 'restart', label: 'Restart', icon: <RotateCcw size={14} strokeWidth={1.5} />, action: onRestart },
          { id: 'random', label: 'Random', icon: <Dice5 size={14} strokeWidth={1.5} />, action: onRandom, separator: true },
          { id: 'random-plus', label: 'Random+', icon: <span className="relative flex h-4 w-4 items-center justify-center"><Dice5 size={14} strokeWidth={1.5} /><Plus size={9} strokeWidth={2} className="absolute -right-1 -top-0.5 rounded-full bg-[#17171e]" /></span>, action: onRandomPlus, locked: randomPlusLocked },
          { id: 'remix', label: 'Remix', icon: <Shuffle size={14} strokeWidth={1.5} />, action: onRemix, locked: remixLocked },
          { id: 'mute', label: muted ? 'Unmute' : 'Mute', icon: muted ? <VolumeX size={14} strokeWidth={1.5} /> : <Volume2 size={14} strokeWidth={1.5} />, action: onToggleMute, pressed: muted, separator: true, guide: muteGuide },
          ...(children ? [{ id: 'options', label: optionsLabel, icon: <MoreHorizontal size={14} strokeWidth={1.5} />, action: () => setOptionsOpen((current) => !current), pressed: optionsOpen }] : []),
          { id: 'exit', label: 'Exit Fullscreen', icon: <Minimize2 size={14} strokeWidth={1.5} />, action: onExit, guide: exitGuide },
        ].map(({ id, label, icon, action, locked, pressed, separator, guide }) => <div key={id} className={`flex min-w-0 items-center ${separator ? 'before:mx-1 before:h-3.5 before:w-px before:shrink-0 before:bg-white/[0.08]' : ''}`}>
          <button type="button" ref={id === 'options' ? optionsButton : undefined} onClick={() => { if (id !== 'options') setOptionsOpen(false); action(); }}
            data-guide={guide} aria-label={locked ? `${label} (Pro)` : label} title={locked ? `${label} (Pro)` : label} aria-pressed={pressed}
            aria-expanded={id === 'options' ? optionsOpen : undefined} aria-controls={id === 'options' && optionsOpen ? optionsId : undefined}
            className="relative flex h-9 w-9 min-w-7 shrink items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white/75 focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-sky-200/60 active:bg-white/10">
            <span aria-hidden="true">{icon}</span>
            {locked ? <Lock size={7} aria-hidden="true" className="absolute bottom-1.5 right-1.5 text-white/30" /> : null}
          </button>
        </div>)}
      </div>
    </div>
  </div>;
}
