import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STUDY_PERCUSSION_ENSEMBLES, POLYRHYTHM_PRESETS, cloneStudy } from '../src/lib/polyrhythmStudy';
const hits = (layer: { activeSteps: boolean[] }) => layer.activeSteps.flatMap((active, i) => active ? [i + 1] : []);
test('ensemble scenes are audible, editable, correctly timed and labelled', () => {
  assert.equal(STUDY_PERCUSSION_ENSEMBLES.length, 6);
  for (const preset of STUDY_PERCUSSION_ENSEMBLES) {
    assert.ok(POLYRHYTHM_PRESETS.some(p => p.id === preset.id));
    assert.ok(preset.summary);
    const study = preset.study;
    assert.ok(study.ensembleView && study.sharedGridEnabled && !study.soundsLinked);
    assert.ok(study.layers.length >= 3 && study.layers.length <= 6);
    assert.ok(study.layers.every(l => l.label && l.soundEnabled && l.gain > 0 && l.rotationOffset === 0));
    assert.ok(study.layers.every(l => l.beatCount === study.layers[0].beatCount && l.activeSteps.some(Boolean)));
    assert.deepEqual(cloneStudy(study).layers.map(l => l.label), study.layers.map(l => l.label));
    if (study.layers[0].beatCount === 32) assert.equal(study.cycleBeats, 8);
  }
});
test('key source timelines and opposing clave direction stay exact', () => {
  const scene = (id: string) => STUDY_PERCUSSION_ENSEMBLES.find(p => p.id === id)!.study;
  const son = scene('ensemble-son-23');
  const reverse = scene('ensemble-son-32');
  assert.deepEqual(hits(son.layers[0]), [5,9,17,23,29]);
  son.layers.forEach((layer, i) => assert.deepEqual(hits(reverse.layers[i]), hits(layer).map(s => (s - 1 + 16) % 32 + 1).sort((a,b) => a-b)));
  assert.deepEqual(hits(scene('ensemble-bembe-pulse').layers[0]), [1,3,5,6,8,10,12]);
  assert.deepEqual(hits(scene('ensemble-bossa-nova').layers[1]), [1,7,13,21,27]);
  assert.deepEqual(hits(scene('ensemble-samba-surdo-three').layers[5]), [1,5,6,9,13,14,15,16]);
});

test('half of Study groove scenes are Pro with free introductions in every category', () => {
  const grooves = POLYRHYTHM_PRESETS.filter(p => p.group === 'grooves');
  assert.equal(grooves.length, 20);
  assert.equal(grooves.filter(p => p.pro).length, 10);
  for (const id of ['groove-backbeat', 'groove-house', 'groove-deep-house-keys', 'ensemble-samba-foundation', 'ensemble-son-23', 'ensemble-bossa-nova']) {
    assert.equal(grooves.find(p => p.id === id)?.pro, false);
  }
});
