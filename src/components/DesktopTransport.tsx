import { CircleHelp, Maximize2, Menu, Pause, Play, RotateCcw, Volume2, VolumeX, Lock } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import PatternActionIcon from './PatternActionIcon';
import { StudyShellButton } from './StudyInstrumentShell';

function TempoInput({ value, min, max, onCommit }: { value: number; min: number; max: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const parsed = Number(draft);
    const next = draft.trim() && Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : value;
    setDraft(String(next));
    onCommit(next);
  };
  return <input type="number" min={min} max={max} value={draft} aria-label="Type exact tempo"
    onFocus={event => event.currentTarget.select()} onChange={event => setDraft(event.currentTarget.value)} onBlur={commit}
    onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') {setDraft(String(value));} }} />;
}

type Props = {
  mode: 'study' | 'riff' | 'orbit';
  playing: boolean;
  muted: boolean;
  tempo: number;
  min: number;
  max: number;
  tempoLabel?: string;
  onTempo: (value: number) => void;
  onPlay: () => void;
  onRestart: () => void;
  onRandom: () => void;
  onRandomPlus: () => void;
  onRemix: () => void;
  randomPlusLocked?: boolean;
  remixLocked?: boolean;
  onAudio: () => void;
  onFullscreen: () => void;
  onGuide: () => void;
  onMenu: () => void;
};
export default function DesktopTransport(p: Props) {
  function action(label: string, icon: ReactNode, onClick: () => void, tone = '', text = false, guide?: string) {
    return <StudyShellButton title={label} aria-label={label} onClick={onClick} tone={tone === 'green' ? 'green' : tone === 'amber' ? 'amber' : 'neutral'} highlighted={tone === 'green' || tone === 'amber'}
      icon={icon} className="desktop-transport-action !h-8 !rounded-lg !text-[8px]" data-guide={guide}>{text ? label : null}</StudyShellButton>;
  }
  return <div className="desktop-transport" role="toolbar" aria-label="Playback">
    <div className="desktop-pattern-actions" role="toolbar" aria-label="Pattern quick actions">
      {([
        ['random', 'Random', p.onRandom, false],
        ['random-plus', 'Random+', p.onRandomPlus, p.randomPlusLocked],
        ['remix', 'Remix', p.onRemix, p.remixLocked],
      ] as const).map(([id,label,onClick,locked]) => <button key={id} type="button" aria-label={locked ? `${label} (Pro)` : label} title={label} onClick={onClick}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white/75 active:bg-white/10">
        <PatternActionIcon action={id} size={14} />{locked ? <Lock size={7} className="absolute right-1.5 bottom-1.5 text-white/30" /> : null}</button>)}
    </div>
      <div className="desktop-transport-group" data-guide={`${p.mode}-desktop-transport`}>
        {action(p.playing ? 'Pause' : 'Play', p.playing ? <Pause size={12} /> : <Play size={12} />, p.onPlay, 'green', true)}
        {action('Restart', <RotateCcw size={12} />, p.onRestart, 'amber', true)}
        {action('Audio', p.muted ? <VolumeX size={12} /> : <Volume2 size={12} />, p.onAudio, '', true)}
      </div>
      <div className="desktop-tempo" data-guide={`${p.mode}-desktop-tempo`}>
        <label htmlFor={`${p.mode}-desktop-tempo`}>Tempo</label>
        <input id={`${p.mode}-desktop-tempo`} type="range" min={p.min} max={p.max} step="1" value={p.tempo}
          onChange={event => p.onTempo(Number(event.currentTarget.value))} />
        <TempoInput value={p.tempo} min={p.min} max={p.max} onCommit={p.onTempo} />
        <span title={p.tempoLabel}>{p.tempoLabel ?? 'BPM'}</span>
      </div>
      <div className="desktop-transport-group">
        {action('Guide', <CircleHelp size={12} />, p.onGuide, '', true)}
        {action('Fullscreen', <Maximize2 size={12} />, p.onFullscreen, '', false, `${p.mode}-desktop-present`)}
        {action('Open menu', <Menu size={12} />, p.onMenu, '', false, `${p.mode}-desktop-menu`)}
      </div>
    </div>;
}
