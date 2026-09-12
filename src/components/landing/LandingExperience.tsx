import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, CircleDot, GalleryVerticalEnd, Layers3, Menu, Minus, Plus, SquarePlay, UserRound, X } from 'lucide-react';
import { SITE_MODE_CARDS, getModeLaunchHref, type SiteModeId } from '../../lib/siteModes';
import '../../styles/landing-experience.css';

function deliveryImage(image: string) {
  return image.startsWith('/scene-captures/website_')
    ? image.replace('/scene-captures/', '/landing-media/').replace('.png', '.webp')
    : image;
}

const navigation = [
  { label: 'Modes', href: '#modes' },
  { label: 'Showcase', href: '#showcase' },
  { label: 'What Is It?', href: '/how-it-works' },
  { label: 'Tools', href: '#tools' },
  { label: 'Pro', href: '#pro' },
];

// Presentation-only scene data. Keep these destinations aligned with the built-in scene IDs.
const scenes = [
  { id: 'prime_ritual', name: 'Prime Ritual', description: 'Prime pulse counts and darker modal tension for denser lattices.', image: '/scene-captures/website_prime_ritual.png', framing: [1200, 1027, 621.5, 514.5, 848] },
  { id: 'rose_engine', name: 'Rose Engine', description: 'Floral interference with soft chromatic tension and layered radii.', image: '/scene-captures/website_rose_engine.png', framing: [1200, 1124, 585.5, 565.5, 890] },
  { id: 'blue_mandala', name: 'Blue Mandala', description: 'A contemplative, slower field tuned for dense circular memory.', image: '/scene-captures/blue_mandala.jpg', framing: [1572, 1300, 787.5, 586.5, 978] },
  { id: 'metallic_whorl', name: 'Metallic Whorl', description: 'Sharper rotational density with whole-tone shimmer and bright outer spokes.', image: '/scene-captures/website_metallic_whorl.png', framing: [1200, 1207, 612, 597.5, 928] },
];

function SceneShowcase() {
  const [activeScene, setActiveScene] = useState(0);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const rotating = !keyboardFocused && !hovered && inView && pageVisible && !reducedMotion;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(preference.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    if (showcaseRef.current) observer.observe(showcaseRef.current);
    preference.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    updateVisibility();
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => setActiveScene((current) => (current + 1) % scenes.length), 5000);
    return () => window.clearTimeout(timer);
  }, [rotating, activeScene]);

  function changeScene(direction: number) {
    setActiveScene((current) => (current + direction + scenes.length) % scenes.length);
  }

  return (
    <div ref={showcaseRef} className="rg-showcase-player" role="region" aria-roledescription="carousel" aria-label="Featured scenes"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => setKeyboardFocused(event.target.matches(':focus-visible'))}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocused(false); }}>
      <div className="rg-showcase-stage" aria-live={rotating ? 'off' : 'polite'}>
        {scenes.map((scene, index) => (
          <div key={scene.id} className={`rg-showcase-slide${index === activeScene ? ' is-active' : ''}`} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${scenes.length}`} aria-hidden={index !== activeScene} inert={index !== activeScene}>
            <a className="rg-showcase-art" href={`/app?mode=orbital&scene=${scene.id}`} aria-label={`Open ${scene.name}`}>
              <img src={deliveryImage(scene.image)} alt={scene.name} loading="lazy" decoding="async" style={{
                // Match the geometry, not the differently padded source-image rectangles.
                width: `${70 * scene.framing[0] / scene.framing[4]}%`,
                transform: `translate(${-100 * scene.framing[2] / scene.framing[0]}%, ${-100 * scene.framing[3] / scene.framing[1]}%)`,
              }} />
            </a>
            <div className="rg-showcase-caption"><h3>{scene.name}</h3><p>{scene.description}</p><a className="rg-text-link" href={`/app?mode=orbital&scene=${scene.id}`}>Open Scene<ArrowUpRight size={17} /></a></div>
          </div>
        ))}
      </div>
      <div className="rg-showcase-controls">
        <button type="button" className="rg-icon-button" aria-label="Previous scene" onClick={() => changeScene(-1)}><ArrowLeft size={18} /></button>
        <span aria-hidden="true">{activeScene + 1} / {scenes.length}</span>
        <button type="button" className="rg-icon-button" aria-label="Next scene" onClick={() => changeScene(1)}><ArrowRight size={18} /></button>
      </div>
    </div>
  );
}

const features = [
  { title: 'Scene Library', text: 'Built-in scenes give Orbits, Polyrhythm Study, and Riff Cycle a strong starting point instead of a blank canvas.', image: '/landing-media/tool-library.png', caption: 'Browse real scenes and load a starting point.', href: '/scenes', action: 'Explore the library' },
  { title: 'Focused Editors', text: 'Shape individual steps, build phrases with Cell Sequencer, and assign sounds with Voices. Move from one pattern to a connected sequence.', image: '/landing-media/tool-editor.png', caption: 'Edit steps, arrange cells, and choose voices for your rhythm.', href: getModeLaunchHref('riff-cycle-study'), action: 'Start Riff' },
  { title: 'Sound Options', text: 'Shape the sound as well as the pattern. Pro sound controls include palettes, key and note order, register, octave, and reverb, with layer-by-layer mixing.', image: '/landing-media/tool-sound.png', caption: 'The audio mixer: separate controls for riff, meter, and subdivisions.', href: getModeLaunchHref('riff-cycle-study'), action: 'Explore sound in Riff' },
  { title: 'Loop Capture', text: 'Record short moving studies directly from the live canvas. Image and motion export are included with Pro.', image: '/landing-media/tool-export.png', caption: 'Choose image size, clip length, and video format.', href: getModeLaunchHref('polyrhythm-study'), action: 'Open Study' },
  { title: 'Fullscreen View', text: 'Hide extra controls so the pattern is easier to watch or record.', image: '/scene-captures/website_standard_replacement.png', caption: 'Orbit / Focus on the motion', href: getModeLaunchHref('orbital'), action: 'Enter Orbit' },
];

const planComparison = [
  { feature: 'Orbit, Study, Riff', free: 'Included', pro: 'Included' },
  { feature: 'Built-in scenes', free: 'Standard', pro: 'Standard + premium' },
  { feature: 'Step editing', free: 'Included', pro: 'Included' },
  { feature: 'Cell Sequencer', free: 'Not included', pro: 'Included' },
  { feature: 'Voices', free: 'Not included', pro: 'Included' },
  { feature: 'Advanced sound controls', free: 'Basic mix', pro: 'Included' },
  { feature: 'Personal scene saving', free: 'Not included', pro: 'Included' },
  { feature: 'Image + video export', free: 'Not included', pro: 'Included' },
  { feature: 'Random+', free: 'Not included', pro: 'Included' },
];

const toolImageSizes: Record<string, { width: number; height: number }> = {
  '/landing-media/tool-library.png': { width: 448, height: 704 },
  '/landing-media/tool-editor.png': { width: 634, height: 402 },
  '/landing-media/tool-sound.png': { width: 297, height: 366 },
  '/landing-media/tool-export.png': { width: 448, height: 540 },
  '/scene-captures/website_standard_replacement.png': { width: 1199, height: 1034 },
};

function FeatureVisual({ feature, mobile = false }: { feature: typeof features[number]; mobile?: boolean }) {
  return <figure className={`rg-feature-visual ${mobile ? 'rg-feature-visual-mobile' : 'rg-feature-visual-desktop'}`}><div className="rg-feature-picture"><img src={deliveryImage(feature.image)} {...toolImageSizes[feature.image]} alt={feature.caption} loading="lazy" decoding="async" /></div><figcaption>{feature.caption}</figcaption></figure>;
}

function ModeIcon({ id, size = 18 }: { id: SiteModeId; size?: number }) {
  if (id === 'orbital') return <CircleDot size={size} aria-hidden="true" />;
  if (id === 'polyrhythm-study') return <Layers3 size={size} aria-hidden="true" />;
  return <SquarePlay size={size} aria-hidden="true" />;
}

const mobileModeDescriptions: Record<SiteModeId, string> = {
  orbital: 'Watch repeating cycles trace geometric patterns.',
  'polyrhythm-study': 'See where layered rhythms meet and align.',
  'riff-cycle-study': 'Build grooves, shift accents, and connect patterns.',
};

type LandingExperienceProps = {
  isPro: boolean;
  isSignedIn: boolean;
  onAccountOpen: () => void;
};

export function LandingExperience({ isPro, isSignedIn, onAccountOpen }: LandingExperienceProps) {
  const [activeModeId, setActiveModeId] = useState<SiteModeId>('orbital');
  const [activeFeature, setActiveFeature] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const landingRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const modeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeMode = SITE_MODE_CARDS.find((mode) => mode.id === activeModeId) ?? SITE_MODE_CARDS[0];
  const feature = features[activeFeature];

  useEffect(() => {
    const root = landingRef.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!root || preference.matches || !('IntersectionObserver' in window)) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>('main > .rg-section'));
    // Include The Instrument so the hero-to-instrument transition reveals on scroll.
    const revealSections = sections;
    const revealTargets = new Map<Element, HTMLElement>();
    const reveal = (section: HTMLElement) => {
      section.classList.remove('rg-reveal-pending');
      observer.unobserve(section.querySelector('h2') ?? section);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const section = revealTargets.get(entry.target);
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35 && section) reveal(section);
      });
    }, { threshold: 0.35, rootMargin: `0px 0px -${Math.min(240, Math.round(window.innerHeight * 0.3))}px 0px` });
    const finish = (event: TransitionEvent) => {
      if (event.propertyName === 'opacity' && event.target instanceof HTMLElement && !event.target.classList.contains('rg-reveal-pending')) {
        event.target.classList.remove('rg-scroll-reveal');
      }
    };
    const revealFocused = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const section = event.target.closest<HTMLElement>('.rg-scroll-reveal');
      if (section) {
        reveal(section);
        section.classList.remove('rg-scroll-reveal');
      }
    };
    const revealAll = () => {
      if (!preference.matches) return;
      observer.disconnect();
      sections.forEach((section) => section.classList.remove('rg-scroll-reveal', 'rg-reveal-pending'));
    };
    // Reveal from the actual heading, not the section's empty top padding.
    // The opening hero animates separately; later sections wait for scrolling.
    revealSections.forEach((section) => {
      if (section.getBoundingClientRect().bottom <= 0) return;
      section.classList.add('rg-scroll-reveal', 'rg-reveal-pending');
      const target = section.querySelector('h2') ?? section;
      revealTargets.set(target, section);
      observer.observe(target);
    });
    root.addEventListener('transitionend', finish);
    root.addEventListener('focusin', revealFocused);
    preference.addEventListener('change', revealAll);
    return () => {
      observer.disconnect();
      root.removeEventListener('transitionend', finish);
      root.removeEventListener('focusin', revealFocused);
      preference.removeEventListener('change', revealAll);
      sections.forEach((section) => section.classList.remove('rg-scroll-reveal', 'rg-reveal-pending', 'rg-opening-reveal'));
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target) && !menuButtonRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('keydown', dismiss);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('pointerdown', outside);
    };
  }, [menuOpen]);

  return (
    <div className="rg-experience" ref={landingRef}>
      <a className="rg-skip" href="#hero">Skip to content</a>
      <div className="rg-site-frame">
        <header className="rg-site-header">
          <a className="rg-wordmark" href="/">Rhythmic Geometry™</a>
          <nav className="rg-desktop-nav" aria-label="Primary navigation">
            {navigation.map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}
          </nav>
          <div className="rg-header-actions">
            <a className="rg-icon-button rg-library-link" href="/scenes" aria-label="Scene Library" title="Scene Library"><GalleryVerticalEnd size={17} /></a>
            <button type="button" className="rg-account-button" onClick={onAccountOpen} aria-label={isSignedIn ? 'Account' : 'Sign In'}><UserRound size={16} /><span>{isSignedIn ? 'Account' : 'Sign In'}</span></button>
            <a className="rg-header-see" href="#modes">See Modes</a>
            <a className="rg-button rg-header-launch rg-desktop-launch" href={getModeLaunchHref('orbital')}>Launch <ArrowUpRight size={14} /></a>
            <a className="rg-button rg-header-launch rg-mobile-launch" href={getModeLaunchHref('orbital')}>Launch <ArrowUpRight size={14} /></a>
            <button type="button" ref={menuButtonRef} className="rg-icon-button rg-menu-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="landing-navigation" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
          {menuOpen && <nav ref={menuRef} id="landing-navigation" className="rg-mobile-nav" aria-label="Mobile navigation">
            {navigation.map((item) => <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}<ArrowUpRight size={16} /></a>)}
            <a href="/scenes" onClick={() => setMenuOpen(false)}>Scene Library<GalleryVerticalEnd size={16} /></a>
          </nav>}
        </header>

        <main>
          <section id="hero" className="rg-hero rg-opening-reveal" style={{ '--mode-accent': activeMode.accent } as CSSProperties}>
            <div className="rg-hero-light" aria-hidden="true" />
            <div className="rg-hero-art" aria-hidden="true">
              {SITE_MODE_CARDS.map((mode, index) => <img key={mode.id} data-mode={mode.id} src={deliveryImage(mode.image)} alt="" className={activeModeId === mode.id ? 'is-active' : ''} loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} decoding="async" />)}
            </div>
            <div className="rg-hero-content">
              <p className="rg-eyebrow">See the structure inside rhythm</p>
              <h1><span>Rhythm</span> Visualized<br />Through <span>Geometry</span></h1>
              <p className="rg-hero-intro">A moving visual instrument for exploring rhythm as structure.</p>
              <div className="rg-mode-picker" role="tablist" aria-label="Choose a rhythm mode">
                {SITE_MODE_CARDS.map((mode, index) => <button
                  key={mode.id}
                  ref={(element) => { modeRefs.current[index] = element; }}
                  id={`mode-tab-${mode.id}`}
                  type="button"
                  role="tab"
                  aria-selected={mode.id === activeModeId}
                  aria-controls="mode-preview"
                  tabIndex={mode.id === activeModeId ? 0 : -1}
                  className={mode.id === activeModeId ? 'is-active' : ''}
                  style={{ '--tab-accent': mode.accent } as CSSProperties}
                  onClick={() => setActiveModeId(mode.id)}
                  onKeyDown={(event) => {
                    let next = index;
                    if (event.key === 'ArrowRight') next = (index + 1) % SITE_MODE_CARDS.length;
                    else if (event.key === 'ArrowLeft') next = (index + SITE_MODE_CARDS.length - 1) % SITE_MODE_CARDS.length;
                    else if (event.key === 'Home') next = 0;
                    else if (event.key === 'End') next = SITE_MODE_CARDS.length - 1;
                    else return;
                    event.preventDefault();
                    setActiveModeId(SITE_MODE_CARDS[next].id);
                    modeRefs.current[next]?.focus();
                  }}
                ><ModeIcon id={mode.id} /><span>{mode.name}</span></button>)}
              </div>
              <div id="mode-preview" className="rg-mode-preview" role="tabpanel" aria-labelledby={`mode-tab-${activeModeId}`} tabIndex={0}>
                <p>{activeMode.eyebrow}</p>
                <a className="rg-button rg-primary-button" href={getModeLaunchHref(activeModeId)}>{activeMode.launchLabel}<ArrowUpRight size={17} /></a>
              </div>
            </div>
          </section>

          <section id="modes" className="rg-section rg-modes">
            <div className="rg-section-heading rg-centered">
              <p className="rg-eyebrow rg-section-badge">The Instrument</p>
              <h2>One <span className="rg-instrument-accent">instrument.</span><br />Three ways to see <span className="rg-rhythm-accent">rhythm.</span></h2>
              <p>Set simple ratios. Watch them unfold in motion, pattern, and form.</p>
            </div>
            <div className="rg-mode-columns">
              {SITE_MODE_CARDS.map((mode) => <article key={mode.id} className="rg-mode-column" style={{ '--mode-accent': mode.accent } as CSSProperties}>
                <div className="rg-mode-title"><ModeIcon id={mode.id} /><h3>{mode.name}</h3></div>
                <a href={getModeLaunchHref(mode.id)} className="rg-mode-image" aria-label={mode.launchLabel}><img src={deliveryImage(mode.image)} alt={mode.alt} loading="lazy" decoding="async" /></a>
                <div className="rg-mode-description"><h4>{mode.eyebrow}</h4><p className="rg-mode-copy-desktop">{mode.description}</p><p className="rg-mode-copy-mobile">{mobileModeDescriptions[mode.id]}</p><a className="rg-text-link" href={getModeLaunchHref(mode.id)}>{mode.launchLabel}<ArrowRight size={15} /></a></div>
              </article>)}
            </div>
          </section>

          <section className="rg-philosophy rg-section" aria-labelledby="philosophy-heading">
            <p className="rg-eyebrow rg-section-badge">Why it works</p>
            <h2 id="philosophy-heading"><span className="rg-statement-green">Rhythm is ratio.</span><br /><span className="rg-statement-blue">Ratio creates motion.</span><br /><span className="rg-statement-gold">Motion forms geometry.</span></h2>
            <div className="rg-philosophy-copy"><p>What you hear... is structure unfolding in time.</p><a href="/how-it-works" className="rg-button rg-philosophy-button">See How It Works<ArrowUpRight size={16} /></a></div>
          </section>

          <section id="tools" className="rg-section rg-tools">
            <div className="rg-tools-copy">
              <div className="rg-section-heading"><p className="rg-eyebrow rg-section-badge">Tools</p><h2>From a first idea<br />to a finished study.</h2><p>Save, edit, capture, and watch fullscreen.</p></div>
              <div className="rg-feature-list">{features.map((item, index) => <div className={`rg-feature ${activeFeature === index ? 'is-active' : ''}`} key={item.title}>
                <h3><button type="button" id={`feature-trigger-${index}`} aria-expanded={activeFeature === index} aria-controls={`feature-content-${index}`} onClick={() => setActiveFeature(index)}>{item.title}{activeFeature === index ? <Minus size={17} /> : <Plus size={17} />}</button></h3>
                <div id={`feature-content-${index}`} role="region" aria-labelledby={`feature-trigger-${index}`} hidden={activeFeature !== index}><p>{item.text}</p><a href={item.href} className="rg-text-link">{item.action}<ArrowRight size={14} /></a>{activeFeature === index && <FeatureVisual feature={item} mobile />}</div>
              </div>)}</div>
            </div>
            <FeatureVisual feature={feature} />
          </section>

          <section id="showcase" className="rg-section rg-showcase">
            <div className="rg-section-heading rg-showcase-heading"><p className="rg-eyebrow rg-section-badge">Showcase</p><h2>Every rhythm<br />leaves a signature.</h2><p>Orbits scenes where moving ratios leave visible form behind.</p><a className="rg-text-link" href="/scenes">Scene Library<ArrowUpRight size={15} /></a></div>
            <SceneShowcase />
          </section>

          <section id="pro" className="rg-section rg-pro">
            <div className="rg-pro-heading"><p className="rg-eyebrow">Rhythmic Geometry Pro</p><h2>Keep the scenes<br />that matter.</h2><p>Explore all three modes for free. Unlock Pro to save your scenes, export images and videos, and build longer ideas.</p><ul className="rg-pro-highlights"><li><strong>Cell Sequencer</strong><span>Arrange patterns into connected phrases.</span></li><li><strong>Voices</strong><span>Assign sounds to shape your groove.</span></li><li><strong>Advanced sound controls</strong><span>Choose palettes, key, note order, octave, and reverb.</span></li></ul><a className="rg-button rg-pro-button" href="/launch">{isPro ? 'Choose Pro Mode' : 'Unlock Pro In App'}<ArrowUpRight size={16} /></a><small>{isPro ? 'Pro already active on this account' : 'One-time unlock inside the app'}</small></div>
            <div className="rg-plan-comparison"><table><caption>Free to explore. Pro to keep creating.</caption><thead><tr><th scope="col">What you get</th><th scope="col">Free</th><th scope="col">Pro</th></tr></thead><tbody>{planComparison.map((item) => <tr key={item.feature}><th scope="row">{item.feature}</th><td>{item.free}</td><td>{item.pro}</td></tr>)}</tbody></table></div>
          </section>

          <section className="rg-section rg-closing"><h2>Start exploring.</h2><p className="rg-eyebrow rg-closing-intro">Set the rhythm. Watch it take shape.</p><div><a className="rg-button rg-primary-button" href="#hero">Choose A Mode<ArrowUpRight size={17} /></a></div></section>
        </main>
        <footer className="rg-footer"><a className="rg-wordmark" href="/">Rhythmic Geometry™</a><p>Rhythmic Geometry™ is a trademark of Marc DeBlasie. The original rhythm geometry app.</p></footer>
      </div>
    </div>
  );
}
