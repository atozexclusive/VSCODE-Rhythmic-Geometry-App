import type { GeometryMode } from './geometry';

export interface PlanetaryBody {
  name: string;
  period: number;
  unit: 'days' | 'years' | 'hours';
  color: string;
}

export interface PlanetarySceneDefinition {
  id: string;
  name: string;
  group: 'Planets' | 'Moons' | 'Experiments';
  description: string;
  bodies: PlanetaryBody[];
  /** Periods, not revolution counts: the smaller number moves faster. */
  counts: number[];
  model: 'Rounded periods' | 'Simple approximation' | 'Idealized resonance' | 'Experimental';
  note: string;
  source: string;
  geometryMode?: GeometryMode;
  directions?: Array<1 | -1>;
}

const planets = 'https://ssd.jpl.nasa.gov/planets/phys_par.html';
const jupiterMoons = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/joviansatfact.html';
const saturnMoons = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturniansatfact.html';
const mercury: PlanetaryBody = { name: 'Mercury', period: 0.2408467, unit: 'years', color: '#B9C4D2' };
const venus: PlanetaryBody = { name: 'Venus', period: 0.61519726, unit: 'years', color: '#FFD38B' };
const earth: PlanetaryBody = { name: 'Earth', period: 1.0000174, unit: 'years', color: '#6CC8FF' };
const mars: PlanetaryBody = { name: 'Mars', period: 1.8808476, unit: 'years', color: '#FF8A78' };
const jupiter: PlanetaryBody = { name: 'Jupiter', period: 11.862615, unit: 'years', color: '#EABDA0' };
const saturn: PlanetaryBody = { name: 'Saturn', period: 29.447498, unit: 'years', color: '#FFD166' };
const uranus: PlanetaryBody = { name: 'Uranus', period: 84.016846, unit: 'years', color: '#8EE5DA' };
const neptune: PlanetaryBody = { name: 'Neptune', period: 164.79132, unit: 'years', color: '#799AFF' };
const pluto: PlanetaryBody = { name: 'Pluto', period: 247.92065, unit: 'years', color: '#D3ADFF' };
const io: PlanetaryBody = { name: 'Io', period: 1.769138, unit: 'days', color: '#FFD166' };
const europa: PlanetaryBody = { name: 'Europa', period: 3.551181, unit: 'days', color: '#A9E5FF' };
const ganymede: PlanetaryBody = { name: 'Ganymede', period: 7.154553, unit: 'days', color: '#C4A6FF' };
const callisto: PlanetaryBody = { name: 'Callisto', period: 16.689017, unit: 'days', color: '#86DDBB' };

// Source periods remain visible in the library. Integer timing is intentional:
// the engine creates repeating musical drawings, rather than an ephemeris.
export const PLANETARY_SCENES: PlanetarySceneDefinition[] = [
  { id: 'planetary_venus_earth', name: 'Venus & Earth', group: 'Planets', bodies: [venus, earth], counts: [8, 13], model: 'Simple approximation', description: 'The familiar five-petal dance of our two neighboring worlds.', note: 'Venus makes about 13 turns while Earth makes 8. The 8:13 period ratio closes the drawing; the real planets slowly drift.', source: planets },
  { id: 'planetary_earth_mars', name: 'Earth & Mars', group: 'Planets', bodies: [earth, mars], counts: [8, 15], model: 'Simple approximation', description: 'Two neighboring planets weave a seven-fold return.', note: 'Earth makes 15 turns while Mars makes 8 in this compact approximation of their orbital periods.', source: planets },
  { id: 'planetary_venus_mars', name: 'Venus & Mars', group: 'Planets', bodies: [venus, mars], counts: [18, 55], model: 'Simple approximation', description: 'A fast golden world and a slow red world weave a delicate web.', note: 'Venus makes 55 turns for 18 Mars turns in this close approximation. The real periods are about 0.615 and 1.881 Earth years.', source: planets },
  { id: 'planetary_mercury_earth', name: 'Mercury & Earth', group: 'Planets', bodies: [mercury, earth], counts: [6, 25], model: 'Simple approximation', description: 'A quick inner world draws a fine nineteen-fold web.', note: 'Mercury makes 25 turns for 6 Earth turns here. Its real period is about 0.241 Earth years.', source: planets },
  { id: 'planetary_jupiter_saturn', name: 'Jupiter & Saturn', group: 'Planets', bodies: [jupiter, saturn], counts: [2, 5], model: 'Simple approximation', description: 'The gas giants meet in a broad, three-fold dance.', note: 'Their periods are close to 2:5, not exactly resonant. This musical approximation repeats after 5 Jupiter turns and 2 Saturn turns.', source: planets },
  { id: 'planetary_uranus_neptune', name: 'Uranus & Neptune', group: 'Planets', bodies: [uranus, neptune], counts: [51, 100], model: 'Simple approximation', description: 'Distant ice giants trace a dense, slow-changing lattice.', note: 'The 51:100 period ratio closely approximates 84.017 and 164.791 years. These planets are not in an exact 1:2 resonance.', source: planets },
  { id: 'planetary_neptune_pluto', name: 'Neptune & Pluto', group: 'Planets', bodies: [neptune, pluto], counts: [2, 3], model: 'Idealized resonance', description: 'Three Neptune turns for two turns of the dwarf planet.', note: 'An idealized view of the real 3:2 mean-motion resonance. Circular paths and aligned starts simplify the actual orbital geometry.', source: 'https://science.nasa.gov/solar-system/kuiper-belt/facts/' },
  { id: 'planetary_earth_mars_days', name: 'Earth & Mars · Closer Look', group: 'Planets', bodies: [earth, mars], counts: [365, 687], model: 'Rounded periods', description: 'A more precise ratio reveals a much longer, intricate return.', note: 'One master beat represents roughly one day: Earth 365, Mars 687. Rounded to whole days; this long drawing does not close quickly.', source: planets },
  { id: 'planetary_inner_trio', name: 'Venus · Earth · Mars', group: 'Planets', bodies: [venus, earth, mars], counts: [225, 365, 687], model: 'Rounded periods', description: 'Three real orbital periods build a slowly evolving tapestry.', note: 'Periods rounded to Earth days, with all three traveling in the same direction. The full shared return is very long; the evolving detail is the point.', source: planets },
  { id: 'planetary_inner_four', name: 'The Inner Worlds', group: 'Planets', bodies: [mercury, venus, earth, mars], counts: [88, 225, 365, 687], model: 'Rounded periods', description: 'Mercury joins Venus, Earth, and Mars in a four-world ensemble.', note: 'Whole-day periods preserve the relative speeds closely. Orbit spacing is composed for readability, not physical distance.', source: planets },
  { id: 'planetary_galilean', name: 'Io · Europa · Ganymede', group: 'Moons', bodies: [io, europa, ganymede], counts: [1, 2, 4], model: 'Idealized resonance', description: 'Jupiter’s famous four–two–one moon rhythm.', note: 'Io turns four times, Europa twice, and Ganymede once. The idealized 1:2:4 period ratio makes the Laplace resonance easy to see; measured periods differ slightly.', source: jupiterMoons },
  { id: 'planetary_galilean_four', name: 'Four Moons of Jupiter', group: 'Moons', bodies: [io, europa, ganymede, callisto], counts: [106, 213, 429, 1000], model: 'Simple approximation', description: 'Callisto adds a long, wandering voice to the inner moon trio.', note: 'Periods scaled so Callisto is 1000, then rounded. Callisto is not part of the inner three moons’ Laplace resonance.', source: jupiterMoons },
  { id: 'planetary_mars_moons', name: 'Phobos & Deimos', group: 'Moons', bodies: [{ name: 'Phobos', period: 7.66, unit: 'hours', color: '#B4BDC9' }, { name: 'Deimos', period: 30.3, unit: 'hours', color: '#E1B796' }], counts: [19, 75], model: 'Simple approximation', description: 'Mars’s little moons sketch an almost four-to-one pattern.', note: 'The 19:75 period ratio approximates 7.66 and 30.3 hours. It is near 1:4, not an exact resonance.', source: 'https://science.nasa.gov/mars/moons/facts/' },
  { id: 'planetary_saturn_moons', name: 'Enceladus & Dione', group: 'Moons', bodies: [{ name: 'Enceladus', period: 1.370218, unit: 'days', color: '#AEEDFF' }, { name: 'Dione', period: 2.736915, unit: 'days', color: '#F0CBFF' }], counts: [1, 2], model: 'Idealized resonance', description: 'An icy pair keeps a simple two-to-one pulse.', note: 'An idealized 1:2 period ratio: Enceladus completes two turns for each Dione turn. The measured periods are shown below.', source: saturnMoons },
  { id: 'planetary_moon_interference', name: 'Laplace Bloom', group: 'Experiments', bodies: [io, europa, ganymede], counts: [1, 2, 4], model: 'Experimental', geometryMode: 'interference-trace', description: 'The moon resonance becomes a luminous interference flower.', note: 'Uses the idealized Galilean period ratio, but combines all three moving positions into an artistic curve. This is a drawing experiment, not the moons’ physical paths.', source: jupiterMoons },
  { id: 'planetary_reversed_trio', name: 'Mirror Solar System', group: 'Experiments', bodies: [venus, earth, mars], counts: [8, 13, 24], directions: [-1, 1, -1], model: 'Experimental', description: 'Three worlds counter-rotate into an intricate celestial web.', note: 'A deliberately altered 8:13:24 approximation with Venus and Mars reversed. Real orbital directions are not represented; Venus’s retrograde spin is not retrograde orbital motion.', source: planets },
  { id: 'planetary_ice_interference', name: 'Ice Giant Echo', group: 'Experiments', bodies: [uranus, neptune, pluto], counts: [17, 33, 50], model: 'Experimental', geometryMode: 'interference-trace', description: 'Three distant worlds sculpt a densely folded interference curve.', note: 'Rounded 17:33:50 periods loosely follow Uranus, Neptune, and Pluto. Their positions are blended into a drawing, not a physical orbit simulation.', source: planets },
];
