import { Bell, Piano, Waves, AudioWaveform } from 'lucide-react';

export default function StudySoundGlyph({ instrument }: { instrument: string }) {
  if (instrument === 'clave') return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4 3 11 12m-9 2L16 5M3 4l2-2m9 14 2-2M5 16l2 2m8-14 2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (instrument === 'cowbell') return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 4h6l4 12H3L7 4Zm0 0V2h6v2M3 16q7 3 14 0" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;
  if (instrument === 'shaker') return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="5" y="3" width="10" height="14" rx="4" transform="rotate(30 10 10)" stroke="currentColor" strokeWidth="1.3" /><path d="m6 8 8 4M3 3l-1 2m15 10 1 2" stroke="currentColor" strokeWidth="1.3" /><circle cx="9" cy="12" r=".6" fill="currentColor" /></svg>;
  if (instrument === 'cascara') return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><ellipse cx="10" cy="6" rx="7" ry="2.5" stroke="currentColor" strokeWidth="1.3" /><path d="M3 6v8c0 3 14 3 14 0V6M6 9v6m8-6v6M2 2l10 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
  if (instrument === 'snare') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <ellipse cx="10" cy="7" rx="7" ry="2.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M3 7v6c0 3.3 14 3.3 14 0V7M6 9v5m8-5v5M4 2l9 4m3-4-7 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  if (instrument === 'tom') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <ellipse cx="10" cy="5" rx="6.5" ry="2.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="m3.5 5 1.7 10c.6 3 9 3 9.6 0l1.7-10M7 8l.7 7M13 8l-.7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (instrument === 'kick') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="9" r="7" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="10" cy="9" r="4.8" stroke="currentColor" strokeWidth="1" />
        <path d="m5 15-2 3m12-3 2 3m-7-8v8m-2 0h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="10" cy="9" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  if (instrument === 'cymbal') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3v14m-4 1 4-3 4 3M2 8c3-1 5-1 6-3h4c1 2 3 2 6 3-4 2-12 2-16 0Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (instrument === 'hi-hat') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2v15m-4 1 4-3 4 3M3 7q7-4 14 0M3 9q7-4 14 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (instrument === 'wood' || instrument === 'wood-block') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="m3 9 10-3 4 3v6L7 18l-4-3V9Zm0 0 4 3 10-3M7 12v6m3-8 4-1M6 5l8-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (instrument === 'chime') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 4h14M5 4v10m5-10v13m5-13v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (instrument === 'crystal-bell') return <Bell size={15} aria-hidden="true" />;
  if (instrument === 'chorus-keys' || instrument === 'velvet-keys') return <Piano size={15} aria-hidden="true" />;
  if (instrument === 'meditation-pad' || instrument === 'ambient-bloom') return <Waves size={15} aria-hidden="true" />;
  return <AudioWaveform size={15} aria-hidden="true" />;
}

