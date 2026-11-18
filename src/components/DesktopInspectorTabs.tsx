import type { ReactNode } from 'react';
import { AudioLines, X, Palette, ScanEye, Lock } from 'lucide-react';

export type DesktopInspectorTab = 'sound' | 'overlay' | 'canvas';

/** Desktop navigation around the same settings used by the mobile popovers. */
export default function DesktopInspectorTabs({ value, onChange, title, accessory, soundLocked, canvasLocked, onCollapse }: {
  value: string | null;
  onChange: (tab: DesktopInspectorTab) => void;
  title: string;
  accessory?: ReactNode;
  soundLocked?: boolean;
  canvasLocked?: boolean;
  onCollapse: () => void;
}) {
  const current = value === 'canvas' ? {label: 'Canvas', Icon: Palette} : value === 'overlay' ? {label: 'Read Aids', Icon: ScanEye} : {label: 'Sound', Icon: AudioLines};
  return <div className="desktop-inspector-navigation" aria-label={`${title} settings`}>
    <div className="desktop-panel-heading"><span className="flex items-center gap-2"><current.Icon size={14} />{current.label}{accessory}</span>
      <button type="button" onClick={onCollapse} aria-label="Collapse inspector" title={`Close ${current.label}`}><X size={16} /></button>
    </div>
    <div className="desktop-inspector-tabs" role="group" aria-label="Inspector settings">
      {([
        ['sound', 'Sound', AudioLines], ['canvas', 'Canvas', Palette], ['overlay', 'Read Aids', ScanEye],
      ] as const).map(([id, label, Icon]) => <button key={id} type="button" aria-pressed={value === id} aria-label={(id === 'sound' && soundLocked) || (id === 'canvas' && canvasLocked) ? `${label} (Pro)` : label}
        onClick={() => onChange(id)}><Icon size={14} /><span>{label}</span>{((id === 'sound' && soundLocked) || (id === 'canvas' && canvasLocked)) ? <Lock size={7} aria-hidden="true" /> : null}</button>)}
    </div>
  </div>;
}
