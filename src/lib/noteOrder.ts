export const NOTE_ORDER_OPTIONS = [
  ['standard', 'Standard'],
  ['ascending', 'Ascending'],
  ['descending', 'Descending'],
  ['up-down', 'Ascending To Descending'],
  ['arpeggio', 'Arpeggio'],
  ['random', 'Random'],
] as const;
export type NoteOrder = typeof NOTE_ORDER_OPTIONS[number][0];
export function normalizeNoteOrder(value: unknown): NoteOrder {
  return NOTE_ORDER_OPTIONS.some(([id]) => id === value) ? value as NoteOrder : 'standard';
}
/** Deterministic note walks keep playback, restart and exports repeatable. */
export function getNoteOrderOffset(order: NoteOrder, hitIndex: number, scaleLength: number): number {
  const hit = Math.max(0, Math.floor(hitIndex));
  const length = Math.max(1, scaleLength);
  if (order === 'ascending') return hit % length;
  if (order === 'descending') return length - 1 - hit % length;
  if (order === 'up-down') {
    const span = Math.max(1, 2 * length - 2), position = hit % span;
    return position < length ? position : span - position;
  }
  if (order === 'arpeggio') return [0, 2, 4, 2][hit % 4] % length;
  if (order === 'random') return ((hit * 1103515245 + 12345) >>> 16) % length;
  return 0;
}
