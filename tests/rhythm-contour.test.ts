import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendRhythmContourPath, drawRhythmContour } from '../src/lib/rhythmContour';

test('the shared Riff/Study contour closes and fills two-point and multi-point shapes', () => {
  for (const count of [2, 3, 6]) {
    const calls: string[] = [];
    const context = new Proxy({}, { get: (_, name) => (...args: unknown[]) => {
      calls.push(String(name));
      assert.ok(args.every(value => typeof value !== 'number' || Number.isFinite(value)));
    }, set: () => true }) as CanvasRenderingContext2D;
    const points = Array.from({ length: count }, (_, index) => {
      const angle = -Math.PI / 2 + index / count * Math.PI * 2;
      return { index: index * 2, angle, active: true, x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 };
    });
    const options = { centerX: 0, centerY: 0, radius: 100, stepCount: count * 2, pointScale: 1, intensity: 0.54 };
    assert.equal(appendRhythmContourPath(context, points, options), true);
    assert.equal(calls.filter(call => call === 'quadraticCurveTo').length, count);
    assert.equal(calls.at(-1), 'closePath');
    calls.length = 0;
    drawRhythmContour(context, points, { ...options, color: '#72F1B8', glowMultiplier: 1, showLabels: false, fill: true });
    assert.equal(calls.filter(call => call === 'fill').length, 1);
    assert.equal(calls.filter(call => call === 'stroke').length, 2);
  }
});
