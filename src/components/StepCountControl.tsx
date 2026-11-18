import { Minus, Plus } from 'lucide-react';
import { StudyShellButton } from './StudyInstrumentShell';

export default function StepCountControl({ value, color, onChange, label = 'Steps', unit = 'steps', min = 1, max }: {
  value: number; color: string; onChange: (count: number) => void;
  label?: string; unit?: string; min?: number; max?: number;
}) {
  const update = (count: number) => onChange(Math.max(min, Math.min(max ?? Number.MAX_SAFE_INTEGER, count)));
  return <div className="flex items-center gap-2">
    <StudyShellButton size="square" className="!h-8 !w-8 !rounded-lg" aria-label={`Decrease ${label.toLowerCase()}`} disabled={value <= min} onClick={() => update(value - 1)}><Minus size={14} /></StudyShellButton>
    <label className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-center text-xs" style={{ color, background: `${color}12`, borderColor: `${color}30` }}>
      <input aria-label={label} type="number" inputMode="numeric" min={min} max={max} value={value} onChange={event => { const count = Number(event.target.value); if (Number.isInteger(count) && count >= min) update(count); }} className="w-12 bg-transparent text-center outline-none" /> {unit}
    </label>
    <StudyShellButton size="square" className="!h-8 !w-8 !rounded-lg" aria-label={`Increase ${label.toLowerCase()}`} disabled={max != null && value >= max} onClick={() => update(value + 1)}><Plus size={14} /></StudyShellButton>
  </div>;
}
