import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPolyrhythmLayer, getSharedGridStepState, cloneStudy, createDefaultPolyrhythmStudy } from '../src/lib/polyrhythmStudy.ts';

test('Shared 3 against 5 grid distinguishes actual layer positions from guide counts', () => {
  const layers = [
    createPolyrhythmLayer(3, { activeSteps: [true, false, true], color: '#00ffaa' }),
    createPolyrhythmLayer(5, { activeSteps: [true, true, true, true, true], color: '#88ccff' }),
  ];
  const states = Array.from({ length: 15 }, (_, i) => getSharedGridStepState(layers, i, 15, layers[0].id));
  assert.deepEqual(states.flatMap((state, i) => state.editable ? [i] : []), [0, 3, 5, 6, 9, 10, 12]);
  assert.equal(states[0].color, '#00ffaa');
  assert.equal(states[5].editable, true);
  assert.equal(states[5].active, false);
  assert.equal(states[10].active, true);
  assert.equal(states[1].active, false);
  assert.equal(states[1].color, undefined);
  assert.equal(getSharedGridStepState(layers, 0, 15, layers[1].id).color, '#88ccff');
});

test('Shared grid emphasis follows rotated layer positions', () => {
  const layer = createPolyrhythmLayer(3, { activeSteps: [true, false, true], rotationOffset: 24 });
  assert.equal(getSharedGridStepState([layer], 0, 15).editable, false);
  assert.equal(getSharedGridStepState([layer], 1, 15).active, true);
  assert.equal(getSharedGridStepState([layer], 6, 15).active, false);
  assert.equal(getSharedGridStepState([layer], 11, 15).active, true);
  const offGrid = { ...layer, rotationOffset: 12 };
  assert.equal(getSharedGridStepState([offGrid], 1, 15).editable, false);
});

test('Inner numbers are opt-in and survive scene cloning', () => {
  const study = createDefaultPolyrhythmStudy();
  assert.equal(Boolean(study.showInnerNumbers), false);
  assert.equal(cloneStudy({ ...study, showInnerNumbers: true }).showInnerNumbers, true);
});
