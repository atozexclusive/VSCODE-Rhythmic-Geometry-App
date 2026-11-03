interface RiffPlaybackClock {
  referenceProgress: number;
  lastTimestamp: number | null;
  previousReferenceStep: number;
  wasPlaying: boolean;
}

/** Returns true when a new clock origin must be set after startup work finishes. */
export function advanceRiffPlaybackClock(
  state: RiffPlaybackClock,
  timestamp: number,
  stepsPerSecond: number,
  playing: boolean,
): boolean {
  const starting = playing && (!state.wasPlaying || state.lastTimestamp == null);
  if (playing && !state.wasPlaying) state.previousReferenceStep = -1;
  if (playing && !starting) {
    const elapsed = Math.max(0, Math.min(0.05, (timestamp - state.lastTimestamp!) / 1000));
    state.referenceProgress += elapsed * stepsPerSecond;
  }
  state.lastTimestamp = timestamp;
  state.wasPlaying = playing;
  return starting;
}
