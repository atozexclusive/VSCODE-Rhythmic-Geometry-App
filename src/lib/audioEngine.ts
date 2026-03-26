// ============================================================
// Orbital Polymeter — Audio Engine
// Every rotation triggers audio. At high speeds, transitions
// from discrete beeps to sustained chord tones.
// ============================================================

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let triggerCount = 0;
let triggerWindowStart = 0;
let currentTriggerRate = 0; // triggers per second

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function getMasterGain(): GainNode {
  getAudioContext();
  return masterGain!;
}

/**
 * Map hex color to a musical frequency.
 * Uses hue to select from a pentatonic scale across 3 octaves.
 */
function colorToFrequency(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  // Pentatonic scale notes: C, D, E, G, A across 3 octaves
  const pentatonic = [
    261.63, 293.66, 329.63, 392.00, 440.00,
    523.25, 587.33, 659.25, 783.99, 880.00,
    1046.50, 1174.66, 1318.51, 1567.98, 1760.00,
  ];
  const idx = Math.floor(h * (pentatonic.length - 1));
  return pentatonic[Math.min(idx, pentatonic.length - 1)];
}

/**
 * Track trigger rate to determine audio mode.
 */
function updateTriggerRate(): void {
  const now = performance.now();
  triggerCount++;
  if (now - triggerWindowStart > 500) {
    currentTriggerRate = (triggerCount / (now - triggerWindowStart)) * 1000;
    triggerCount = 0;
    triggerWindowStart = now;
  }
}

/**
 * Play a resonance beep. Adapts based on speed:
 * - Normal (< 3x): Clean, short sine beep
 * - Fast (3x-6x): Shorter beep, reduced volume
 * - Very fast (> 6x): Sustained tone that fades, like a chord
 */
export function playResonanceBeep(
  color: string,
  volume: number = 0.15,
  speedMultiplier: number = 1.0,
): void {
  try {
    const ctx = getAudioContext();
    const master = getMasterGain();
    const now = ctx.currentTime;
    const freq = colorToFrequency(color);

    updateTriggerRate();

    // Very fast: sustained chord tone
    if (speedMultiplier > 6.0) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const gain = ctx.createGain();
      // Volume drops with speed — becomes ambient
      const chordVol = Math.max(0.01, volume * 0.3 / Math.sqrt(speedMultiplier / 6));
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(chordVol, now + 0.01);
      // Long sustain, gentle release
      gain.gain.setValueAtTime(chordVol, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.42);
      return;
    }

    // Fast: shorter beep, reduced volume
    if (speedMultiplier > 3.0) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const gain = ctx.createGain();
      const fastVol = volume * (3.0 / speedMultiplier);
      const duration = Math.max(0.03, 0.08 / (speedMultiplier / 3));
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(fastVol, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + duration + 0.01);
      return;
    }

    // Normal: clean, crisp sine beep
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch {
    // Silently fail if audio context is unavailable
  }
}

/**
 * Resume audio context (must be called from user gesture).
 */
export function resumeAudio(): void {
  getAudioContext();
}

/**
 * Stop all audio and reset.
 */
export function stopAllAudio(): void {
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
    masterGain = null;
  }
  triggerCount = 0;
  triggerWindowStart = 0;
  currentTriggerRate = 0;
}
