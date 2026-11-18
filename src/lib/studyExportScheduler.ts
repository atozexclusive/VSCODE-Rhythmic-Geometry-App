/** Audio-clock scheduling: drawing frames never decide whether a note is heard. */
export function createStudyExportScheduler(
  events: { seconds: number; play: (atTime: number) => void }[],
  startTime: number,
  now: () => number,
) {
  const ordered = [...events].sort((a, b) => a.seconds - b.seconds);
  let next = 0;
  return {
    pump() {
      const horizon = now() + 0.2;
      while (next < ordered.length && startTime + ordered[next].seconds <= horizon) {
        const event = ordered[next++];
        event.play(startTime + event.seconds);
      }
      return next === ordered.length;
    },
  };
}
