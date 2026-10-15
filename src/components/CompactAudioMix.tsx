import { useLayoutEffect, useRef, useState } from 'react';
import { CircleDot, Volume2, VolumeX } from 'lucide-react';

interface AudioChannel {
  id: string;
  label: string;
  color: string;
  enabled: boolean;
  value: number;
  max: number;
  onToggle: () => void;
  onChange: (value: number) => void;
}
interface Props {
  prefix: string;
  audioLabel?: string;
  color: string;
  enabled: boolean;
  onToggle: () => void;
  onClose: () => void;
  channels: AudioChannel[];
  reverb: number;
  onReverbChange: (value: number) => void;
  onReverbLocked?: () => void;
}

export default function CompactAudioMix({ prefix, audioLabel = 'Study', color, enabled, onToggle, onClose, channels, reverb, onReverbChange, onReverbLocked }: Props) {
  const [reverbMode, setReverbMode] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [availableHeight, setAvailableHeight] = useState(300);

  useLayoutEffect(() => {
    const updateAvailableHeight = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const viewportTop = window.visualViewport?.offsetTop ?? 0;
      setAvailableHeight(Math.max(80, Math.min(300, panel.getBoundingClientRect().bottom - viewportTop - 12)));
    };
    updateAvailableHeight();
    window.addEventListener('scroll', updateAvailableHeight, true);
    window.addEventListener('resize', updateAvailableHeight);
    window.visualViewport?.addEventListener('resize', updateAvailableHeight);
    return () => {
      window.removeEventListener('scroll', updateAvailableHeight, true);
      window.removeEventListener('resize', updateAvailableHeight);
      window.visualViewport?.removeEventListener('resize', updateAvailableHeight);
    };
  }, []);

  const controls: AudioChannel[] = reverbMode ? [{ id: 'reverb', label: 'Reverb', color: '#C8A8FF', enabled: reverb > 0, value: reverb, max: 1, onToggle: () => onReverbChange(reverb > 0 ? 0 : .25), onChange: onReverbChange }] : channels;
  return <div ref={panelRef} data-guide={`${prefix}-audio-mix`} data-compact-audio-mix role="region" aria-label="Audio mix"
    className="absolute right-3 bottom-[calc(100%+4rem)] z-50 w-[min(260px,calc(100vw-2rem))] max-h-[min(300px,65svh)] overflow-y-auto rounded-[18px] border backdrop-blur-xl"
    style={{ maxHeight: `min(${availableHeight}px, 65svh)`, borderColor: 'rgba(127,215,255,.2)', background: `radial-gradient(circle at 12% -12%,${color}22,transparent 36%),radial-gradient(circle at 92% 0%,rgba(127,215,255,.16),transparent 34%),linear-gradient(180deg,rgba(14,17,24,.76),rgba(7,9,15,.68))`, boxShadow: '0 12px 32px rgba(0,0,0,.28),0 0 22px rgba(127,215,255,.08),inset 0 1px 0 rgba(255,255,255,.09)' }}
    onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
    <div className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-2">
      <div className="flex items-center gap-2 text-[9px] font-medium tracking-wide text-[#7FD7FF]"><Volume2 size={12} />Audio Mix</div>
      <div className="flex items-center gap-1"><button type="button" aria-pressed={reverbMode} onClick={() => { if (onReverbLocked) { onReverbLocked(); return; } setReverbMode((current) => !current); }} className="flex h-6 items-center rounded-lg border border-white/10 bg-white/5 px-2 font-mono text-[8px] uppercase tracking-wide" style={{ color: reverbMode ? '#C8A8FF' : 'rgba(255,255,255,.58)' }}>Reverb</button><button type="button" aria-label={`${enabled ? 'Mute' : 'Enable'} ${audioLabel} audio`} onClick={onToggle} className="flex h-6 items-center gap-1 rounded-lg border border-sky-200/20 bg-sky-200/10 px-2 font-mono text-[8px] uppercase text-sky-200">{enabled ? <Volume2 size={12} /> : <VolumeX size={12} />}{enabled ? 'On' : 'Off'}</button></div>
    </div>
    <div className="px-3 py-1">{controls.map((channel, index) => <div key={channel.id} className={`relative py-1.5 pl-2 ${index ? 'border-t border-white/[.07]' : ''}`}>
      <div className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full" style={{ background: channel.enabled ? channel.color : 'rgba(255,255,255,.16)', boxShadow: channel.enabled ? `0 0 14px ${channel.color}55` : 'none' }} />
      <div className="mb-0.5 flex items-center gap-1.5"><CircleDot size={14} style={{ color: channel.color }} /><span className="min-w-0 flex-1 text-[9px] font-medium tracking-wide" style={{ color: channel.enabled ? channel.color : 'rgba(255,255,255,.48)' }}>{channel.label}</span><span className="font-mono text-[8px] text-white/40">{Math.round(channel.value / channel.max * 100)}%</span><button type="button" aria-label={`${channel.enabled ? 'Mute' : 'Enable'} ${channel.label}`} onClick={channel.onToggle} className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10" style={{ color: channel.enabled ? channel.color : 'rgba(255,255,255,.4)' }}>{channel.enabled ? <Volume2 size={12} /> : <VolumeX size={12} />}</button></div>
      <input type="range" min={0} max={channel.max} step={.001} value={channel.value} onChange={(event) => channel.onChange(Number(event.target.value))} aria-label={`${channel.label} ${reverbMode ? 'reverb' : 'volume'}`} className="touch-slider rg-transport-tempo-track" style={{ ['--slider-accent' as string]: channel.color }} />
    </div>)}</div>
  </div>;
}
