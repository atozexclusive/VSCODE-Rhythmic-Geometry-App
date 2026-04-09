let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  return audioContext;
}

function withVoice(options: {
  type: OscillatorType;
  frequency: number;
  gain: number;
  attack: number;
  release: number;
  filterFrequency: number;
}): void {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = options.type;
  oscillator.frequency.setValueAtTime(options.frequency, now);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(options.filterFrequency, now);
  filter.Q.setValueAtTime(0.55, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(options.gain, now + options.attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + options.release);

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + options.release + 0.04);
}

export function resumeRiffCycleAudio(): void {
  const context = getAudioContext();
  if (context && context.state === 'suspended') {
    void context.resume().catch(() => {});
  }
}

export function triggerReferencePulse(): void {
  withVoice({
    type: 'square',
    frequency: 1660,
    gain: 0.055,
    attack: 0.002,
    release: 0.045,
    filterFrequency: 3000,
  });
}

export function triggerBackbeatAccent(): void {
  withVoice({
    type: 'triangle',
    frequency: 820,
    gain: 0.11,
    attack: 0.002,
    release: 0.12,
    filterFrequency: 1760,
  });
}

export function triggerRiffPulse(options: { frequency: number; gain: number; accented: boolean }): void {
  withVoice({
    type: options.accented ? 'sawtooth' : 'triangle',
    frequency: Math.max(80, Math.min(1600, options.frequency)),
    gain: Math.max(0.02, Math.min(0.24, options.gain + (options.accented ? 0.035 : 0))),
    attack: 0.004,
    release: options.accented ? 0.13 : 0.095,
    filterFrequency: options.accented ? 1020 : 720,
  });

  if (options.accented) {
    withVoice({
      type: 'square',
      frequency: Math.max(180, Math.min(2200, options.frequency * 2.2)),
      gain: Math.max(0.018, Math.min(0.08, options.gain * 0.42)),
      attack: 0.0015,
      release: 0.045,
      filterFrequency: 1800,
    });
  }
}

export function triggerResetCue(): void {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;

  withVoice({
    type: 'triangle',
    frequency: 420,
    gain: 0.045,
    attack: 0.002,
    release: 0.08,
    filterFrequency: 1200,
  });

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(1240, now);
  oscillator.frequency.exponentialRampToValueAtTime(760, now + 0.06);
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(680, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.03, now + 0.004);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.11);
}
