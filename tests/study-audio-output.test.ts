import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPolyrhythmEnvelope, getPolyrhythmOutputBus, getPolyrhythmAudioRecordingStream, triggerPolyrhythmPulse, createPolyrhythmExportAudioStream, silencePolyrhythmAudio } from '../src/lib/polyrhythmAudio';
import { createPolyrhythmSoundSettings, POLYRHYTHM_PRESETS, cloneStudy } from '../src/lib/polyrhythmStudy';

class Param {
  value = 1;
  curve?: Float32Array;
  setValueAtTime(value: number) { this.value = value; }
  setValueCurveAtTime(curve: Float32Array) { this.curve = curve; }
  cancelAndHoldAtTime() {}
  linearRampToValueAtTime(value: number) { this.value = value; }
}
class Node {
  connections: Node[] = [];
  disconnected = false;
  gain = new Param(); frequency = new Param(); Q = new Param();
  threshold = new Param(); knee = new Param(); ratio = new Param(); attack = new Param(); release = new Param();
  ended?: () => void;
  connect(node: Node) { this.connections.push(node); return node; }
  disconnect() { this.disconnected = true; }
  start() {}
  stop() {}
  addEventListener(_event: string, listener: () => void) { this.ended = listener; }
}
class Context {
  static latest: Context;
  currentTime = 1; sampleRate = 48000; state = 'running';
  destination = new Node(); oscillators: Node[] = []; convolvers: Node[] = [];
  constructor() { Context.latest = this; }
  createGain() { return new Node(); }
  createBiquadFilter() { return new Node(); }
  createDynamicsCompressor() { return new Node(); }
  createConvolver() { const node = new Node(); this.convolvers.push(node); return node; }
  createOscillator() { const node = new Node(); this.oscillators.push(node); return node; }
  createBuffer(channels: number, length: number) { return { numberOfChannels: channels, getChannelData: () => new Float32Array(length) }; }
  createMediaStreamDestination() { return Object.assign(new Node(), { stream: { id: 'recording' } }); }
}

test('Study attacks start smoothly at silence and end exactly at zero', () => {
  const shape = createPolyrhythmEnvelope(0.18, 0.02, 0.28);
  assert.equal(shape[0], 0);
  assert.equal(shape.at(-1), 0);
  assert.ok(shape.every((sample) => sample >= 0 && sample <= 0.18));
  assert.ok(shape[1] < 0.0001, 'no instantaneous jump at note onset');
  assert.ok(Math.max(...shape) > 0.17, 'the attack still reaches useful volume');
});

test('Study reuses its reverb bus, cleans up ended voices, and records the same final mix', () => {
  const originalWindow = globalThis.window;
  Object.assign(globalThis, { window: { AudioContext: Context } });
  try {
    const sound = createPolyrhythmSoundSettings({ palette: 'soft-synth', reverbAmount: 0.8 });
    getPolyrhythmAudioRecordingStream();
    const ctx = Context.latest;
    const options = { frequency: 220, gain: 0.13, sound, layerIndex: 0, beatCount: 5, accented: true };
    for (let i = 0; i < 32; i++) triggerPolyrhythmPulse(options);
    assert.equal(ctx.convolvers.length, 1, 'all notes share one convolution processor');
    const voice = ctx.oscillators[0];
    const filter = voice.connections[0];
    const envelope = filter.connections[0];
    assert.ok(envelope.gain.curve);
    const bus = getPolyrhythmOutputBus(ctx as unknown as AudioContext, ctx.destination as unknown as AudioNode);
    assert.equal(envelope.connections[0], bus.input);
    assert.equal((bus.output as unknown as Node).connections.length, 2, 'speakers and recording tap the same post-limiter output');
    ctx.oscillators.forEach((node) => node.ended?.());
    assert.ok(voice.disconnected && filter.disconnected && envelope.disconnected);
    assert.ok(envelope.connections[1].disconnected, 'per-note reverb sends are cleaned up');
    const before = ctx.oscillators.length;
    triggerPolyrhythmPulse({ ...options, gain: 0 });
    assert.equal(ctx.oscillators.length, before, 'zero level remains silent');
    const study = cloneStudy(POLYRHYTHM_PRESETS.find((preset) => preset.id === 'three-five')!.study);
    study.soundSettings = sound;
    createPolyrhythmExportAudioStream(study, 2);
    assert.equal(ctx.convolvers.length, 2, 'scheduled exports have their own shared bus');
    assert.equal((bus.output as unknown as Node).connections.length, 2, 'exports do not bypass into the live recording stream');
    silencePolyrhythmAudio();
  } finally {
    Context.latest.state = 'closed';
    Object.assign(globalThis, { window: originalWindow });
  }
});

test('new Study sessions use Soft Synth while explicit scene palettes stay intact', () => {
  assert.equal(createPolyrhythmSoundSettings().palette, 'soft-synth');
  assert.equal(POLYRHYTHM_PRESETS.find((preset) => preset.id === 'three-five')!.study.soundSettings.palette, 'soft-synth');
  assert.equal(createPolyrhythmSoundSettings({ palette: 'wood' }).palette, 'wood');
});
