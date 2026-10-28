import { NOTE_ORDER_OPTIONS, type NoteOrder } from '../lib/noteOrder';

export default function NoteOrderControl({ value, onChange, mode }: {
  value: NoteOrder;
  onChange: (value: NoteOrder) => void;
  mode: 'Study' | 'Orbit';
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[9px] font-mono uppercase tracking-[0.16em] text-white/50">Note Order</span>
      <select
        aria-label={`${mode} note order`}
        value={value}
        onChange={event => onChange(event.target.value as NoteOrder)}
        className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-[11px] font-mono uppercase tracking-[0.12em] text-white outline-none"
      >
        {NOTE_ORDER_OPTIONS.map(([id, label]) => <option key={id} value={id} style={{ background: '#181820' }}>{label}</option>)}
      </select>
    </label>
  );
}
