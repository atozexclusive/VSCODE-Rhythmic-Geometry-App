import { CircleHelp } from 'lucide-react';

interface InfoTipProps {
  text: string;
}

export default function InfoTip({ text }: InfoTipProps) {
  return (
    <span className="relative inline-flex items-center group align-middle">
      <button
        type="button"
        className="w-4 h-4 rounded-full flex items-center justify-center transition-colors"
        style={{
          color: 'rgba(255, 255, 255, 0.38)',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
        aria-label="Show description"
      >
        <CircleHelp size={10} />
      </button>
      <span
        className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-[120] w-48 -translate-x-1/2 rounded-xl border px-3 py-2 text-[10px] leading-relaxed opacity-0 shadow-2xl transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        style={{
          color: 'rgba(255,255,255,0.82)',
          background: 'rgba(17, 17, 22, 0.94)',
          backdropFilter: 'blur(14px)',
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        {text}
      </span>
    </span>
  );
}
