import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

type ShellTone = 'neutral' | 'green' | 'blue' | 'amber' | 'pink' | 'red';
type ShellButtonSize = 'default' | 'compact' | 'square';

function getToneStyles(tone: ShellTone, highlighted: boolean): CSSProperties {
  if (!highlighted) {
    return {
      background: 'rgba(255,255,255,0.04)',
      borderColor: 'rgba(255,255,255,0.1)',
      color: 'rgba(255,255,255,0.72)',
    };
  }

  switch (tone) {
    case 'green':
      return {
        background: 'rgba(114,241,184,0.16)',
        borderColor: 'rgba(114,241,184,0.28)',
        color: '#72F1B8',
        boxShadow: '0 0 0 1px rgba(114,241,184,0.16) inset',
      };
    case 'blue':
      return {
        background: 'rgba(127,215,255,0.14)',
        borderColor: 'rgba(127,215,255,0.24)',
        color: '#7FD7FF',
        boxShadow: '0 0 0 1px rgba(127,215,255,0.16) inset',
      };
    case 'amber':
      return {
        background: 'rgba(255,170,0,0.12)',
        borderColor: 'rgba(255,170,0,0.22)',
        color: '#FFAA00',
        boxShadow: '0 0 0 1px rgba(255,170,0,0.14) inset',
      };
    case 'pink':
      return {
        background: 'rgba(255,136,194,0.12)',
        borderColor: 'rgba(255,136,194,0.24)',
        color: '#FF88C2',
        boxShadow: '0 0 0 1px rgba(255,136,194,0.14) inset',
      };
    case 'red':
      return {
        background: 'rgba(255,51,102,0.18)',
        borderColor: 'rgba(255,51,102,0.3)',
        color: '#FF3366',
        boxShadow: '0 0 0 1px rgba(255,51,102,0.16) inset',
      };
    case 'neutral':
    default:
      return {
        background: 'rgba(255,255,255,0.1)',
        borderColor: 'rgba(255,255,255,0.18)',
        color: 'rgba(255,255,255,0.88)',
      };
  }
}

function getButtonSizeClass(size: ShellButtonSize): string {
  if (size === 'square') {
    return 'h-10 w-10 rounded-xl px-0';
  }
  if (size === 'compact') {
    return 'h-8 rounded-xl px-2.5';
  }
  return 'h-10 rounded-2xl px-3.5';
}

export function StudyShellPanel({
  children,
  className = '',
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[1.5rem] border px-3.5 py-3.5 ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(17,17,22,0.92), rgba(17,17,22,0.82))',
        borderColor: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(14px)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function StudyShellDock({
  children,
  className = '',
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[1.45rem] border px-3.5 py-2.5 ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(17,17,22,0.94), rgba(17,17,22,0.84))',
        borderColor: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

interface StudyShellButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  tone?: ShellTone;
  highlighted?: boolean;
  size?: ShellButtonSize;
}

export function StudyShellButton({
  children,
  className = '',
  icon,
  tone = 'neutral',
  highlighted = false,
  size = 'default',
  style,
  ...props
}: StudyShellButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap border text-[10px] font-mono uppercase tracking-[0.15em] transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${getButtonSizeClass(
        size,
      )} ${className}`}
      style={{
        ...getToneStyles(tone, highlighted),
        ...style,
      }}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function StudyShellChip({
  children,
  tone = 'neutral',
  highlighted = false,
  className = '',
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: ShellTone;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-full border px-3 py-1 text-[9px] font-mono uppercase tracking-[0.16em] ${className}`}
      style={{
        ...getToneStyles(tone, highlighted),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
