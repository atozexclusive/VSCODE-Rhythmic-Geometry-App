import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scheduleDesignedOrbitInstrument, prepareOrbitInstrument, requestOrbitInstrument,
  releaseOrbitInstrumentContext, getOrbitInstrumentResources,
  ORBIT_SAMPLE_CACHE_BYTES, ORBIT_MAX_VOICES, ORBIT_SAMPLE_RATE,
} from '../src/lib/orbitInstruments';
import { renderOrbitInstrument } from '../src/lib/orbitInstrumentSamples';

class Param {
  value = 1;
  setValueAtTime(value: number) { this.value = value; }
  setTargetAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime(value: number) { this.value = value; }
  exponentialRampToValueAtTime(value: number) { this.value = value; }
}
class Node {
  gain = new Param(); playbackRate = new Param(); frequency = new Param(); detune = new Param();
  buffer: any; type = ''; startedAt = -1; stoppedAt = -1; disconnected = false;
  onended?: () => void;
  connect() {} disconnect() { this.disconnected = true; }
  start(at: number) { this.startedAt = at; }
  stop(at: number) { this.stoppedAt = at; }
}
class Context {
  sampleRate = 48000; currentTime = 2; state = 'running'; allocations = 0;
  sources: Node[] = []; oscillators: Node[] = [];
  createBuffer(channels: number, length: number, sampleRate: number) {
    this.allocations++;
    const pcm = Array.from({ length: channels }, () => new Float32Array(length));
    return { length, sampleRate, getChannelData: (channel: number) => pcm[channel] };
  }
  createGain() { return new Node(); }
  createBufferSource() { const source = new Node(); this.sources.push(source); return source; }
  createOscillator() { const source = new Node(); this.oscillators.push(source); return source; }
}

test('cold live impacts sound immediately, deduplicate background jobs, and never replay late', () => {
  const previousWorker = globalThis.Worker;
  class Renderer {
    static current: Renderer;
    jobs: any[] = []; onmessage?: (event: any) => void; onerror?: () => void; terminated = false;
    constructor() { Renderer.current = this; }
    postMessage(job: any) { this.jobs.push(job); }
    terminate() { this.terminated = true; }
  }
  Object.assign(globalThis, { Worker: Renderer });
  const mock = new Context(); const context = mock as unknown as AudioContext;
  const destination = new Node() as unknown as AudioNode;
  try {
    scheduleDesignedOrbitInstrument(context, destination, 'lunar-silk', 440, 0.12, 2.02, 1, 0, true);
    assert.equal(mock.allocations, 0, 'the animation callback does not allocate or synthesize PCM');
    assert.equal(mock.oscillators.length, 2, 'a lightweight first impact is audible on time');
    assert.equal(mock.oscillators[0].startedAt, 2.02);
    requestOrbitInstrument(context, 'lunar-silk', 440, 1);
    const renderer = Renderer.current;
    assert.equal(renderer.jobs.length, 1, 'repeated cold hits share one preparation job');
    const job = renderer.jobs[0];
    assert.equal(job.sampleRate, ORBIT_SAMPLE_RATE);
    const channels = [
      ...renderOrbitInstrument(job.instrument, job.frequency, job.sampleRate, job.speed),
      ...renderOrbitInstrument(job.instrument, job.frequency, job.sampleRate, job.speed, Math.PI / 2),
    ];
    renderer.onmessage!({ data: { id: job.id, channels } });
    assert.equal(mock.sources.length, 0, 'finishing preparation does not replay the old hit');
    scheduleDesignedOrbitInstrument(context, destination, 'lunar-silk', 440, 0.12, 2.1, 1, 1, true);
    assert.equal(mock.sources.length, 2, 'the next note uses the prepared instrument');
    assert.equal(mock.oscillators.length, 2, 'no additional core is needed once ready');
    assert.equal(mock.sources[0].buffer.sampleRate, ORBIT_SAMPLE_RATE);
    assert.equal(mock.sources[0].startedAt, 2.1);
    assert.equal(getOrbitInstrumentResources(context).pendingNotes, 0);
    for (let i = 0; i < 20; i++) requestOrbitInstrument(context, 'prism-tide', 110 * 2 ** (i / 4), 1);
    assert.ok(getOrbitInstrumentResources(context).pendingNotes <= 8, 'background work stays bounded');
    releaseOrbitInstrumentContext(context);
    assert.ok(renderer.terminated);
    assert.equal(getOrbitInstrumentResources(context).cacheBytes, 0);
    assert.equal(getOrbitInstrumentResources(context).pendingNotes, 0);
  } finally { releaseOrbitInstrumentContext(context); Object.assign(globalThis, { Worker: previousWorker }); }
});

test('prepared note cache is bounded and evicts old pitches instead of growing forever', () => {
  const mock = new Context(); const context = mock as unknown as AudioContext;
  const first = prepareOrbitInstrument(context, 'lunar-silk', 110, 1);
  for (let i = 1; i < 18; i++) prepareOrbitInstrument(context, 'lunar-silk', 110 * 2 ** (i / 4), 1);
  const resources = getOrbitInstrumentResources(context);
  assert.ok(resources.cacheBytes <= ORBIT_SAMPLE_CACHE_BYTES);
  assert.ok(resources.cachedNotes < 18 && resources.cachedNotes > 1);
  assert.notEqual(prepareOrbitInstrument(context, 'lunar-silk', 110, 1).buffer, first.buffer);
  releaseOrbitInstrumentContext(context);
});

test('overlap is capped across all layers and stolen voices fade before stopping', () => {
  const mock = new Context(); const context = mock as unknown as AudioContext;
  const layers = Array.from({ length: 4 }, () => new Node() as unknown as AudioNode);
  prepareOrbitInstrument(context, 'astral-veil', 440, 1);
  for (let i = 0; i < 32; i++) scheduleDesignedOrbitInstrument(context, layers[i % layers.length], 'astral-veil', 440, 0.12, 2.01, 1, i, true);
  assert.equal(getOrbitInstrumentResources(context).activeVoices, ORBIT_MAX_VOICES);
  const retired = mock.sources.filter(source => source.stoppedAt >= 0);
  assert.equal(retired.length, (32 - ORBIT_MAX_VOICES) * 2);
  assert.ok(retired.every(source => source.stoppedAt >= 2.01 && source.stoppedAt <= 2.02));
  releaseOrbitInstrumentContext(context);
});

test('export lookahead does not steal notes before their scheduled start', () => {
  const mock = new Context(); const context = mock as unknown as AudioContext;
  const destination = new Node() as unknown as AudioNode;
  for (let i = 0; i < 40; i++) scheduleDesignedOrbitInstrument(context, destination, 'prism-tide', 440, 0.12, 2.12 + i * 0.024, 12, i);
  assert.ok(mock.sources.every(source => source.stoppedAt === -1));
  assert.ok(mock.sources.at(-1)!.startedAt > 3);
  releaseOrbitInstrumentContext(context);
});
