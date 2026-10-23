import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderStudyInstrument, getStudyInstrumentSample, isStudyInstrument } from '../src/lib/studyInstruments';
import { createPolyrhythmSoundSettings } from '../src/lib/polyrhythmStudy';

test('new instruments have finite bounded stereo samples and silent boundaries', () => {
  for (const instrument of ['chorus-keys', 'atmosphere-synth', 'muted-pluck', 'stereo-pluck'] as const) {
    for (const frequency of [110, 220, 880]) {
      const channels = renderStudyInstrument(instrument, frequency, 16000);
      let stereoDifference = 0;
      let energy = 0;
      for (let i = 0; i < channels[0].length; i++) {
        const [l, r] = [channels[0][i], channels[1][i]];
        assert.ok(Number.isFinite(l) && Number.isFinite(r));
        assert.ok(Math.abs(l) < 1 && Math.abs(r) < 1, 'sample never hard-clips');
        stereoDifference += (l - r) ** 2;
        energy += l * l;
      }
      assert.ok(stereoDifference > 0.01, 'the instrument has stereo dimension');
      assert.ok(energy > 5, 'the body is audible');
      for (const channel of channels) {
        assert.equal(channel[0], 0); assert.equal(channel.at(-1), 0);
        assert.ok(Math.abs(channel[1]) < 0.001, 'no sharp onset');
      }
    }
  }
});

test('new multisamples reuse buffers, preserve exact note tuning, and support scene loading', () => {
  let allocations = 0;
  const context = {
    sampleRate: 16000,
    createBuffer(channels: number, length: number) {
      allocations++;
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { getChannelData: (channel: number) => data[channel] };
    },
  } as unknown as BaseAudioContext;
  for (const instrument of ['chorus-keys', 'atmosphere-synth', 'muted-pluck', 'stereo-pluck'] as const) {
    assert.equal(createPolyrhythmSoundSettings({ palette: instrument }).palette, instrument);
    const first = getStudyInstrumentSample(context, instrument, 188, false);
    const second = getStudyInstrumentSample(context, instrument, 189, false);
    assert.equal(first.buffer, second.buffer, 'nearby notes reuse the same multisample');
    assert.ok(Math.abs(second.playbackRate / first.playbackRate - 189 / 188) < 1e-12, 'Original pitch is not quantized');
    const accented = getStudyInstrumentSample(context, instrument, 188, true);
    assert.notEqual(accented.buffer, first.buffer, 'accent changes timbre as well as gain');
  }
  assert.equal(allocations, 8);
  for (const palette of ['wood', 'soft-synth', 'study-pulse', 'warm-synth', 'chime', 'bright-marker', 'crystal-bell', 'ambient-bloom']) {
    assert.equal(isStudyInstrument(palette), false, 'existing instruments keep their original path');
  }
});

test('plucks speak faster and finish sooner than the atmospheric synth', () => {
  const rate = 16000;
  const synth = renderStudyInstrument('atmosphere-synth', 220, rate)[0];
  const rms = (data: Float32Array, from: number, to: number) => {
    let sum = 0;
    for (let i = Math.round(from * rate); i < Math.min(data.length, to * rate); i++) sum += data[i] ** 2;
    return Math.sqrt(sum / ((to - from) * rate));
  };
  for (const instrument of ['muted-pluck', 'stereo-pluck'] as const) {
    const pluck = renderStudyInstrument(instrument, 220, rate)[0];
    assert.ok(rms(pluck, 0, 0.03) > rms(synth, 0, 0.03), 'pluck has a clear immediate onset');
    assert.ok(pluck.length < rate * 0.8, 'short tails preserve rhythmic detail');
    assert.ok(rms(pluck, 0.3, 0.4) < rms(pluck, 0.03, 0.1) * 0.4);
  }
});

test('removed sounds load with Wood and cannot reappear in saved scenes', () => {
  for (const palette of ['cloud-pad', 'warm-synth', 'ambient-bloom']) {
    const legacy = { palette } as unknown as Parameters<typeof createPolyrhythmSoundSettings>[0];
    assert.equal(createPolyrhythmSoundSettings(legacy).palette, 'wood');
    assert.equal(isStudyInstrument(palette), false);
  }
});
