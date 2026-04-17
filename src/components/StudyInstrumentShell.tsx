import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

type ShellTone = 'neutral' | 'green' | 'blue' | 'amber' | 'pink' | 'red';
type ShellButtonSize = 'default' | 'compact' | 'square';

function colorAlpha(color: string, alphaHex: string, fallback: string): string {
  return color.startsWith('#') ? `${color}${alphaHex}` : fallback;
}

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

export function StudyShellPremiumPanel({
  children,
  className = '',
  style,
  accent = '#72F1B8',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  accent?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[1.65rem] border px-3.5 py-3.5"
      style={{
        background: `
          radial-gradient(circle at 82% -12%, ${colorAlpha(accent, '2a', 'rgba(114,241,184,0.16)')}, transparent 42%),
          radial-gradient(circle at 10% 0%, rgba(255,255,255,0.08), transparent 38%),
          linear-gradient(145deg, rgba(18,20,28,0.94), rgba(9,11,18,0.86))
        `,
        borderColor: colorAlpha(accent, '24', 'rgba(255,255,255,0.12)'),
        boxShadow: `
          0 24px 68px rgba(0,0,0,0.38),
          0 0 34px ${colorAlpha(accent, '10', 'rgba(114,241,184,0.07)')},
          inset 0 1px 0 rgba(255,255,255,0.08),
          inset 0 -1px 0 rgba(255,255,255,0.03)
        `,
        backdropFilter: 'blur(20px)',
        ...style,
      }}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-x-5 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${colorAlpha(accent, '70', 'rgba(255,255,255,0.42)')}, transparent)`,
        }}
      />
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-36 w-36 rounded-full blur-2xl"
        style={{ background: colorAlpha(accent, '18', 'rgba(114,241,184,0.1)') }}
      />
      <div className={`relative ${className}`}>{children}</div>
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

interface StudyShellFloatingMenuButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  accent?: string;
  eyebrow?: string;
  label: string;
  detail?: string;
  icon?: ReactNode;
}

export function StudyShellFloatingMenuButton({
  accent = '#72F1B8',
  eyebrow = 'Menu',
  label,
  detail,
  icon,
  className = '',
  style,
  ...props
}: StudyShellFloatingMenuButtonProps) {
  return (
    <button
      type="button"
      className={`group inline-flex min-w-[12rem] items-center justify-between gap-3 rounded-[1.35rem] border px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${className}`}
      style={{
        background: `
          radial-gradient(circle at 85% 15%, ${colorAlpha(accent, '24', 'rgba(114,241,184,0.14)')}, transparent 42%),
          linear-gradient(145deg, rgba(18,20,28,0.92), rgba(8,10,16,0.82))
        `,
        borderColor: colorAlpha(accent, '28', 'rgba(255,255,255,0.12)'),
        color: 'rgba(255,255,255,0.86)',
        boxShadow: `
          0 18px 46px rgba(0,0,0,0.34),
          0 0 26px ${colorAlpha(accent, '12', 'rgba(114,241,184,0.08)')},
          inset 0 1px 0 rgba(255,255,255,0.08)
        `,
        backdropFilter: 'blur(18px)',
        ...style,
      }}
      {...props}
    >
      <span className="min-w-0">
        <span
          className="block text-[8px] font-mono uppercase tracking-[0.22em]"
          style={{ color: colorAlpha(accent, 'd8', accent) }}
        >
          {eyebrow}
        </span>
        <span className="mt-0.5 block truncate text-[12px] font-medium text-white/84">
          {label}
        </span>
        {detail ? (
          <span className="mt-0.5 block truncate text-[10px] text-white/42">
            {detail}
          </span>
        ) : null}
      </span>
      {icon ? (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors group-hover:bg-white/[0.08]"
          style={{
            borderColor: colorAlpha(accent, '24', 'rgba(255,255,255,0.1)'),
            background: colorAlpha(accent, '10', 'rgba(255,255,255,0.05)'),
            color: colorAlpha(accent, 'ee', accent),
          }}
        >
          {icon}
        </span>
      ) : null}
    </button>
  );
}
