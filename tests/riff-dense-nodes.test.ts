import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDenseRiffNodeScale, getDenseRiffLabelStride, getDenseRiffWindow, getRiffGroupingArc } from '../src/lib/riffCycleLayout';

test('dense riff nodes preserve ordinary patterns and fit mobile accent rings between steps', () => {
  assert.equal(getDenseRiffNodeScale(60, 100), 1);
  assert.equal(getDenseRiffNodeScale(32, 300, 1.5), 1.5);
  const mobile = getDenseRiffNodeScale(96, 100);
  const desktop = getDenseRiffNodeScale(96, 250);
  assert.ok(mobile < desktop);
  assert.ok(20 * mobile <= 2 * 100 * Math.sin(Math.PI / 96) + 1e-9);
  assert.ok(getDenseRiffNodeScale(120, 100) < mobile);
  assert.ok(getDenseRiffNodeScale(61, 100) > 0.96);
});

test('dense labels adapt to available space and magnified steps wrap through the restart', () => {
  assert.equal(getDenseRiffLabelStride(96, 100), 5);
  assert.equal(getDenseRiffLabelStride(96, 250), 1);
  assert.equal(getDenseRiffLabelStride(180, 100), 10);
  assert.deepEqual(getDenseRiffWindow(0, 96), [93, 94, 95, 0, 1, 2, 3]);
});

test('dense grouping bridges stay short instead of wrapping into almost a full circle', () => {
  for (const count of [61, 90, 96, 120, 192]) {
    const span = 2 * Math.PI * 2 / count;
    const arc = getRiffGroupingArc(5.9, 5.9 + span);
    assert.ok(arc);
    assert.ok(arc[0] > 5.9);
    assert.ok(arc[1] < 5.9 + span);
    assert.ok(arc[1] > arc[0]);
    assert.ok(arc[1] - arc[0] < span);
  }
  assert.equal(getRiffGroupingArc(1, 1.01), null);
});
