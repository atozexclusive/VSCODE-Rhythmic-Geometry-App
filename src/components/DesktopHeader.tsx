import { BookmarkPlus, UserRound } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import type { CSSProperties } from 'react';

export type DesktopMenuRequest = { tab: 'scenes' | 'account'; version: number };
type Surface = 'orbital' | 'polyrhythm-study' | 'riff-cycle-study' | 'flow';

export default function DesktopHeader({ surface, onSurfaceChange, sceneName, saved, initials, onSave, onAccount, onScene }: {
  surface: Surface; onSurfaceChange: (surface: Surface) => void; sceneName: string; saved: boolean;
  initials?: string; onSave: () => void; onAccount: () => void; onScene: () => void;
}) {
  return <header className="desktop-workspace-header">
    <Link to="/" className="desktop-header-brand" aria-label="Rhythmic Geometry home">
      <img src="/icons/glass-cathedral-192.png" alt="" width={34} height={34} />
      <span>Rhythmic Geometry</span>
    </Link>
    <nav className="desktop-header-modes" aria-label="App mode">
      {([
        ['orbital', 'Orbit', '#72F1B8'],
        ['polyrhythm-study', 'Study', '#7FD7FF'],
        ['riff-cycle-study', 'Riff', '#FFD166'],
      ] as const).map(([id, label, color]) => <button key={id} type="button" aria-pressed={surface === id}
        onClick={() => onSurfaceChange(id)} style={{ '--mode-color': color } as CSSProperties}>
        <span className="desktop-header-mode-dot" />{label}
      </button>)}
    </nav>
    <div className="desktop-header-actions">
      <button type="button" className="desktop-header-scene" onClick={onScene} title={sceneName} aria-label={`Active scene: ${sceneName}`}>
        <strong>{sceneName}</strong><span>{saved ? 'Saved scene' : 'Current scene'}</span>
      </button>
      <button type="button" className="desktop-header-save" onClick={onSave} aria-label="Save Scene" title="Save Scene">
        <BookmarkPlus size={17} /><span>Save Scene</span>
      </button>
      <button type="button" className="desktop-header-account" onClick={onAccount} aria-label="Account" title="Account">
        {initials || <UserRound size={18} />}
      </button>
    </div>
  </header>;
}
