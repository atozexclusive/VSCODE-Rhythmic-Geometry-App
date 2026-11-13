import type { StudyLayerVoice } from './polyrhythmStudy';

// One-based hits. Source transcriptions and sound substitutions: docs/study-percussion-ensembles.md.
interface EnsemblePart {
  label: string;
  voice: StudyLayerVoice;
  hits: number[];
  accents?: number[];
  gain: number;
  tune?: number;
}
interface EnsembleScore {
  id: string;
  name: string;
  summary: string;
  description: string;
  steps: number;
  bpm: number;
  cycleBeats: 4 | 8;
  parts: EnsemblePart[];
}
const sixteenths = Array.from({ length: 16 }, (_, i) => i + 1);
const eighths32 = Array.from({ length: 16 }, (_, i) => i * 2 + 1);
const samba: EnsemblePart[] = [
  { label: 'Surdo 1 · low', voice: 'kick', hits: [5, 13], gain: 0.15, tune: -3 },
  { label: 'Surdo 2 · high', voice: 'tom', hits: [1, 9], gain: 0.12, tune: -7 },
  { label: 'Caixa', voice: 'snare', hits: [1, 4, 5, 7, 9, 11, 13], gain: 0.065 },
  { label: 'Ganzá', voice: 'shaker', hits: sixteenths, accents: [3, 7, 11, 15], gain: 0.045 },
  { label: 'Tamborim', voice: 'wood-block', hits: [1, 3, 4, 7, 8, 9, 11, 12, 15, 16], gain: 0.065, tune: 3 },
];
const son: EnsemblePart[] = [
  { label: 'Son clave · 2–3', voice: 'clave', hits: [5, 9, 17, 23, 29], gain: 0.085 },
  { label: 'Cáscara · 2–3', voice: 'cascara', hits: [1, 5, 9, 11, 15, 17, 21, 23, 27, 31], gain: 0.065 },
  { label: 'Conga · open', voice: 'tom', hits: [13, 15, 29, 31], gain: 0.105, tune: 3 },
  { label: 'Conga · slap', voice: 'snare', hits: [5, 21], gain: 0.055, tune: 4 },
  { label: 'Conga · touch', voice: 'tom', hits: [1, 3, 7, 9, 11, 17, 19, 23, 25, 27], gain: 0.03, tune: 5 },
  { label: 'Shaker', voice: 'shaker', hits: eighths32, accents: [1, 9, 17, 25], gain: 0.045 },
];
export const STUDY_PERCUSSION_ENSEMBLE_SCORES: EnsembleScore[] = [
  { id: 'ensemble-samba-foundation', name: 'Samba · First Ensemble', summary: 'Alternating surdos, caixa, ganzá, and tamborim.',
    description: 'Brazilian samba teaching arrangement from Inspire-works Lesson 1. Two surdos alternate around caixa, ganzá and tamborim. Drum and wood-block voices approximate the source instruments; timing is quantized.',
    steps: 16, bpm: 100, cycleBeats: 4, parts: samba },
  { id: 'ensemble-samba-surdo-three', name: 'Samba · Three Surdos', summary: 'A third surdo adds a syncopated answering part.',
    description: 'The same samba teaching ensemble with the third-surdo part from Inspire-works Lesson 3. This is a classroom arrangement, not a transcription of a particular samba school. Tuned drums stand in for surdos.',
    steps: 16, bpm: 108, cycleBeats: 4, parts: [...samba,
      { label: 'Surdo 3 · cutting', voice: 'tom', hits: [1, 5, 6, 9, 13, 14, 15, 16], gain: 0.08, tune: -1 }] },
  { id: 'ensemble-son-23', name: 'Son · Marcha 2–3', summary: 'Son clave, cáscara, conga marcha, and shaker.',
    description: 'An educational son-style combination: 2–3 son clave and cáscara with basic conga marcha and shaker. Open, slap and touch strokes are separated into layers. Tom/snare voices are sound substitutes; this is not a complete traditional son ensemble.',
    steps: 32, bpm: 104, cycleBeats: 8, parts: son },
  { id: 'ensemble-son-32', name: 'Son · Marcha 3–2', summary: 'The son study turned into the opposite clave direction.',
    description: 'The complete 2–3 study rotated by one bar, preserving every part’s relationship to clave. 3–2 son clave, cáscara, conga marcha and shaker; synthesized substitutes are used for conga articulations.',
    steps: 32, bpm: 104, cycleBeats: 8, parts: son.map(part => ({ ...part,
      label: part.label.replace('2–3', '3–2'), hits: part.hits.map(step => (step - 1 + 16) % 32 + 1).sort((a, b) => a - b),
      accents: part.accents?.map(step => (step - 1 + 16) % 32 + 1).sort((a, b) => a - b),
    })) },
  { id: 'ensemble-bembe-pulse', name: 'Bembé · Bell & Cross-Rhythm', summary: 'Seven bell strokes against four pulses and six counter-pulses.',
    description: 'The standard seven-stroke 12-pulse bell timeline, with an educational four-against-six drum study. Bell spacing follows 2–2–1–2–2–2–1. Supporting parts are a counting arrangement, not a ritual Bembé drum transcription. Four quarter-note controls represent four dotted-quarter pulses here.',
    steps: 12, bpm: 88, cycleBeats: 4, parts: [
      { label: 'Bell · timeline', voice: 'cowbell', hits: [1, 3, 5, 6, 8, 10, 12], gain: 0.085 },
      { label: 'Four-pulse drum', voice: 'tom', hits: [1, 4, 7, 10], gain: 0.10, tune: -7 },
      { label: 'Six-pulse drum', voice: 'tom', hits: [1, 3, 5, 7, 9, 11], gain: 0.07, tune: 3 },
      { label: 'Shaker · pulses', voice: 'shaker', hits: Array.from({ length: 12 }, (_, i) => i + 1), accents: [1, 4, 7, 10], gain: 0.04 },
    ] },
  { id: 'ensemble-bossa-nova', name: 'Bossa Nova · Percussion', summary: 'Two-bar cross-stick, soft bass drum, and eighth-note hats.',
    description: 'Mark Kelso’s basic bossa nova drum-set ostinato: cross-stick across two bars, a repeated bass-drum foundation and eighth-note hats. This is a Brazilian drum-set adaptation. Wood Block substitutes for cross-stick; it is not a Cuban clave part.',
    steps: 32, bpm: 112, cycleBeats: 8, parts: [
      { label: 'Bass drum', voice: 'kick', hits: [1, 7, 9, 15, 17, 23, 25, 31], gain: 0.11 },
      { label: 'Cross-stick', voice: 'wood-block', hits: [1, 7, 13, 21, 27], gain: 0.065, tune: -4 },
      { label: 'Hi-hat', voice: 'hi-hat', hits: eighths32, gain: 0.045 },
    ] },
];
