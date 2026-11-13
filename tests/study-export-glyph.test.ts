import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareStudySoundGlyph } from '../src/components/studySoundCanvasGlyph';
test('export glyphs preserve the UI SVG geometry and valid image dimensions', () => {
  const prior = globalThis.Image;
  globalThis.Image = class { src = ''; } as unknown as typeof Image;
  try {
    for (const voice of ['kick', 'snare', 'tom', 'hi-hat', 'cymbal', 'wood-block', 'chime', 'chorus-keys', 'crystal-bell', 'soft-synth', 'shaker', 'clave']) {
      const image = prepareStudySoundGlyph(voice, '#72F1B8');
      const svg = decodeURIComponent(image.src.split(',')[1]);
      assert.equal((svg.match(/xmlns=/g) ?? []).length, 1);
      assert.equal((svg.match(/ width=/g) ?? []).length, 1);
      assert.ok(svg.includes('width="24" height="24"'));
      assert.ok(!svg.includes('stroke-width="24"'));
      assert.ok(svg.includes('#72F1B8'));
      assert.equal(prepareStudySoundGlyph(voice, '#72F1B8'), image);
    }
  } finally { globalThis.Image = prior; }
});
