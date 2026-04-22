export type SiteModeId = 'orbital' | 'polyrhythm-study' | 'riff-cycle-study';

export interface SiteModeCard {
  id: SiteModeId;
  name: string;
  eyebrow: string;
  summary: string;
  description: string;
  details: string[];
  bestFor: string;
  firstMove: string;
  accent: string;
  image: string;
  imagePosition?: string;
  launchLabel: string;
}

export const SITE_MODE_CARDS: SiteModeCard[] = [
  {
    id: 'orbital',
    name: 'Orbits',
    eyebrow: 'Moving Visual Instrument',
    summary: 'Set the constraints and watch the structure appear.',
    description:
      'Orbits is the original surface. Pulse, spacing, and direction turn into moving form and clear visual rhythm.',
    details: [
      'Best first stop if you are new',
      'Strongest for motion, scenes, and presentation',
      'The quickest way to feel the system',
    ],
    bestFor: 'Motion, discovery, and first impression',
    firstMove: 'Load a scene, press Play, then try Random.',
    accent: '#00FFAA',
    image: '/scene-captures/website_standard_replacement.png',
    imagePosition: '50% 50%',
    launchLabel: 'Enter Orbits',
  },
  {
    id: 'polyrhythm-study',
    name: 'Polyrhythm Study',
    eyebrow: 'Shared-Loop Rhythm Study',
    summary: 'Hear where rhythms meet on one loop.',
    description:
      'Polyrhythm Study makes rhythm relationships visible. Start with one ring or a clean 3:5, then hear how the layers line up.',
    details: [
      'Best for learning and comparison',
      'Starts simple and stays readable',
      'Focused ring editing when you want close control',
    ],
    bestFor: 'Polyrhythms, overlap, and rhythm clarity',
    firstMove: 'Start with 3:5, press Play, then edit one ring.',
    accent: '#7FD7FF',
    image: '/scene-captures/website_study_mode.png',
    imagePosition: '50% 46%',
    launchLabel: 'Open Polyrhythm Study',
  },
  {
    id: 'riff-cycle-study',
    name: 'Riff Cycle',
    eyebrow: 'Groove Writing Surface',
    summary: 'Write a phrase inside a bar frame.',
    description:
      'Riff Cycle keeps the bar, phrase, and ending distinct so the groove stays clear while you write and reshape it.',
    details: [
      'Built for groove writing without losing visual clarity',
      'Learn the techniques bands like Meshuggah use to create endless polymetric rhythms.',
      'Focused pattern editing for close work',
    ],
    bestFor: 'Groove writing and visualization',
    firstMove: 'Load a scene, press Play, then change one step in the riff.',
    accent: '#FFD166',
    image: '/scene-captures/website_riff_mode.png',
    imagePosition: '50% 42%',
    launchLabel: 'Open Riff Cycle',
  },
];

export function getModeLaunchHref(mode: SiteModeId): string {
  return `/app?mode=${mode}`;
}
