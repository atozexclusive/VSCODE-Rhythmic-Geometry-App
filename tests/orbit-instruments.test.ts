import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ORBIT_DESIGNED_INSTRUMENTS, renderOrbitInstrument, getOrbitInstrumentDuration, prepareOrbitInstrument, scheduleDesignedOrbitInstrument } from '../src/lib/orbitInstruments';
import { ORBIT_SOUND_PALETTES, normalizeOrbitSoundPalette } from '../src/lib/audioEngine';

test('retired Orbit sounds resolve to supported replacements and disappear from the menu', () => {
  assert.equal(normalizeOrbitSoundPalette('warm-pad'), 'lunar-silk');
  assert.equal(normalizeOrbitSoundPalette('pluck'), 'prism-tide');
  assert.equal(normalizeOrbitSoundPalette(undefined), 'standard');
  assert.equal(normalizeOrbitSoundPalette('unknown'), 'standard');
  for (const [id] of ORBIT_SOUND_PALETTES) assert.equal(normalizeOrbitSoundPalette(id), id);
  assert.ok(!ORBIT_SOUND_PALETTES.some(([id]) => (id as string) === 'warm-pad' || (id as string) === 'pluck'));
});

test('Orbit instruments have smooth bounded samples across pitch and speed', () => {
  for (const [instrument] of ORBIT_DESIGNED_INSTRUMENTS) {
    assert.ok(ORBIT_SOUND_PALETTES.some(([id]) => id === instrument));
    for (const frequency of [110, 440, 1760]) for (const speed of [1, 4, 12]) for (const phase of [0, Math.PI / 2]) {
      const [left, right] = renderOrbitInstrument(instrument, frequency, 16000, speed, phase);
      assert.equal(left.length, Math.ceil(getOrbitInstrumentDuration(instrument, speed) * 16000));
      let peak = 0, energy = 0;
      for (let i = 0; i < left.length; i++) {
        assert.ok(Number.isFinite(left[i]) && Number.isFinite(right[i]));
        peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
        energy += left[i] ** 2;
      }
      assert.ok(peak > 0.12 && peak < 0.681);
      assert.ok(energy > 0.1);
      assert.equal(left[0], 0); assert.equal(left.at(-1), 0);
      assert.equal(right[0], 0); assert.equal(right.at(-1), 0);
      assert.ok(Math.abs(left[1]) < 0.001, 'no abrupt sample onset');
    }
    assert.ok(getOrbitInstrumentDuration(instrument, 12) < getOrbitInstrumentDuration(instrument, 1), 'damping shortens dense patterns without changing pitch');
  }
});

test('Orbit instruments reuse multisamples, keep precise tuning, and clean up voices', () => {
  let allocations = 0;
  const sources: any[] = [];
  const nodes: any[] = [];
  const node = () => { const n = { gain: { value: 0 }, playbackRate: { value: 1 }, connections: [] as any[], disconnected: false,
    connect(other: any) { this.connections.push(other); }, disconnect() { this.disconnected = true; } }; nodes.push(n); return n; };
  const context = { sampleRate: 16000, currentTime: 2,
    createBuffer(channels: number, length: number) { allocations++; const data = Array.from({ length: channels }, () => new Float32Array(length)); return { length, sampleRate: 16000, getChannelData: (c: number) => data[c] }; },
    createGain: node,
    createBufferSource() { const n = Object.assign(node(), { buffer: null, startedAt: -1, onended: null as (() => void) | null, start(at: number) { this.startedAt = at; } }); sources.push(n); return n; },
  } as unknown as AudioContext;
  const destination = node() as unknown as AudioNode;
  for (const [instrument] of ORBIT_DESIGNED_INSTRUMENTS) {
    const first = prepareOrbitInstrument(context, instrument, 440, 1);
    const next = prepareOrbitInstrument(context, instrument, 441, 1);
    assert.equal(first.buffer, next.buffer);
    assert.equal(first.quadratureBuffer, next.quadratureBuffer);
    assert.notEqual(first.buffer, first.quadratureBuffer);
    assert.ok(Math.abs(next.playbackRate / first.playbackRate - 441 / 440) < 1e-12);
    const dense = prepareOrbitInstrument(context, instrument, 440, 12);
    assert.notEqual(dense.buffer, first.buffer);
    const count = sources.length;
    scheduleDesignedOrbitInstrument(context, destination, instrument, 440, 0, 1, 1);
    assert.equal(sources.length, count, 'muted hits stay silent');
    scheduleDesignedOrbitInstrument(context, destination, instrument, 440, 0.12, 1, 1);
    assert.equal(sources.length, count + 2, 'phase pair is scheduled together');
    for (const source of sources.slice(count)) {
      assert.ok(source.startedAt >= 2.008, 'sample preparation cannot skip an attack');
      assert.equal(source.connections[0].connections[0], destination);
      source.onended();
      assert.ok(source.disconnected && source.connections[0].disconnected);
    }
    const previousWeight = sources.at(-1)!.connections[0].gain.value;
    scheduleDesignedOrbitInstrument(context, destination, instrument, 440, 0.12, 1, 1, 1);
    assert.notEqual(sources.at(-1)!.connections[0].gain.value, previousWeight, 'successive hits vary phase without changing pitch');
  }
  assert.equal(allocations, 28);
});
