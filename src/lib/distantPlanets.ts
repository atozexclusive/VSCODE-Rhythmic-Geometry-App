export const DISTANT_PLANET_OPTIONS = [
  { id: 'mercury', label: 'Mercury' }, { id: 'venus', label: 'Venus' },
  { id: 'earth', label: 'Earth' }, { id: 'mars', label: 'Mars' },
  { id: 'jupiter', label: 'Jupiter' }, { id: 'saturn', label: 'Saturn' },
  { id: 'uranus', label: 'Uranus' }, { id: 'neptune', label: 'Neptune' },
] as const;
export type DistantPlanetId = typeof DISTANT_PLANET_OPTIONS[number]['id'];
export type DistantPlanetPair = [DistantPlanetId, DistantPlanetId];

export function normalizeDistantPlanets(value: unknown, fallback: DistantPlanetPair = ['saturn', 'earth']): DistantPlanetPair {
  const valid = (id: unknown): id is DistantPlanetId => DISTANT_PLANET_OPTIONS.some(option => option.id === id);
  return [0, 1].map(index => Array.isArray(value) && valid(value[index]) ? value[index] : fallback[index]) as DistantPlanetPair;
}

/** Muted, shaded worlds; caller supplies the same atmosphere opacity and fixed slot size. */
export function drawDistantPlanet(ctx: CanvasRenderingContext2D, planet: DistantPlanetId, x: number, y: number, radius: number): void {
  ctx.save();
  if (planet === 'saturn') {
    const drawRing = (start: number, end: number) => {
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 1.95, radius * 0.53, -0.35, start, end);
      ctx.stroke();
    };
    ctx.strokeStyle = 'rgba(173,157,124,0.58)';
    ctx.lineWidth = Math.max(1, radius * 0.18);
    drawRing(0, Math.PI * 2);

    const saturnShade = ctx.createRadialGradient(
      x - radius * 0.4, y - radius * 0.4, 0,
      x, y, radius,
    );
    saturnShade.addColorStop(0, '#b9ac8b');
    saturnShade.addColorStop(0.55, '#726750');
    saturnShade.addColorStop(1, '#11151c');
    ctx.fillStyle = saturnShade;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    drawRing(0, Math.PI);

  } else if (planet === 'earth') {
    const earthShade = ctx.createRadialGradient(
      x - radius * 0.35, y - radius * 0.4, 0,
      x, y, radius,
    );
    earthShade.addColorStop(0, '#7194a3');
    earthShade.addColorStop(0.5, '#345c73');
    earthShade.addColorStop(1, '#0d151f');
    ctx.fillStyle = earthShade;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.translate(x, y);
    ctx.scale(radius, radius);
    ctx.fillStyle = 'rgba(126,149,120,0.55)';
    ctx.beginPath();
    ctx.moveTo(-0.72, -0.52);
    ctx.bezierCurveTo(-0.34, -0.84, 0.16, -0.62, 0.04, -0.29);
    ctx.bezierCurveTo(-0.3, -0.12, 0.02, 0.08, -0.22, 0.24);
    ctx.bezierCurveTo(-0.34, 0.5, -0.27, 0.66, -0.47, 0.74);
    ctx.bezierCurveTo(-0.72, 0.4, -0.52, 0.03, -0.76, -0.12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0.38, -0.42);
    ctx.bezierCurveTo(0.74, -0.58, 1.06, -0.13, 0.88, 0.1);
    ctx.bezierCurveTo(0.59, 0.08, 0.76, 0.55, 0.47, 0.48);
    ctx.bezierCurveTo(0.28, 0.18, 0.52, 0.06, 0.3, -0.14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(208,218,222,0.28)';
    ctx.lineWidth = 0.09;
    ctx.beginPath();
    ctx.moveTo(-0.9, -0.36);
    ctx.bezierCurveTo(-0.2, -0.61, 0.1, -0.09, 0.78, -0.26);
    ctx.moveTo(-0.54, 0.46);
    ctx.bezierCurveTo(-0.12, 0.2, 0.41, 0.54, 0.94, 0.3);
    ctx.stroke();
    ctx.restore();
  } else {
    const colors: Record<Exclude<DistantPlanetId, 'saturn' | 'earth'>, [string, string, string]> = {
      mercury: ['#aaa69c', '#64625e', '#11151c'],
      venus: ['#bfae8b', '#867252', '#17171b'],
      mars: ['#b48a74', '#7c5143', '#18151b'],
      jupiter: ['#b8ab95', '#807164', '#15161d'],
      uranus: ['#90b3b4', '#527c83', '#101b24'],
      neptune: ['#809bb6', '#3e5b80', '#101723'],
    };
    const palette = colors[planet];
    const shade = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.4, 0, x, y, radius);
    shade.addColorStop(0, palette[0]); shade.addColorStop(0.5, palette[1]); shade.addColorStop(1, palette[2]);
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.clip();
    if (planet === 'jupiter' || planet === 'venus' || planet === 'neptune') {
      ctx.strokeStyle = planet === 'jupiter' ? 'rgba(185,161,139,0.35)' : 'rgba(205,206,197,0.19)';
      ctx.lineWidth = radius * (planet === 'jupiter' ? 0.12 : 0.07);
      for (const offset of [-0.5, -0.16, 0.25, 0.56]) {
        ctx.beginPath();
        ctx.moveTo(x-radius, y+radius*offset);
        ctx.bezierCurveTo(x-radius*0.35,y+radius*(offset+0.15),x+radius*0.35,y+radius*(offset-0.1),x+radius,y+radius*(offset+0.06));
        ctx.stroke();
      }
    } else if (planet === 'mercury' || planet === 'mars') {
      ctx.fillStyle = 'rgba(39,31,32,0.25)';
      for (const [dx,dy,size] of [[-0.35,-0.22,0.22],[0.28,0.34,0.28],[0.35,-0.5,0.13]]) {
        ctx.beginPath(); ctx.arc(x+radius*dx,y+radius*dy,radius*size,0,Math.PI*2); ctx.fill();
      }
    }
  }
  ctx.restore();
}
