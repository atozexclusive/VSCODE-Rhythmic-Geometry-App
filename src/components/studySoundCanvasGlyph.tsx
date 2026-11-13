import { renderToStaticMarkup } from 'react-dom/server';
import StudySoundGlyph from './StudySoundGlyph';

// Reuse the actual UI artwork so canvas exports never drift to a different icon set.
const glyphs = new Map<string, HTMLImageElement>();
export function prepareStudySoundGlyph(instrument: string, color: string): HTMLImageElement {
  const key = `${instrument}:${color}`;
  const cached = glyphs.get(key);
  if (cached) return cached;
  let svg = renderToStaticMarkup(<StudySoundGlyph instrument={instrument} />)
    .replace(/\s(?:width|height)="[^"]*"/g, '')
    .replace('<svg', `<svg width="24" height="24" style="color:${color}"`);
  if (!svg.includes('xmlns=')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  if (glyphs.size >= 96) glyphs.delete(glyphs.keys().next().value!);
  glyphs.set(key, image);
  return image;
}
export function drawStudySoundGlyph(ctx: CanvasRenderingContext2D, instrument: string, color: string,
  x: number, y: number, size: number): void {
  const image = prepareStudySoundGlyph(instrument, color);
  if (image.complete && image.naturalWidth > 0) ctx.drawImage(image, x, y, size, size);
}
