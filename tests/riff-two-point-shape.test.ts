import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTwoPointRiffShape } from '../src/lib/riffCycleLayout';

test('two-point facets retain hit endpoints and stay inside the riff ring at every spacing', () => {
  const center = { x: 240, y: 300 }, radius = 100;
  const a = { x: 240, y: 200 };
  for (let step = 1; step < 96; step++) {
    const angle = -Math.PI / 2 + step / 96 * 2 * Math.PI;
    const b = { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
    const shape = getTwoPointRiffShape(a, b, center, radius);
    assert.ok(shape);
    assert.deepEqual(shape[0], a);
    assert.deepEqual(shape[2], b);
    assert.notEqual(shape[0], a);
    shape.forEach(point => assert.ok(Math.hypot(point.x - center.x, point.y - center.y) <= radius + 1e-8));
    const area = Math.abs((shape[1].x - a.x) * (b.y - a.y) - (shape[1].y - a.y) * (b.x - a.x));
    assert.ok(area > 0, 'two distinct hits enclose a visible shape');
  }
  assert.equal(getTwoPointRiffShape(a, a, center, radius), null);
});
