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
  alt: string;
  imagePosition?: string;
  launchLabel: string;
}

export const SITE_MODE_CARDS: SiteModeCard[] = [
  {
    id: 'orbital',
    name: 'Orbit',
    eyebrow: 'See rhythm as motion.',
    summary: 'Every ratio becomes a path. Every cycle leaves a shape.',
    description:
      'Two cycles rotating in time. As they repeat, their relationship traces a pattern - a geometric memory of the rhythm itself.',
    details: [
      'Every ratio becomes a path.',
      'Every cycle leaves a shape.',
    ],
    bestFor: 'Seeing rhythm as motion.',
    firstMove: 'Set a simple ratio and press Play.',
    accent: '#00FFAA',
    image: '/scene-captures/website_standard_replacement.png',
    alt: 'Rotating cycles forming evolving geometric patterns from rhythmic ratios',
    imagePosition: '50% 50%',
    launchLabel: 'Enter Orbit',
  },
  {
    id: 'polyrhythm-study',
    name: 'Study',
    eyebrow: 'See how rhythms align.',
    summary: 'Where do the pulses agree? Where do they drift apart?',
    description:
      'Break rhythm into shared structure. Visualize how cycles meet, divide, and resolve - revealing the hidden framework behind polyrhythm.',
    details: [
      'Where do the pulses agree?',
      'Where do they drift apart?',
    ],
    bestFor: 'Seeing how rhythms align.',
    firstMove: 'Start with two layers and watch where they meet.',
    accent: '#7FD7FF',
    image: '/scene-captures/website_study_mode.png',
    alt: 'Grid-based visualization showing alignment points and shared cycles in polyrhythms',
    imagePosition: '50% 46%',
    launchLabel: 'Open Study',
  },
  {
    id: 'riff-cycle-study',
    name: 'Riff',
    eyebrow: 'Build rhythm as structure.',
    summary: 'Not just what you play - but how it cycles.',
    description:
      'Write and explore patterns through time. Shape grooves, displace accents, and feel how structure evolves when rhythm becomes a system instead of a loop.',
    details: [
      'Not just what you play -',
      'but how it cycles.',
    ],
    bestFor: 'Building rhythm as structure.',
    firstMove: 'Write a pattern, then let it cycle through time.',
    accent: '#FFD166',
    image: '/scene-captures/website_riff_mode.png',
    alt: 'Interactive rhythm sequencer visualizing complex patterns and polymetric structures',
    imagePosition: '50% 42%',
    launchLabel: 'Start Riff',
  },
];

export function getModeLaunchHref(mode: SiteModeId): string {
  return `/app?mode=${mode}`;
}
