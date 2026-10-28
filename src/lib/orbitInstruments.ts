import { renderOrbitInstrumentLayers, type OrbitDesignedInstrument } from './orbitInstrumentSamples';
export { ORBIT_DESIGNED_INSTRUMENTS, isOrbitDesignedInstrument, renderOrbitInstrument, renderOrbitInstrumentLayers, getOrbitInstrumentDuration } from './orbitInstrumentSamples';
export type { OrbitDesignedInstrument } from './orbitInstrumentSamples';

const TAU = Math.PI * 2;
// The voices are intentionally dark (their upper layer rolls off below 2 kHz).
// 16 kHz samples retain that sound while avoiding full device-rate PCM storage.
export const ORBIT_SAMPLE_RATE = 16000;
export const ORBIT_SAMPLE_CACHE_BYTES = 6 * 1024 * 1024;
export const ORBIT_MAX_VOICES = 20;
const MAX_PENDING_SAMPLES = 8;
type SamplePair = { buffer: AudioBuffer; quadratureBuffer: AudioBuffer; bytes: number; root: number; instrument: OrbitDesignedInstrument; band: number };
type SampleCache = { samples: Map<string, SamplePair>; bytes: number };
const caches = new WeakMap<BaseAudioContext, SampleCache>();
type SampleRequest = { id: number; context: BaseAudioContext; key: string; instrument: OrbitDesignedInstrument; root: number; band: number; speed: number; sampleRate: number };
const pending = new Map<number, SampleRequest>();
let worker: Worker | null = null;
let workerFailed = false;
let nextRequest = 0;
let idleWorkerTimer: ReturnType<typeof setTimeout> | undefined;

function cacheFor(context: BaseAudioContext): SampleCache {
  let cache = caches.get(context);
  if (!cache) { cache = { samples: new Map(), bytes: 0 }; caches.set(context, cache); }
  return cache;
}
function sampleDetails(context: BaseAudioContext, instrument: OrbitDesignedInstrument, frequency: number, speed: number) {
  const midi = Math.min(108, Math.max(24, Math.round((69 + 12 * Math.log2(frequency / 440)) / 3) * 3));
  const root = 440 * 2 ** ((midi - 69) / 12);
  const band = speed >= 7 ? 2 : speed >= 3 ? 1 : 0;
  return { root, band, key: `${instrument}:${midi}:${band}`, sampleRate: Math.min(context.sampleRate, ORBIT_SAMPLE_RATE) };
}
function getCached(cache: SampleCache, key: string): SamplePair | undefined {
  const sample = cache.samples.get(key);
  if (sample) { cache.samples.delete(key); cache.samples.set(key, sample); }
  return sample;
}
function storeSample(request: Omit<SampleRequest, 'id' | 'speed'>, channels: Float32Array[]): SamplePair {
  const { context, key, instrument, root, band, sampleRate } = request;
  const buffer = context.createBuffer(4, channels[0].length, sampleRate);
  const quadratureBuffer = context.createBuffer(4, channels[4].length, sampleRate);
  for (let channel = 0; channel < 4; channel++) {
    buffer.getChannelData(channel).set(channels[channel]);
    quadratureBuffer.getChannelData(channel).set(channels[channel + 4]);
  }
  const sample = { buffer, quadratureBuffer, bytes: channels.reduce((sum, data) => sum + data.byteLength, 0), root, instrument, band };
  const cache = cacheFor(context);
  const previous = cache.samples.get(key);
  if (previous) { cache.bytes -= previous.bytes; cache.samples.delete(key); }
  while (cache.samples.size && cache.bytes + sample.bytes > ORBIT_SAMPLE_CACHE_BYTES) {
    const oldestKey = cache.samples.keys().next().value!;
    cache.bytes -= cache.samples.get(oldestKey)!.bytes;
    cache.samples.delete(oldestKey);
  }
  cache.samples.set(key, sample); cache.bytes += sample.bytes;
  return sample;
}
function getWorker(): Worker | null {
  clearTimeout(idleWorkerTimer);
  if (worker || workerFailed || typeof Worker === 'undefined') return worker;
  try {
    worker = new Worker(new URL('./orbitInstrumentWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ id: number; channels?: Float32Array[] }>) => {
      const request = pending.get(event.data.id);
      if (!request) return;
      pending.delete(request.id);
      if (event.data.channels && request.context.state !== 'closed') storeSample(request, event.data.channels);
      if (!pending.size) idleWorkerTimer = setTimeout(() => { worker?.terminate(); worker = null; }, 2000);
    };
    worker.onerror = () => {
      clearTimeout(idleWorkerTimer); worker?.terminate(); worker = null; workerFailed = true;
      for (const request of pending.values()) renderWithoutWorker(request);
    };
  } catch { workerFailed = true; worker = null; }
  return worker;
}

// Older/blocked-worker browsers still prepare the full patch before playback.
// Keep that work out of the canvas callback, and discard cancelled requests.
function renderWithoutWorker(request: SampleRequest): void {
  setTimeout(() => {
    if (!pending.has(request.id)) return;
    pending.delete(request.id);
    if (request.context.state === 'closed') return;
    const first = renderOrbitInstrumentLayers(request.instrument, request.root, request.sampleRate, request.speed);
    const second = renderOrbitInstrumentLayers(request.instrument, request.root, request.sampleRate, request.speed, Math.PI / 2);
    storeSample(request, [...first, ...second]);
  }, 0);
}

/** Queues preparation for live notes. Never performs synthesis in the caller. */
export function requestOrbitInstrument(context: BaseAudioContext, instrument: OrbitDesignedInstrument, frequency: number, speed: number): void {
  const details = sampleDetails(context, instrument, frequency, speed);
  if (cacheFor(context).samples.has(details.key)) return;
  if (pending.size >= MAX_PENDING_SAMPLES) return;
  for (const job of pending.values()) if (job.context === context && job.key === details.key) return;
  const renderer = getWorker();
  const request = { ...details, context, instrument, speed, id: ++nextRequest };
  pending.set(request.id, request);
  if (renderer) renderer.postMessage({ id: request.id, instrument, frequency: details.root, sampleRate: details.sampleRate, speed });
  else renderWithoutWorker(request);
}

/** A full multisample can cover nearby pitches while their exact roots load. */
export function isOrbitInstrumentReady(context: BaseAudioContext, instrument: OrbitDesignedInstrument): boolean {
  return [...cacheFor(context).samples.values()].some(sample => sample.instrument === instrument);
}

/** Export preparation runs before its start clock; live notes never call it. */
export function prepareOrbitInstrument(context: BaseAudioContext, instrument: OrbitDesignedInstrument, frequency: number, speed: number) {
  const details = sampleDetails(context, instrument, frequency, speed);
  let sample = getCached(cacheFor(context), details.key);
  if (!sample) {
    const first = renderOrbitInstrumentLayers(instrument, details.root, details.sampleRate, speed);
    const second = renderOrbitInstrumentLayers(instrument, details.root, details.sampleRate, speed, Math.PI / 2);
    sample = storeSample({ ...details, context, instrument }, [...first, ...second]);
  }
  return { buffer: sample.buffer, quadratureBuffer: sample.quadratureBuffer, playbackRate: frequency / sample.root };
}

export function releaseOrbitInstrumentContext(context: BaseAudioContext): void {
  caches.delete(context);
  voices.delete(context);
  for (const [id, job] of pending) if (job.context === context) pending.delete(id);
  if (!pending.size) { clearTimeout(idleWorkerTimer); worker?.terminate(); worker = null; workerFailed = false; }
}

type ActiveVoice = { end: number; release: () => void };
const voices = new WeakMap<BaseAudioContext, ActiveVoice[]>();
function registerVoice(context: BaseAudioContext, voice: ActiveVoice): () => void {
  const active = voices.get(context) ?? [];
  for (let i = active.length - 1; i >= 0; i--) if (active[i].end <= context.currentTime) active.splice(i, 1);
  while (active.length >= ORBIT_MAX_VOICES) active.shift()!.release();
  active.push(voice); voices.set(context, active);
  return () => { const index = active.indexOf(voice); if (index >= 0) active.splice(index, 1); };
}

// Safety voice for direct callers that bypass preparation. The Orbit canvas
// waits for the full patch before advancing, so its first impact never uses it.
function scheduleImmediateCore(context: AudioContext, destination: AudioNode, instrument: OrbitDesignedInstrument, frequency: number, volume: number, at: number, speed: number): void {
  const fundamental = frequency * 0.25;
  const duration = speed >= 7 ? 0.2 : 0.6;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume * 1.3, at + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  gain.gain.linearRampToValueAtTime(0, at + duration + 0.015);
  gain.connect(destination);
  const oscillators = [-3, 3].map(detune => {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(fundamental, at); oscillator.detune.value = detune;
    oscillator.connect(gain); return oscillator;
  });
  let ended = 0;
  const remove = registerVoice(context, { end: at + duration + 0.02, release: () => {
    gain.gain.setTargetAtTime(0, context.currentTime, 0.003);
    oscillators.forEach(source => source.stop(context.currentTime + 0.015));
  } });
  oscillators.forEach(source => {
    source.onended = () => { source.disconnect(); if (++ended === 2) { gain.disconnect(); remove(); } };
    source.start(at); source.stop(at + duration + 0.02);
  });
}

export function scheduleDesignedOrbitInstrument(
  context: AudioContext, destination: AudioNode, instrument: OrbitDesignedInstrument,
  frequency: number, volume: number, atTime: number, speed: number, variation = 0, realtime = false,
): void {
  if (!Number.isFinite(volume) || volume <= 0) return;
  let sample: ReturnType<typeof prepareOrbitInstrument> | undefined;
  if (realtime) {
    const details = sampleDetails(context, instrument, frequency, speed);
    const cache = cacheFor(context);
    const ready = getCached(cache, details.key);
    if (ready) sample = { ...ready, playbackRate: frequency / ready.root };
    else {
      requestOrbitInstrument(context, instrument, frequency, speed);
      // A nearby prepared note keeps the same character while a new pitch or
      // speed band is prepared. Playback rate still preserves exact tuning.
      let nearby: SamplePair | undefined, closest = Infinity;
      for (const candidate of cache.samples.values()) {
        if (candidate.instrument !== instrument) continue;
        const distance = Math.abs(Math.log2(candidate.root / frequency)) + (candidate.band === details.band ? 0 : 2);
        if (distance < closest) { nearby = candidate; closest = distance; }
      }
      if (nearby) sample = { ...nearby, playbackRate: frequency / nearby.root };
    }
  } else sample = prepareOrbitInstrument(context, instrument, frequency, speed);
  const at = Math.max(atTime, context.currentTime + 0.008);
  if (!sample) { scheduleImmediateCore(context, destination, instrument, frequency, volume, at, speed); return; }
  const level = 2.6;
  const densityMakeup = Math.min(3, Math.sqrt(Math.max(1, (Number.isFinite(speed) ? speed : 1) / 3)));
  let hash = Math.imul((variation | 0) + 1, 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  const phase = ((hash ^ (hash >>> 16)) >>> 0) / 0x100000000 * TAU;
  const sources: AudioBufferSourceNode[] = [], gains: GainNode[] = [];
  const end = at + sample.buffer.length / sample.buffer.sampleRate / sample.playbackRate;
  // Exports schedule a future window in advance. Counting those future notes
  // as live overlap would stop them before their start time.
  const remove = realtime ? registerVoice(context, { end, release: () => {
    gains.forEach(gain => gain.gain.setTargetAtTime(0, context.currentTime, 0.003));
    sources.forEach(source => source.stop(context.currentTime + 0.015));
  } }) : () => {};
  let ended = 0;
  for (const [buffer, weight] of [[sample.buffer, Math.cos(phase)], [sample.quadratureBuffer, Math.sin(phase)]] as const) {
    const source = context.createBufferSource();
    const gain = context.createGain();
    sources.push(source); gains.push(gain);
    source.buffer = buffer; source.playbackRate.value = sample.playbackRate;
    gain.gain.value = volume * level * densityMakeup * weight;
    source.connect(gain); gain.connect(destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); if (++ended === 2) remove(); };
    source.start(at);
  }
}

export function getOrbitInstrumentResources(context: BaseAudioContext) {
  const cache = cacheFor(context);
  return { cacheBytes: cache.bytes, cachedNotes: cache.samples.size,
    pendingNotes: [...pending.values()].filter(job => job.context === context).length,
    activeVoices: (voices.get(context) ?? []).filter(voice => voice.end > context.currentTime).length };
}
