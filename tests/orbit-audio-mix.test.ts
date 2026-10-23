import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOrbit, DEFAULT_ORBITS } from '../src/lib/orbitalEngine';
import { prepareOrbitInstrument, type OrbitDesignedInstrument } from '../src/lib/orbitInstruments';
import { playResonanceBeep, updateOrbitAudioMix, createOrbitExportAudioStream, DEFAULT_HARMONY_SETTINGS, type OrbitSoundPalette, normalizeOrbitSoundPalette, resumeAudio, stopAllAudio, voiceToFrequency } from '../src/lib/audioEngine';

class Param {
  value = 1;
  setValueAtTime(v: number) { this.value = v; }
  setTargetAtTime(v: number) { this.value = v; }
  linearRampToValueAtTime(v: number) { this.value = v; }
  exponentialRampToValueAtTime(v: number) { this.value = v; }
}
class Node {
  connections: Node[] = [];
  gain = new Param(); frequency = new Param(); detune = new Param(); playbackRate = new Param();
  onended?: () => void;
  threshold = new Param(); knee = new Param(); ratio = new Param(); attack = new Param(); release = new Param();
  stream = {}; buffer: unknown; type = '';
  connect(n: Node) { this.connections.push(n); return n; }
  startedAt = 0;
  start(atTime = 0) { this.startedAt = atTime; } stop() {} disconnect() {}
}
class Context {
  static current: Context;
  state = 'running'; currentTime = 0; sampleRate = 1000;
  destination = new Node(); oscillators: Node[] = []; convolvers: Node[] = []; sources: Node[] = [];
  constructor() { Context.current = this; }
  createBufferSource() { const n = new Node(); this.sources.push(n); return n; }
  createGain() { return new Node(); }
  createDynamicsCompressor() { return new Node(); }
  createOscillator() { const n = new Node(); this.oscillators.push(n); return n; }
  createConvolver() { const n = new Node(); this.convolvers.push(n); return n; }
  createBuffer(_channels: number, length: number, sampleRate = this.sampleRate) { return { length, sampleRate, getChannelData: () => new Float32Array(length) }; }
  createMediaStreamDestination() { return new Node(); }
  resume() { return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

test('layer mix isolates levels, applies live updates, and respects mute in exports', () => {
  const originalContext = globalThis.AudioContext;
  Object.assign(globalThis, { AudioContext: Context });
  try {
    const a = createOrbit({ ...DEFAULT_ORBITS[0], volume: 0.4, reverbAmount: 0.5 });
    const b = createOrbit({ ...DEFAULT_ORBITS[1], volume: 0.8 });
    playResonanceBeep({ ...a, orbitIndex: 0 }, { ...DEFAULT_HARMONY_SETTINGS, reverbAmount: 0.5 });
    playResonanceBeep({ ...b, orbitIndex: 1 }, { ...DEFAULT_HARMONY_SETTINGS, reverbAmount: 0.5 });
    const ctx = Context.current;
    assert.equal(ctx.oscillators.length, 2);
    const firstBus = ctx.oscillators[0].connections[0].connections[0];
    const secondBus = ctx.oscillators[1].connections[0].connections[0];
    assert.notEqual(firstBus, secondBus);
    assert.equal(firstBus.gain.value, 0.4);
    assert.equal(secondBus.gain.value, 0.8);
    assert.equal(firstBus.connections[1].gain.value, 0.325);
    assert.equal(secondBus.connections[1].gain.value, 0.325);
    updateOrbitAudioMix([{ ...a, volume: 0.2 }, { ...b, soundEnabled: false }], 0.7);
    assert.equal(firstBus.connections[1].gain.value, 0.7 * 0.65);
    assert.equal(secondBus.connections[1].gain.value, 0.7 * 0.65);
    assert.equal(firstBus.gain.value, 0.2);
    assert.equal(secondBus.gain.value, 0);
    playResonanceBeep({ ...b, orbitIndex: 1, soundEnabled: false });
    assert.equal(ctx.oscillators.length, 2);
    createOrbitExportAudioStream({ orbits: [a, { ...b, soundEnabled: false }], playing: false, speedMultiplier: 1, elapsedBeats: 0, lastTimestamp: 0, baseBPM: 120 }, { ...DEFAULT_HARMONY_SETTINGS, reverbAmount: 0.5 }, 0.5);
    assert.equal(ctx.oscillators.length, 3);
    const exportBus = ctx.oscillators[2].connections[0].connections[0];
    assert.notEqual(exportBus, firstBus);
    assert.equal(exportBus.gain.value, 0.4);
    assert.equal(exportBus.connections[1].gain.value, 0.325);
    assert.equal(ctx.convolvers.length, 2);
    const before = ctx.oscillators.length;
    createOrbitExportAudioStream({ orbits: [a], playing: false, speedMultiplier: 1, elapsedBeats: 0, lastTimestamp: 0, baseBPM: 120 }, { ...DEFAULT_HARMONY_SETTINGS, soundPalette: 'soft-pad' }, 0.5);
    assert.equal(ctx.oscillators.length, before + 2);
    assert.deepEqual(ctx.oscillators.slice(before).map((node) => node.type), ['sine', 'triangle']);
    const restored = createOrbit(JSON.parse(JSON.stringify(a)));
    assert.equal(restored.volume, 0.4);
    assert.equal(restored.reverbAmount, 0.5);
  } finally {
    Context.current.state = 'closed';
    Object.assign(globalThis, { AudioContext: originalContext });
  }
});


test('high-ratio Sweep export schedules selected voices through the full clip in bounded windows', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const originalContext = globalThis.AudioContext;
  Object.assign(globalThis, { AudioContext: Context });
  try {
    const orbits = [97, 101, 127].map((pulseCount, index) => ({ ...createOrbit({ ...DEFAULT_ORBITS[index], pulseCount }), id: `o${index}` }));
    createOrbitExportAudioStream({ orbits, playing: false, speedMultiplier: 50, elapsedBeats: 0, lastTimestamp: -1, baseBPM: 120 }, DEFAULT_HARMONY_SETTINGS, 4, 0, undefined, { geometryMode: 'sweep', interferenceSettings: { sourceOrbitAId: 'o0', sourceOrbitBId: 'o1' } });
    const ctx = Context.current;
    assert.ok(ctx.oscillators.length > 2, 'Sweep cannot be reduced to just the initial notes');
    assert.ok(ctx.oscillators.length < 100, 'do not allocate the whole dense clip up front');
    for (let step = 1; step <= 42; step++) {
      ctx.currentTime = step / 10;
      t.mock.timers.tick(100);
    }
    const latest = Math.max(...ctx.oscillators.map((node) => node.startedAt));
    assert.ok(latest > 3.5 && latest <= 4.121, 'notes continue through the end of the export');
    assert.equal(ctx.convolvers.length, 0, 'zero reverb allocates no convolver');
  } finally {
    Context.current.state = 'closed';
    Object.assign(globalThis, { AudioContext: originalContext });
  }
});


test('new Orbit instruments keep export voices active in every drawing mode with protected output', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const originalContext = globalThis.AudioContext;
  Object.assign(globalThis, { AudioContext: Context });
  try {
    const orbits = [97, 101].map((pulseCount, index) => ({ ...createOrbit({ ...DEFAULT_ORBITS[index], pulseCount }), id: `new-${index}` }));
    for (const soundPalette of ['orbit-keys', 'velvet-pluck', 'halo-synth', 'round-bass', 'astral-veil', 'lunar-silk', 'prism-tide'] as const) {
      for (const geometryMode of ['standard-trace', 'interference-trace', 'sweep'] as const) {
        if (Context.current) Context.current.state = 'closed';
        createOrbitExportAudioStream({ orbits, playing: false, speedMultiplier: 50, elapsedBeats: 0, lastTimestamp: -1, baseBPM: 120 },
          { ...DEFAULT_HARMONY_SETTINGS, soundPalette }, 4, 0, undefined, { geometryMode, interferenceSettings: { sourceOrbitAId: 'new-0', sourceOrbitBId: 'new-1' } });
        const ctx = Context.current;
        assert.ok(ctx.sources.length >= 2, `${soundPalette} is scheduled in ${geometryMode}`);
        const layer = ctx.sources[0].connections[0].connections[0];
        const master = layer.connections[0];
        assert.equal(master.gain.value, 0.5, 'export uses live master headroom');
        assert.equal(master.connections[0].threshold.value, -20, 'export has the same limiter');
        for (let step = 1; step <= 42; step++) { ctx.currentTime = step / 10; t.mock.timers.tick(100); }
        assert.ok(Math.max(...ctx.sources.map(n => n.startedAt)) > 3.5, 'notes continue to the end');
        assert.equal(ctx.oscillators.length, 0, 'high ratios reuse buffered voices');
      }
    }
  } finally { Context.current.state = 'closed'; Object.assign(globalThis, { AudioContext: originalContext }); }
});

test('older scenes with retired sounds use sampled replacements in playback and protected exports', () => {
  const originalContext = globalThis.AudioContext;
  Object.assign(globalThis, { AudioContext: Context });
  try {
    const orbit = createOrbit(DEFAULT_ORBITS[0]);
    for (const retired of ['warm-pad', 'pluck']) {
      stopAllAudio();
      const harmony = { ...DEFAULT_HARMONY_SETTINGS, soundPalette: retired as OrbitSoundPalette };
      resumeAudio();
      prepareOrbitInstrument(Context.current as unknown as AudioContext, normalizeOrbitSoundPalette(retired) as OrbitDesignedInstrument, voiceToFrequency({ ...orbit, orbitIndex: 0 }, harmony), 1);
      playResonanceBeep({ ...orbit, orbitIndex: 0 }, harmony);
      const ctx = Context.current;
      assert.equal(ctx.sources.length, 2, 'live playback resolves the retired sound');
      createOrbitExportAudioStream({ orbits: [orbit], playing: false, speedMultiplier: 1, elapsedBeats: 0, lastTimestamp: -1, baseBPM: 120 }, harmony, 0.1);
      assert.equal(ctx.sources.length, 4, 'the exported note uses the same sampled replacement');
      const master = ctx.sources[2].connections[0].connections[0].connections[0];
      assert.equal(master.gain.value, 0.5);
      assert.equal(master.connections[0].threshold.value, -20);
      assert.equal(ctx.oscillators.length, 0, 'removed oscillator patches cannot play');
    }
  } finally { Context.current.state = 'closed'; Object.assign(globalThis, { AudioContext: originalContext }); }
});
