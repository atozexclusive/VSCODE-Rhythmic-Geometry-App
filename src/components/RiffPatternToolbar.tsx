import {
  ChevronLeft,
  ChevronRight,
  Contrast,
  FlipHorizontal2,
  Wrench,
  SlidersVertical,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type RiffPatternToolbarProps = {
  guideTarget?: string;
  patternToolsLocked: boolean;
  voicesLocked?: boolean;
  showVoices?: boolean;
  clearLabel?: string;
  voicesOpen?: boolean;
  clearDisabled?: boolean;
  onOffset: (steps: number) => void;
  onInvert: () => void;
  onMirror: () => void;
  onToggleVoices?: () => void;
  onClear: () => void;
  onLockedPatternTools: () => void;
  onLockedVoices?: () => void;
};

export default function RiffPatternToolbar({
  guideTarget,
  patternToolsLocked,
  voicesLocked = false,
  voicesOpen = false,
  showVoices = true,
  clearLabel = 'Clear riff',
  clearDisabled = false,
  onOffset,
  onInvert,
  onMirror,
  onToggleVoices,
  onClear,
  onLockedPatternTools,
  onLockedVoices,
}: RiffPatternToolbarProps) {
  const runPatternTool = (action: () => void) => {
    if (patternToolsLocked) {
      onLockedPatternTools();
      return;
    }
    action();
  };

  const toggleVoices = () => {
    if (voicesLocked) {
      onLockedVoices?.();
      return;
    }
    onToggleVoices?.();
  };

  return (
    <div
      data-guide={guideTarget}
      data-pattern-tools
      role="toolbar"
      aria-label="Pattern tools"
      className="ml-auto flex w-fit items-center gap-1 rounded-xl border border-white/8 bg-black/15 p-1"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-8 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 text-[11px] text-white/58 transition hover:border-white/16 hover:bg-white/[0.06] hover:text-white/78 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            aria-label="Pattern tools"
            title="Pattern tools"
          >
            <span>Pattern tools</span>
            <Wrench size={15} aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="z-[180] w-48 rounded-xl border-white/15 bg-[#181b24]/95 p-1 text-white shadow-xl backdrop-blur-xl"
        >
          {[
            { label: 'Move back one step', icon: ChevronLeft, action: () => runPatternTool(() => onOffset(-1)), locked: patternToolsLocked },
            { label: 'Move forward one step', icon: ChevronRight, action: () => runPatternTool(() => onOffset(1)), locked: patternToolsLocked },
            { label: 'Invert', icon: Contrast, action: () => runPatternTool(onInvert), locked: patternToolsLocked },
            { label: 'Mirror', icon: FlipHorizontal2, action: () => runPatternTool(onMirror), locked: patternToolsLocked },
            ...(showVoices ? [{ label: voicesOpen ? 'Hide voices' : 'Voices', icon: SlidersVertical, action: toggleVoices, locked: voicesLocked }] : []),
          ].map(({ label, icon: Icon, action, locked }) => (
            <DropdownMenuItem
              key={label}
              onSelect={action}
              className="min-h-9 cursor-pointer gap-2 rounded-lg px-2 text-[11px] text-white/75 focus:bg-white/10 focus:text-white"
            >
              <Icon size={13} aria-hidden="true" />
              {label}
              {locked ? <span className="ml-auto text-[9px] text-white/40">Pro</span> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            disabled={clearDisabled}
            onSelect={onClear}
            className="min-h-9 cursor-pointer gap-2 rounded-lg px-2 text-[11px] text-red-300 focus:bg-red-400/10 focus:text-red-200"
          >
            <Trash2 size={13} aria-hidden="true" />
            {clearLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
