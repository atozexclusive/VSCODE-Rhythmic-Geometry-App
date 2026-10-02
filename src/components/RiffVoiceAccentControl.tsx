import { useId, useState } from 'react';

export function RiffVoiceAccentControl({ beat, instrument, value, pattern, cycleFlash, onCycleFlashChange, onChange }: {
  beat: number;
  instrument: string;
  value?: number;
  pattern?: boolean[];
  cycleFlash?: boolean;
  onCycleFlashChange: (enabled: boolean) => void;
  onChange: (interval: number | undefined, pattern?: boolean[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const setInterval = (next: number) => {
    const interval = Math.max(0, Math.min(100, next)) || undefined;
    onChange(interval, interval != null && pattern != null
      ? Array.from({ length: interval }, (_, index) => pattern[index] ?? false)
      : undefined);
  };
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((current) => !current)}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] transition-colors ${value != null
            ? 'border-[#FFD166]/70 bg-[#FFD166]/15 text-[#FFD166] shadow-[0_0_10px_rgba(255,209,102,0.12)] hover:bg-[#FFD166]/20'
            : 'border-white/15 bg-white/5 text-white/75 hover:bg-white/10'}`}
        >
          {value != null && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#FFD166]" />}
          Accent{value != null ? ` · ${value}` : ''}
        </button>
      </div>
      {open && (
        <div id={id} className="space-y-1.5 rounded-lg border border-white/10 bg-black/10 p-2" role="group" aria-label="Accent interval">
          <div className="flex items-center justify-between gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-white/60">
            <span className="font-semibold">Accent steps</span>
            <span>{instrument} · {beat}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Decrease accent length" disabled={value == null}
              onClick={() => setInterval((value ?? 0) - 1)}
              className="h-7 w-7 shrink-0 rounded-lg border border-white/15 bg-white/5 text-xs text-white/65 hover:bg-white/10 disabled:opacity-30">−</button>
            <label className="flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-[#FFD166]/20 bg-[#FFD166]/[0.07] text-[11px] font-light text-[#FFD166]">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={draft ?? (value == null ? 'Off' : String(value))}
                onFocus={(event) => { setDraft(String(value ?? 0)); event.currentTarget.select(); }}
                onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                onBlur={() => { if (draft != null && draft !== '') setInterval(Number(draft)); setDraft(null); }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    const next = Math.max(0, Math.min(100, Number(draft ?? value ?? 0) + (event.key === 'ArrowUp' ? 1 : -1)));
                    setDraft(String(next)); setInterval(next);
                  }
                }}
                className="w-7 bg-transparent text-center tabular-nums outline-none focus-visible:rounded focus-visible:ring-1 focus-visible:ring-[#FFD166]/50"
                aria-label="Accent length, 0 for off, 1 to 100 steps"
              />
              {value != null && <span>{value === 1 ? 'every hit' : 'steps'}</span>}
            </label>
            <button type="button" aria-label="Increase accent length" disabled={value === 100}
              onClick={() => setInterval((value ?? 0) + 1)}
              className="h-7 w-7 shrink-0 rounded-lg border border-white/15 bg-white/5 text-xs text-white/65 hover:bg-white/10 disabled:opacity-30">+</button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={pattern != null}
              aria-expanded={pattern != null}
              aria-controls={`${id}-custom`}
              onClick={() => onChange(value ?? 5, pattern == null
                ? Array.from({ length: value ?? 5 }, (_, index) => index === 0)
                : undefined)}
              className="h-6 rounded-md border border-white/15 px-2 text-[9px] text-white/65 hover:bg-white/10 aria-pressed:border-[#FFD166]/70 aria-pressed:text-[#FFD166]"
            >Custom</button>
            {value != null && (
              <button
                type="button"
                aria-label="Accent cycle flash"
                aria-pressed={cycleFlash === true}
                title="Pulse the voice symbol when the accent pattern completes"
                onClick={() => onCycleFlashChange(!cycleFlash)}
                className="h-6 rounded-md border border-white/15 px-2 text-[9px] text-white/55 hover:bg-white/10 aria-pressed:border-[#FFD166]/50 aria-pressed:text-[#FFD166]"
              >Cycle flash</button>
            )}
          </div>
          {pattern != null && value != null && (
            <div id={`${id}-custom`} role="group" aria-label="Custom accent steps" className="flex gap-1 overflow-x-auto pb-1">
              {Array.from({ length: value }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Accent step ${index + 1}`}
                  aria-pressed={pattern[index] === true}
                  onClick={() => onChange(value, Array.from({ length: value }, (_, step) => step === index ? !pattern[step] : pattern[step] === true))}
                  className="group flex h-11 min-w-8 max-w-10 flex-1 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/[0.025] text-[8px] text-white/45 hover:bg-white/10 aria-pressed:border-[#FFD166]/50 aria-pressed:bg-[#FFD166]/10 aria-pressed:text-[#FFD166]"
                >
                  <span>{index + 1}</span>
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full border border-current bg-white/5 group-aria-pressed:bg-[#FFD166]" />
                  <span className="text-[6px] uppercase tracking-wider">{pattern[index] ? 'Hit' : 'Rest'}</span>
                </button>
              ))}
            </div>
          )}
          <p className="text-[9px] text-white/45">{value == null
            ? 'Choose how many grid steps between accents.'
            : pattern != null
              ? 'Tap steps to place accents. Restarts with the riff on 1.'
              : `Every ${value} grid steps. Restarts with the riff on 1.`}</p>
        </div>
      )}
    </div>
  );
}
