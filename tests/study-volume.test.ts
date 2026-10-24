import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPolyrhythmAudioRecordingStream, triggerPolyrhythmPulse, createPolyrhythmExportAudioStream } from '../src/lib/polyrhythmAudio';
import { createPolyrhythmSoundSettings, POLYRHYTHM_PRESETS, cloneStudy } from '../src/lib/polyrhythmStudy';

class Param {
  value = 1;
  setValueAtTime(value: number) { this.value = value; }
  exponentialRampToValueAtTime(value: number) { this.value = value; }
}
class Node {
  connections: Node[] = [];
  gain = new Param(); frequency = new Param(); Q = new Param();
  threshold = new Param(); knee = new Param(); ratio = new Param(); attack = new Param(); release = new Param();
  connect(node: Node) { this.connections.push(node); }
  start() {} stop() {} addEventListener() {}
}
class Context {
  static latest: Context;
  state = 'running'; currentTime = 1; sampleRate = 1000;
  destination = new Node(); oscillators: Node[] = []; compressors: Node[] = []; recordings: Node[] = [];
  constructor() { Context.latest = this; }
  createGain() { return new Node(); }
  createBiquadFilter() { return new Node(); }
  createOscillator() { const node = new Node(); this.oscillators.push(node); return node; }
  createDynamicsCompressor() { const node = new Node(); this.compressors.push(node); return node; }
  createMediaStreamDestination() { const node = Object.assign(new Node(), { stream: {} }); this.recordings.push(node); return node; }
}

test('Study boosts quiet voices and records the same limited output without altering Soft Synth', () => {
  const originalWindow = globalThis.window;
  Object.assign(globalThis, { window: { AudioContext: Context } });
  try {
    getPolyrhythmAudioRecordingStream();
    const ctx = Context.latest;
    const sound = createPolyrhythmSoundSettings({ palette: 'soft-synth', pitchMode: 'free' });
    triggerPolyrhythmPulse({ frequency: 220, gain: 0.13, sound, layerIndex: 0, beatCount: 5 });
    const input = ctx.oscillators[0].connections[0].connections[0].connections[0];
    const limiter = input.connections[0];
    const output = limiter.connections[0];
    assert.equal(input.gain.value, 4);
    assert.equal(limiter.threshold.value, -8);
    assert.equal(limiter.ratio.value, 20);
    assert.equal(output.gain.value, 0.75);
    assert.deepEqual(output.connections, [ctx.destination, ctx.recordings[0]]);
    assert.equal(ctx.oscillators[0].frequency.value, 220);
    const study = cloneStudy(POLYRHYTHM_PRESETS.find(preset => preset.id === 'three-five')!.study);
    study.soundSettings = sound;
    study.barMarkerSoundEnabled = false;
    createPolyrhythmExportAudioStream(study, 0.5);
    assert.equal(ctx.compressors.length, 2, 'scheduled exports get the same protection in their own bus');
    assert.deepEqual(ctx.compressors[1].connections[0].connections, [ctx.recordings[1]], 'scheduled exports never double into the live recorder');
    assert.equal(ctx.compressors[1].threshold.value, limiter.threshold.value);
    assert.equal(ctx.compressors[1].connections[0].gain.value, output.gain.value);
  } finally {
    Context.latest.state = 'closed';
    Object.assign(globalThis, { window: originalWindow });
  }
});
