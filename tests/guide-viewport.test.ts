import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getGuideViewport, getGuideDockLayout, getGuideHighlightHorizontalBounds } from '../src/lib/guideViewport';

test('guide card stays inside the visible viewport with browser chrome and shifted visual viewports', () => {
  for (const height of [160, 320, 568, 760, 844]) {
    for (const offsetTop of [0, 96, 220]) {
      const viewport = getGuideViewport(980, 1100, { width: 390, height, offsetLeft: 24, offsetTop });
      const card = getGuideDockLayout(viewport, true);
      assert.ok(card.left >= viewport.left);
      assert.ok(card.left + card.width <= viewport.left + viewport.width);
      assert.ok(card.top >= viewport.top);
      assert.ok(card.top + card.height <= viewport.top + viewport.height - 12);
    }
  }
});

test('viewport changes move the card with the visible screen rather than the layout viewport', () => {
  const expanded = getGuideDockLayout(getGuideViewport(390, 844, { width: 390, height: 760, offsetLeft: 0, offsetTop: 0 }), true);
  const chrome = getGuideDockLayout(getGuideViewport(390, 844, { width: 390, height: 568, offsetLeft: 0, offsetTop: 96 }), true);
  assert.equal(expanded.top + expanded.height, 748);
  assert.equal(chrome.top + chrome.height, 652);
});

test('desktop guide is centered and constrained when visual viewport is unavailable', () => {
  const viewport = getGuideViewport(1280, 900);
  const card = getGuideDockLayout(viewport, false);
  assert.equal(card.width, 480);
  assert.equal(card.left + card.width / 2, 640);
  assert.equal(card.top + card.height, 888);
});

test('guide dock grows to show the complete step and follows shorter content', () => {
  const viewport = getGuideViewport(390, 664);
  for (const contentHeight of [365, 420, 248]) {
    const card = getGuideDockLayout(viewport, true, contentHeight);
    assert.equal(card.height, contentHeight);
    assert.equal(card.top + card.height, 652);
  }
  assert.equal(getGuideDockLayout(viewport, true, 900).height, 640);
});


test('canvas guide highlight closes at both viewport edges even when the canvas is wider', () => {
  for (const width of [320, 390, 768]) {
    const viewport = getGuideViewport(width, 844, { width, height: 760, offsetLeft: 20, offsetTop: 40 });
    const bounds = getGuideHighlightHorizontalBounds({ left: -50, right: 1600 }, viewport);
    assert.equal(bounds.left, 32);
    assert.equal(bounds.width, width - 24);
    assert.equal(bounds.left + bounds.width, viewport.left + width - 12);
  }
});
