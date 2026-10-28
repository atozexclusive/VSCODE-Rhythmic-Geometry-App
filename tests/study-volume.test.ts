import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPolyrhythmAudioRecordingStream, triggerPolyrhythmPulse, createPolyrhythmExportAudioStream } from '../src/lib/polyrhythmAudio';
import { createPolyrhythmSoundSettings, POLYRHYTHM_PRESETS, cloneStudy } from '../src/lib/polyrhythmStudy';

class Param {
  value = 1;
  events: { kind: string; value: number; time: number }[] = [];
  setValueAtTime(value: number, time: number) { this.value = value; this.events.push({kind:'set',value,time}); }
  linearRampToValueAtTime(value: number, time: number) { this.value = value; this.events.push({kind:'linear',value,time}); }
  exponentialRampToValueAtTime(value: number, time: number) { this.value = value; this.events.push({kind:'exponential',value,time}); }
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

test('Study boosts quiet voices and records the same limited output while preserving Soft Synth pitch', () => {
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


test('Wood and Soft Synth fade from silence with gentler attacks, including accents and scheduled export voices', () => {
  for (const palette of ['wood', 'soft-synth'] as const) {
    const ctx = new Context();
    const sound = createPolyrhythmSoundSettings({ palette, pitchMode: 'free', reverbAmount: 0 });
    triggerPolyrhythmPulse({ frequency: 220, gain: 0.13, sound, layerIndex: 0, beatCount: 5,
      accented: true, atTime: 3, target: {context:ctx as unknown as AudioContext, destination:new Node() as unknown as AudioNode, outputToSpeakers:false} });
    assert.equal(ctx.oscillators.length,2);
    assert.equal(ctx.oscillators[0].frequency.value, palette === 'wood' ? 220*0.92 : 220);
    for (const [index, oscillator] of ctx.oscillators.entries()) {
      const envelope = oscillator.connections[0].connections[0].gain.events;
      assert.deepEqual(envelope[0],{kind:'set',value:0,time:3});
      const rise = envelope.filter(event=>event.kind==='linear');
      assert.equal(rise.length,16);
      const peak = rise.at(-1)!;
      const expectedAttack = index === 0 ? (palette === 'wood' ? 0.01 : 0.018) : (palette === 'wood' ? 0.008 : 0.012);
      assert.ok(Math.abs(peak.time-3-expectedAttack)<1e-12);
      assert.ok(rise.every((event,i)=>event.value >= (rise[i-1]?.value ?? 0)));
      const largestStep = Math.max(...rise.map((event,i)=>event.value-(rise[i-1]?.value ?? 0)));
      const oldExponentialLastStep = peak.value-Math.pow(0.0001,1/16)*Math.pow(peak.value,15/16);
      assert.ok(largestStep < oldExponentialLastStep/2, 'reduces the concentrated attack rather than just delaying it');
      assert.equal(envelope.at(-1)!.value,0.0001,'keeps the original decay floor');
      const expectedPeak = index === 0 ? 0.13*1.18*(palette === 'wood' ? 0.96 : 0.92) : 0.13*1.18*0.46;
      assert.ok(Math.abs(peak.value-expectedPeak)<1e-12,'keeps the existing voice level');
    }
  }
});
