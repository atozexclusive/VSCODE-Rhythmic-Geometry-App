import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRiffCycleStudy, createRiffPhrase, cloneRiffCycleStudy, getRiffVoiceEventsForCell, isRiffVoiceEventAtStep, getLastRiffVoiceRepeatStep, getLastRiffVoiceCycleCompletion, type RiffVoiceEvent } from '../src/lib/riffCycleStudy';

const study = createRiffCycleStudy({ riff: createRiffPhrase(16) });
const crash: RiffVoiceEvent = { voice: 'drums', instrument: 'cymbal', surface: 'subdivision', index: 0, repeatEverySteps: 3 };
const hits = (event: RiffVoiceEvent, start: number, count: number) => Array.from({ length: count }, (_, i) => i + start).filter(step => isRiffVoiceEventAtStep(study, event, step));

test('every third step crosses bars and resolves after three 16-step bars', () => {
  assert.deepEqual(hits(crash, 0, 16), [0, 3, 6, 9, 12, 15]);
  assert.deepEqual(hits(crash, 16, 16), [18, 21, 24, 27, 30]);
  assert.deepEqual(hits(crash, 32, 16), [33, 36, 39, 42, 45]);
  assert.equal(isRiffVoiceEventAtStep(study, crash, 48), true);
  assert.equal(isRiffVoiceEventAtStep(study, crash, 64), true); // restart even when the previous accent cycle is incomplete
});
test('all intervals restart on the riff downbeat', () => {
  for (let interval = 1; interval <= 100; interval++) {
    const event = { ...crash, index: 5, repeatEverySteps: interval };
    const result = hits(event, 0, 64);
    assert.equal(result[0], 0);
    result.slice(1).forEach((hit, i) => assert.equal(hit - result[i], interval));
    assert.equal(getLastRiffVoiceRepeatStep(study, event, 64), 64);
    assert.equal(getLastRiffVoiceRepeatStep(study, event, 128), 128);
  }
});
test('repeating quarter-note voices start on the downbeat', () => {
  assert.deepEqual(hits({ ...crash, surface: 'beat', index: 1 }, 0, 17), [0, 3, 6, 9, 12, 15]);
});
test('normal voices retain their original phrase/bar playback', () => {
  assert.deepEqual(hits({ ...crash, repeatEverySteps: undefined }, 0, 49), [0, 16, 32, 48]);
  assert.deepEqual(hits({ ...crash, surface: 'beat', index: 1, repeatEverySteps: undefined }, 0, 33), [4, 20]);
  assert.deepEqual(hits({ ...crash, surface: 'reference-subdivision', index: 2, repeatEverySteps: undefined }, 0, 33), [2, 18]);
});
test('invalid repeat values use normal playback rather than losing the voice', () => {
  for (const value of [0, -3, 2.5, 101, NaN, Infinity]) {
    assert.deepEqual(hits({ ...crash, repeatEverySteps: value }, 0, 33), [0, 16, 32]);
  }
});
test('scene JSON and cloning preserve repeat settings without aliasing events', () => {
  const saved = createRiffCycleStudy({ ...study, voiceEvents: [crash] });
  const restored = cloneRiffCycleStudy(createRiffCycleStudy(JSON.parse(JSON.stringify(saved))));
  assert.equal(restored.voiceEvents?.[0].repeatEverySteps, 3);
  assert.notEqual(saved.voiceEvents?.[0], restored.voiceEvents?.[0]);
  assert.deepEqual(hits(restored.voiceEvents![0], 16, 16), [18, 21, 24, 27, 30]);
});
test('cell-scoped repeats remain isolated from other cells', () => {
  const sequenced = createRiffCycleStudy({ ...study, riffSequenceEnabled: true, voiceEvents: [{ ...crash, cellLabel: 'B' }] });
  assert.equal(getRiffVoiceEventsForCell(sequenced, 'A').length, 0);
  assert.equal(getRiffVoiceEventsForCell(sequenced, 'B').length, 1);
});

test('MIDI exports one crash per repeat with no reset at bar boundaries', async () => {
  const { buildRiffCycleMidiFile } = await import('../src/lib/riffCycleMidi');
  const bytes = buildRiffCycleMidiFile(createRiffCycleStudy({ ...study, voiceEvents: [crash] }), 'cycle');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const hits: number[] = [];
  for (let track = 14; track < bytes.length;) {
    const length = view.getUint32(track + 4);
    const end = track + 8 + length;
    let pos = track + 8;
    let tick = 0;
    const readVariable = () => {
      let value = 0, byte: number;
      do { byte = bytes[pos++]; value = (value << 7) | (byte & 127); } while (byte & 128);
      return value;
    };
    while (pos < end) {
      tick += readVariable();
      const status = bytes[pos++];
      if (status === 255) { pos++; const length = readVariable(); pos += length; }
      else if (status === 240 || status === 247) { const length = readVariable(); pos += length; }
      else {
        const kind = status & 240;
        const note = bytes[pos++];
        if (kind !== 192 && kind !== 208) {
          const velocity = bytes[pos++];
          if (status === 153 && note === 49 && velocity > 0) hits.push(tick);
        }
      }
    }
    track = end;
  }
  assert.ok(hits.length > 16);
  assert.equal(hits[0], 0);
  hits.slice(1).forEach((tick, i) => assert.equal(tick - hits[i], 360));
});

 test('custom five-step accents play 2 + 3 and truncate at riff reset', () => {
  const event = { ...crash, repeatEverySteps: 5, repeatPattern: [true, false, true, false, false] };
  assert.deepEqual(hits(event, 0, 16), [0, 2, 5, 7, 10, 12, 15]);
  assert.deepEqual(hits(event, 60, 12), [60, 62, 64, 66, 69, 71]);
  assert.equal(getLastRiffVoiceRepeatStep(study, event, 65), 64);
});
test('custom rests stay silent, including a rest on the downbeat', () => {
  assert.deepEqual(hits({ ...crash, repeatPattern: [false, false, false] }, 0, 130), []);
  const event = { ...crash, repeatPattern: [false, true, false] };
  assert.equal(getLastRiffVoiceRepeatStep(study, event, 64), null);
  assert.equal(isRiffVoiceEventAtStep(study, event, 65), true);
});
test('custom accent patterns survive scene round trips and clone independently', () => {
  const original = createRiffCycleStudy({ voiceEvents: [{ ...crash, repeatPattern: [true, false, true] }] });
  const cloned = cloneRiffCycleStudy(original);
  cloned.voiceEvents![0].repeatPattern![1] = true;
  assert.deepEqual(original.voiceEvents![0].repeatPattern, [true, false, true]);
  const restored = createRiffCycleStudy(JSON.parse(JSON.stringify(original)));
  assert.deepEqual(restored.voiceEvents![0].repeatPattern, [true, false, true]);
});

test('completion pulse marks whole cycles but yields to riff reset', () => {
  const event = { ...crash, repeatEverySteps: 5, accentCycleFlash: true };
  assert.equal(getLastRiffVoiceCycleCompletion(study, event, 0), null);
  assert.equal(getLastRiffVoiceCycleCompletion(study, event, 4), null);
  assert.equal(getLastRiffVoiceCycleCompletion(study, event, 5), 5);
  assert.equal(getLastRiffVoiceCycleCompletion(study, event, 63), 60);
  assert.equal(getLastRiffVoiceCycleCompletion(study, event, 64), null);
  assert.equal(getLastRiffVoiceCycleCompletion(study, event, 69), 69);
  assert.equal(getLastRiffVoiceCycleCompletion(study, { ...event, repeatEverySteps: 4 }, 64), null);
  assert.deepEqual(hits(event, 0, 130), hits({ ...event, accentCycleFlash: false }, 0, 130));
  const restored = createRiffCycleStudy(JSON.parse(JSON.stringify(createRiffCycleStudy({voiceEvents: [event]}))));
  assert.equal(restored.voiceEvents![0].accentCycleFlash, true);
});

test('accent display shape survives saving without changing hit timing', () => {
  const riffEvent: RiffVoiceEvent = { ...crash, accentSurface: 'riff' };
  const restored = cloneRiffCycleStudy(createRiffCycleStudy(JSON.parse(JSON.stringify(createRiffCycleStudy({ voiceEvents: [riffEvent] })))));
  assert.equal(restored.voiceEvents![0].accentSurface, 'riff');
  assert.deepEqual(hits(riffEvent, 0, 130), hits({ ...riffEvent, accentSurface: 'bar' }, 0, 130));
});

test('initial voice preview follows actual first-step hits', () => {
  const laterSnare: RiffVoiceEvent = { voice: 'drums', instrument: 'snare', surface: 'beat', index: 1 };
  assert.equal(isRiffVoiceEventAtStep(study, laterSnare, 0), false);
  assert.equal(isRiffVoiceEventAtStep(study, laterSnare, 4), true);
  assert.equal(isRiffVoiceEventAtStep(study, { ...laterSnare, index: 0 }, 0), true);
  assert.equal(isRiffVoiceEventAtStep(study, { ...laterSnare, repeatEverySteps: 3, repeatPattern: [false, true, false], accentSurface: 'riff' }, 0), false);
});
