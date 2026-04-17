import { getFlowSoundPreset, type FlowCycleRole, type FlowSoundId } from './flowStudy';

interface FlowAudioGraph {
  context: AudioContext;
  master: GainNode;
  compressor: DynamicsCompressorNode;
  delay: DelayNode;
  delayFeedback: GainNode;
  delayReturn: GainNode;
  reverb: ConvolverNode;
  reverbReturn: GainNode;
}

export interface FlowSampleAsset {
  id: string;
  url: string;
  role?: FlowCycleRole;
  soundId?: FlowSoundId;
}

interface FlowImpactOptions {
  midi: number;
  velocity: number;
  role: FlowCycleRole;
  soundId: FlowSoundId;
  pan: number;
}

interface FlowPadOptions {
  soundId: FlowSoundId;
  enabled: boolean;
  intensity: number;
}

interface PadVoice {
  oscillator: OscillatorNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  panner?: StereoPannerNode;
}

let graph: FlowAudioGraph | null = null;
let activeVoices = 0;
let padVoices: PadVoice[] = [];
let currentPadKey: string | null = null;
const sampleBuffers = new Map<string, AudioBuffer>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

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

  if (!graph) {
    const context = new AudioContextCtor();
    graph = createGraph(context);
  }

  return graph.context;
}

function createImpulse(context: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      const decay = Math.pow(1 - t, 2.05);
      const shimmer = Math.sin(i * 0.017 + channel) * 0.18;
      data[i] = (Math.random() * 2 - 1 + shimmer) * decay * 0.34;
    }
  }
  return impulse;
}

function createGraph(context: AudioContext): FlowAudioGraph {
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const delay = context.createDelay(2.4);
  const delayFeedback = context.createGain();
  const delayReturn = context.createGain();
  const reverb = context.createConvolver();
  const reverbReturn = context.createGain();

  master.gain.value = 0.62;
  compressor.threshold.value = -22;
  compressor.knee.value = 24;
  compressor.ratio.value = 4.2;
  compressor.attack.value = 0.018;
  compressor.release.value = 0.28;
  delay.delayTime.value = 0.46;
  delayFeedback.gain.value = 0.34;
  delayReturn.gain.value = 0.34;
  reverb.buffer = createImpulse(context, 6.2);
  reverbReturn.gain.value = 0.52;

  master.connect(compressor);
  compressor.connect(context.destination);
  delay.connect(delayFeedback);
  delayFeedback.connect(delay);
  delay.connect(delayReturn);
  delayReturn.connect(compressor);
  reverb.connect(reverbReturn);
  reverbReturn.connect(compressor);

  return {
    context,
    master,
    compressor,
    delay,
    delayFeedback,
    delayReturn,
    reverb,
    reverbReturn,
  };
}

function ensureGraph(): FlowAudioGraph | null {
  getAudioContext();
  return graph;
}

function connectStereo(
  context: AudioContext,
  source: AudioNode,
  pan: number,
): AudioNode {
  if ('createStereoPanner' in context) {
    const panner = context.createStereoPanner();
    panner.pan.value = clamp(pan, -0.8, 0.8);
    source.connect(panner);
    return panner;
  }
  return source;
}

function getSampleKey(soundId: FlowSoundId, role: FlowCycleRole): string {
  return `${soundId}:${role}`;
}

function getBestSample(soundId: FlowSoundId, role: FlowCycleRole): AudioBuffer | null {
  return (
    sampleBuffers.get(getSampleKey(soundId, role)) ??
    sampleBuffers.get(getSampleKey(soundId, 'tone')) ??
    sampleBuffers.get(soundId) ??
    null
  );
}

function playSample(options: {
  buffer: AudioBuffer;
  gain: number;
  pan: number;
  playbackRate: number;
  delaySend: number;
  reverbSend: number;
}): boolean {
  const audio = ensureGraph();
  if (!audio) {
    return false;
  }

  const { context } = audio;
  const now = context.currentTime;
  const source = context.createBufferSource();
  const gainNode = context.createGain();
  const delaySend = context.createGain();
  const reverbSend = context.createGain();

  source.buffer = options.buffer;
  source.playbackRate.value = clamp(options.playbackRate, 0.5, 2.5);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, options.gain), now + 0.018);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(8, options.buffer.duration + 0.12));
  delaySend.gain.value = options.delaySend;
  reverbSend.gain.value = options.reverbSend;

  source.connect(gainNode);
  const stereoNode = connectStereo(context, gainNode, options.pan);
  stereoNode.connect(audio.master);
  stereoNode.connect(delaySend);
  stereoNode.connect(reverbSend);
  delaySend.connect(audio.delay);
  reverbSend.connect(audio.reverb);
  source.start(now);
  source.stop(now + Math.min(10, options.buffer.duration + 0.2));
  source.onended = () => {
    source.disconnect();
    gainNode.disconnect();
    delaySend.disconnect();
    reverbSend.disconnect();
  };
  return true;
}

function triggerNoiseTransient(options: {
  gain: number;
  release: number;
  filterFrequency: number;
  pan: number;
  reverbSend: number;
}) {
  const audio = ensureGraph();
  if (!audio) {
    return;
  }

  const { context } = audio;
  const now = context.currentTime;
  const length = Math.max(1, Math.floor(context.sampleRate * 0.08));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / length;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2);
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gainNode = context.createGain();
  const reverbSend = context.createGain();

  source.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.value = options.filterFrequency;
  filter.Q.value = 0.7;
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(options.gain, now + 0.003);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + options.release);
  reverbSend.gain.value = options.reverbSend;

  source.connect(filter);
  filter.connect(gainNode);
  const stereoNode = connectStereo(context, gainNode, options.pan);
  stereoNode.connect(audio.master);
  stereoNode.connect(reverbSend);
  reverbSend.connect(audio.reverb);
  source.start(now);
  source.stop(now + options.release + 0.04);
}

function triggerVoice(options: {
  frequency: number;
  gain: number;
  attack: number;
  release: number;
  oscillatorType: OscillatorType;
  filterFrequency: number;
  filterType?: BiquadFilterType;
  filterQ?: number;
  pan: number;
  delaySend: number;
  reverbSend: number;
}) {
  const audio = ensureGraph();
  if (!audio) {
    return;
  }
  const maxVoices = window.innerWidth < 720 ? 48 : 96;
  if (activeVoices >= maxVoices) {
    return;
  }

  const { context } = audio;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gainNode = context.createGain();
  const delaySend = context.createGain();
  const reverbSend = context.createGain();
  const detuneCents = Math.random() * 4 - 2;

  oscillator.type = options.oscillatorType;
  oscillator.frequency.setValueAtTime(options.frequency, now);
  oscillator.detune.setValueAtTime(detuneCents, now);
  filter.type = options.filterType ?? 'lowpass';
  filter.frequency.setValueAtTime(options.filterFrequency, now);
  filter.Q.setValueAtTime(options.filterQ ?? 0.72, now);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, options.gain), now + options.attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + options.release);
  delaySend.gain.value = options.delaySend;
  reverbSend.gain.value = options.reverbSend;

  oscillator.connect(filter);
  filter.connect(gainNode);
  const stereoNode = connectStereo(context, gainNode, options.pan);
  stereoNode.connect(audio.master);
  stereoNode.connect(delaySend);
  stereoNode.connect(reverbSend);
  delaySend.connect(audio.delay);
  reverbSend.connect(audio.reverb);

  activeVoices += 1;
  oscillator.start(now);
  oscillator.stop(now + options.release + 0.08);
  oscillator.onended = () => {
    activeVoices = Math.max(0, activeVoices - 1);
    oscillator.disconnect();
    filter.disconnect();
    gainNode.disconnect();
    delaySend.disconnect();
    reverbSend.disconnect();
  };
}

export function resumeFlowAudio(): void {
  const context = getAudioContext();
  if (context && context.state === 'suspended') {
    void context.resume().catch(() => {});
  }
}

export function stopFlowAudio(): void {
  const audio = graph;
  if (!audio) {
    return;
  }
  const now = audio.context.currentTime;
  fadePad(false, 0);
  audio.master.gain.cancelScheduledValues(now);
  audio.master.gain.setTargetAtTime(0.0001, now, 0.025);
  window.setTimeout(() => {
    if (!graph) {
      return;
    }
    graph.master.gain.setValueAtTime(0.62, graph.context.currentTime);
  }, 140);
}

function stopPadVoices() {
  const audio = graph;
  if (!audio) {
    padVoices = [];
    currentPadKey = null;
    return;
  }
  const now = audio.context.currentTime;
  padVoices.forEach((voice) => {
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0.0001, now, 0.08);
    window.setTimeout(() => {
      try {
        voice.oscillator.stop();
        voice.oscillator.disconnect();
        voice.filter.disconnect();
        voice.gain.disconnect();
        voice.panner?.disconnect();
      } catch {
        // Stopping an already-stopped oscillator is harmless.
      }
    }, 260);
  });
  padVoices = [];
  currentPadKey = null;
}

function fadePad(enabled: boolean, targetGain: number) {
  const audio = graph;
  if (!audio) {
    return;
  }
  const now = audio.context.currentTime;
  padVoices.forEach((voice, index) => {
    const voiceGain = enabled ? targetGain * (index === 0 ? 1 : 0.58) : 0.0001;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(Math.max(0.0001, voiceGain), now, enabled ? 0.6 : 0.12);
  });
}

export function updateFlowPad(options: FlowPadOptions): void {
  if (!options.enabled && !graph) {
    return;
  }

  const audio = ensureGraph();
  if (!audio) {
    return;
  }

  const preset = getFlowSoundPreset(options.soundId);
  const padKey = `${options.soundId}:${preset.keyCenter}:${preset.noteSet.join('.')}`;
  const now = audio.context.currentTime;
  const targetGain = clamp(preset.padMix * 0.04 * options.intensity, 0.004, 0.035);

  if (!options.enabled) {
    fadePad(false, 0);
    return;
  }

  if (currentPadKey !== padKey || padVoices.length === 0) {
    stopPadVoices();
    currentPadKey = padKey;
    const padOffsets = [
      preset.noteSet[0] ?? 0,
      preset.noteSet[2] ?? 7,
      preset.noteSet[4] ?? 12,
    ];
    padVoices = padOffsets.map((offset, index) => {
      const oscillator = audio.context.createOscillator();
      const filter = audio.context.createBiquadFilter();
      const gain = audio.context.createGain();
      const panner =
        'createStereoPanner' in audio.context
          ? audio.context.createStereoPanner()
          : undefined;
      oscillator.type = index === 0 ? 'sine' : index === 1 ? 'triangle' : 'sawtooth';
      oscillator.frequency.setValueAtTime(
        midiToFrequency(preset.keyCenter - 24 + offset + index * 0.04),
        now,
      );
      oscillator.detune.value = index === 0 ? -4 : index === 1 ? 3 : 7;
      filter.type = 'lowpass';
      filter.frequency.value = clamp(preset.filter * 0.42, 520, 2600);
      filter.Q.value = 0.42;
      gain.gain.value = 0.0001;
      oscillator.connect(filter);
      filter.connect(gain);
      if (panner) {
        panner.pan.value = index === 0 ? 0 : index === 1 ? -0.36 : 0.38;
        gain.connect(panner);
        panner.connect(audio.master);
        panner.connect(audio.reverb);
      } else {
        gain.connect(audio.master);
        gain.connect(audio.reverb);
      }
      oscillator.start(now);
      return { oscillator, gain, filter, panner };
    });
  }

  padVoices.forEach((voice, index) => {
    const offset = preset.noteSet[index * 2] ?? 0;
    voice.oscillator.frequency.setTargetAtTime(
      midiToFrequency(preset.keyCenter - 24 + offset),
      now,
      0.8,
    );
    voice.filter.frequency.setTargetAtTime(clamp(preset.filter * 0.42, 520, 2600), now, 0.9);
  });
  fadePad(true, targetGain);
}

export async function loadFlowSamplePack(assets: FlowSampleAsset[]): Promise<void> {
  const audio = ensureGraph();
  if (!audio) {
    return;
  }

  await Promise.all(
    assets.map(async (asset) => {
      const response = await fetch(asset.url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await audio.context.decodeAudioData(arrayBuffer);
      sampleBuffers.set(asset.id, buffer);
      if (asset.soundId && asset.role) {
        sampleBuffers.set(getSampleKey(asset.soundId, asset.role), buffer);
      } else if (asset.soundId) {
        sampleBuffers.set(asset.soundId, buffer);
      }
    }),
  );
}

export function triggerFlowImpact(options: FlowImpactOptions): void {
  const preset = getFlowSoundPreset(options.soundId);
  const velocity = clamp(options.velocity, 0, 1);
  if (velocity <= 0) {
    return;
  }

  const baseFrequency = midiToFrequency(options.midi);
  const sample = getBestSample(options.soundId, options.role);
  const roleGain =
    options.role === 'bass'
      ? 0.095
      : options.role === 'spark'
        ? 0.038
        : options.role === 'ghost'
          ? 0.02
          : 0.062;
  const gain = clamp(roleGain * (0.62 + velocity * 0.56), 0.006, 0.14);
  const releaseBase =
    options.role === 'bass'
      ? 1.1
      : options.role === 'spark'
        ? 0.8
        : options.role === 'ghost'
          ? 1.2
          : 0.94;

  if (sample) {
    playSample({
      buffer: sample,
      gain: gain * (options.role === 'bass' ? 1.15 : 0.9),
      pan: options.pan,
      playbackRate: Math.pow(2, (options.midi - preset.keyCenter) / 12),
      delaySend: preset.delay * 0.3,
      reverbSend: preset.reverb * 0.52,
    });
    return;
  }

  if (options.role === 'bass') {
    triggerVoice({
      frequency: clamp(baseFrequency * 0.5, 38, 180),
      gain: clamp(gain * 1.28, 0.018, 0.13),
      attack: 0.028,
      release: releaseBase * 1.25,
      oscillatorType: 'sine',
      filterFrequency: Math.min(900, preset.filter * 0.42),
      pan: 0,
      delaySend: preset.delay * 0.08,
      reverbSend: preset.reverb * 0.24,
    });
  }

  if (options.soundId === 'rain') {
    triggerVoice({
      frequency: baseFrequency * 1.6,
      gain: gain * 0.62,
      attack: 0.012,
      release: releaseBase * 1.15,
      oscillatorType: 'triangle',
      filterFrequency: preset.filter,
      filterType: 'highpass',
      filterQ: 0.9,
      pan: options.pan,
      delaySend: preset.delay * 0.48,
      reverbSend: preset.reverb * 0.68,
    });
    triggerNoiseTransient({
      gain: gain * 0.1,
      release: 0.18,
      filterFrequency: 4800,
      pan: options.pan,
      reverbSend: preset.reverb * 0.16,
    });
    return;
  }

  if (options.soundId === 'deep') {
    triggerVoice({
      frequency: baseFrequency,
      gain: gain * 0.9,
      attack: 0.022,
      release: releaseBase * 1.08,
      oscillatorType: 'triangle',
      filterFrequency: preset.filter,
      pan: options.pan * 0.65,
      delaySend: preset.delay * 0.28,
      reverbSend: preset.reverb * 0.44,
    });
    return;
  }

  if (options.soundId === 'shimmer') {
    triggerVoice({
      frequency: baseFrequency * 1.01,
      gain: gain * 0.68,
      attack: 0.026,
      release: releaseBase * 1.8,
      oscillatorType: 'sine',
      filterFrequency: preset.filter,
      pan: options.pan,
      delaySend: preset.delay * 0.56,
      reverbSend: preset.reverb * 0.74,
    });
    triggerVoice({
      frequency: baseFrequency * 2.005,
      gain: gain * 0.18,
      attack: 0.04,
      release: releaseBase * 2,
      oscillatorType: 'triangle',
      filterFrequency: preset.filter * 1.15,
      filterType: 'highpass',
      filterQ: 0.6,
      pan: -options.pan * 0.7,
      delaySend: preset.delay * 0.5,
      reverbSend: preset.reverb * 0.78,
    });
    return;
  }

  triggerVoice({
    frequency: options.soundId === 'warm' ? baseFrequency * 0.98 : baseFrequency * 1.02,
    gain: options.soundId === 'glass' ? gain * 0.82 : gain,
    attack: options.soundId === 'glass' ? 0.014 : 0.022,
    release: options.soundId === 'glass' ? releaseBase * 1.7 : releaseBase * 1.18,
    oscillatorType: options.soundId === 'glass' ? 'triangle' : 'sine',
    filterFrequency: preset.filter,
    filterType: options.soundId === 'glass' ? 'highpass' : 'lowpass',
    filterQ: options.soundId === 'glass' ? 0.82 : 0.58,
    pan: options.pan,
    delaySend: preset.delay * 0.46,
    reverbSend: preset.reverb * 0.66,
  });
  if (options.soundId === 'glass') {
    triggerVoice({
      frequency: baseFrequency * 2.01,
      gain: gain * 0.16,
      attack: 0.018,
      release: releaseBase * 2.1,
      oscillatorType: 'sine',
      filterFrequency: preset.filter * 1.2,
      filterType: 'highpass',
      filterQ: 0.5,
      pan: -options.pan * 0.5,
      delaySend: preset.delay * 0.5,
      reverbSend: preset.reverb * 0.74,
    });
  }
}
