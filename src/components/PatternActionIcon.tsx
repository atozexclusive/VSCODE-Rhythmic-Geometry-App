import { Dice5, Plus, Shuffle } from 'lucide-react';

/** Keep generator symbols identical in canvas, desktop and fullscreen controls. */
export default function PatternActionIcon({ action, size = 14 }: {
  action: 'random' | 'random-plus' | 'remix';
  size?: number;
}) {
  if (action === 'remix') return <Shuffle size={size} strokeWidth={1.5} aria-hidden="true" />;
  if (action === 'random') return <Dice5 size={size} strokeWidth={1.5} aria-hidden="true" />;
  return <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden="true">
    <Dice5 size={size} strokeWidth={1.5} />
    <Plus size={9} strokeWidth={2} className="absolute -right-1 -top-0.5 rounded-full bg-[#17171e]" />
  </span>;
}
