import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, ChevronDown, CircleDot, Layers3, SquarePlay } from 'lucide-react';
import { SITE_MODE_CARDS, type SiteModeId, getModeLaunchHref } from '../lib/siteModes';

export const Route = createFileRoute('/how-it-works')({
  component: WhatIsRhythmicGeometryPage,
});

interface ExplanationSection {
  title: string;
  summary: string;
  accent: string;
  body: string;
}

const explanationSections: ExplanationSection[] = [
  {
    title: 'What Rhythmic Geometry Is',
    summary: 'Rhythm is not only sound. It is relationship moving through time.',
    accent: '#00ffaa',
    body: `Rhythmic Geometry is a way of seeing rhythm as structure.

A rhythm is not only a sound happening in time. It is also a relationship: one pulse against another, one cycle repeating beside another, one pattern returning at a different speed or length. When those relationships move, they create form.

At its simplest, rhythm is ratio.

Two pulses can move together, apart, across, or around each other. A 3 against 4 rhythm is not just "three notes over four notes." It is a relationship between two cycles. The ear hears that relationship as rhythm. The eye can see it as motion. Over time, that motion reveals geometry.

Rhythmic Geometry turns those relationships into a visual instrument.

Instead of treating rhythm as a flat sequence of beats, it treats rhythm as a living system. Pulses rotate. Cycles align. Patterns drift, return, and interfere. What begins as a simple ratio can unfold into a shape, a path, a grid, or a structure.

The point is not to decorate sound with visuals.

The point is to reveal what rhythm already contains.

When you hear a rhythm, you are hearing time organized by relationship. When you see that rhythm unfold visually, the hidden structure becomes visible. A groove becomes a pattern. A polyrhythm becomes a shared cycle. A repeating phrase becomes a form moving through time.

Rhythmic Geometry exists in the space between music, math, motion, and image.

It is not only a rhythm visualizer. It is a way to study how rhythm behaves. It shows how simple constraints can create complexity, how repetition can create variation, and how time can leave a shape behind.

What you hear as rhythm is structure unfolding.

Rhythmic Geometry lets you watch it happen.`,
  },
  {
    title: 'How It Works',
    summary: 'Cycles repeat, ratios set the relationship, and phase reveals the motion.',
    accent: '#88ccff',
    body: `Rhythmic Geometry begins with cycles.

A cycle is any repeating movement through time: a pulse, a beat, a phrase, a loop, a rotating point, a bar, or a pattern. When one cycle repeats by itself, it creates a steady rhythm. When two or more cycles repeat together, they create relationships.

Those relationships are where the geometry begins.

If one cycle repeats three times while another repeats four times in the same span of time, the result is not just two separate rhythms. It is a ratio: 3:4. Each cycle has its own speed, but they share the same field of time. As they move, they constantly change position relative to each other. Sometimes they align. Sometimes they separate. Sometimes they pass through tension before returning to a shared point.

That changing relationship is called phase.

Phase is the position of one cycle compared to another. Two rhythms can start together, then drift apart because their divisions are different. A 3-pulse cycle and a 4-pulse cycle will not meet on every beat, but they will eventually return to the same starting point. The path between those moments is the rhythm's behavior.

Rhythmic Geometry makes that behavior visible.

In Orbit, cycles move like rotating bodies. Their ratios determine how fast they travel and how often they return. As the cycles move, their relationship can be traced as a path. The drawing is not random decoration. It is the memory of the ratio moving through time.

In Study, cycles are placed into a shared structure. This makes it easier to see where pulses align. A 3 against 4 rhythm can be shown inside a 12-step shared cycle, because 12 is the smallest number both 3 and 4 divide into evenly. The rhythm becomes a map. The shared grid shows where each pulse lands, where the cycles agree, and where they create tension.

In Riff, rhythm becomes pattern over time. A phrase can have its own length while the bar has another. A 5-step phrase can move against a 4-beat frame. Each time the phrase repeats, it begins in a new position against the bar. Over multiple repetitions, the groove reveals a larger cycle.

This is the core idea:

Cycles repeat.
Ratios set their relationship.
Phase shows how they move against each other.
Repetition traces the form.
Shared cycles reveal where the structure resolves.

A rhythm can sound like it is simply moving forward, but underneath it is always organizing itself. It has return points, crossing points, alignments, and offsets. Rhythmic Geometry gives those invisible relationships a visible body.

It turns time into form.`,
  },
  {
    title: 'Orbit',
    summary: 'Ratios become paths when cycles move around a shared center.',
    accent: '#00ffaa',
    body: `Orbit is the most direct way to see rhythm as motion.

Each orbit is a cycle. It moves around a center point at a speed determined by its pulse count and tempo relationship. When one orbit is active, you see a single repeating motion. When multiple orbits are active, you see cycles moving beside each other, each one repeating at its own rate.

The important part is not just the circles themselves.

The important part is the relationship between them.

If one orbit completes three pulses while another completes four, the system is expressing a 3:4 ratio. If one completes five while another completes seven, the system is expressing 5:7. These numbers are not only counts. They define how the cycles move against each other.

As the orbits move, their positions are constantly changing in relation to one another. Sometimes they align. Sometimes they pull apart. Sometimes they create a feeling of tension, drift, or rotation before returning to a recognizable shape.

That relationship can be traced.

The trace is the visible memory of the rhythm. It shows where the cycles have been and how their relationship has changed over time. A simple ratio can become a flower-like form, a woven path, a rotating lattice, or a dense field of interference. The shape is not drawn by hand. It emerges from the motion.

This is why Orbit is useful for understanding polymeter and phase.

In a polymeter, different cycles repeat at different lengths while sharing the same flow of time. The ear hears the repeating tension between them. Orbit lets you see that tension as movement. You can watch one cycle return while another is still traveling. You can see how long it takes before the full relationship comes back to its starting point.

Orbit also echoes orbital motion itself. Planets moving at different speeds create changing relationships over time. When those relationships are mapped, certain ratios can form loops, petals, and repeating geometric figures. Orbit uses that same basic idea in a rhythmic space: bodies moving in cycles, ratios shaping their paths.

This also connects to phase.

Phase is the position of one cycle compared to another. Two cycles can begin together, then drift apart as they move. Their phase relationship changes continuously. Orbit makes that drift visible because each point has a position on its cycle at every moment.

It is similar in spirit to Lissajous figures, harmonographs, spirograph-like motion, and orbital resonance patterns.

Those systems create complex shapes from simple ratios of movement. A small change in ratio can produce a completely different form. The same thing happens in Orbit. A 3:4 relationship feels different from 4:5. A 5:8 relationship feels different from 7:9. The numbers define the motion, and the motion reveals the geometry.

Orbit shows that rhythm is not just counted.

It is traveled.

A ratio becomes a path.
A pulse becomes a moving point.
A repeating relationship becomes a visible form.

Orbit is where rhythm starts to look alive.`,
  },
  {
    title: 'Study',
    summary: 'Shared cycles make alignment, subdivision, and nested rhythm visible.',
    accent: '#7fd7ff',
    body: `Study is the structural view of rhythm.

If Orbit shows rhythm as motion, Study shows rhythm as alignment. It places multiple rhythms inside a shared field so you can see how the parts fit together.

Instead of watching cycles rotate through time, Study asks a different question:

Where do these rhythms live together?

A rhythm like 3:2 is not only three notes against two notes. It is a relationship that can be placed inside a shared cycle. The two-pulse side and the three-pulse side divide the same span of time in different ways. Study lets you see those divisions at once.

This is where shared-cycle thinking becomes important.

When two rhythms have different counts, they usually need a larger structure to contain both cleanly. That larger structure is often found through the least common multiple, or LCM. For example, 3 and 4 both fit evenly inside 12. So a 3:4 rhythm can be understood as two different ways of dividing a 12-step shared cycle.

The shared cycle becomes the common frame.

Each rhythm marks certain points inside it. Some points align. Some do not. Some create tension because they nearly meet, then separate. Others create resolution because multiple layers land together. Study makes those relationships visible without needing the motion to explain them.

This is useful for polyrhythms, subdivisions, and nested tuplets.

A simple pulse can be subdivided into smaller parts. A beat in 4 can become triplets. Every other triplet can imply a new grouping. That grouping can then be subdivided again. What sounds complex in time can often be clarified by placing it into a shared structure.

For example:

A rhythm can begin as 4.
Then each beat can divide into triplets, creating 12.
Accenting every other triplet creates a 3:2 relationship inside that grid.
Then placing 5s inside the space of the 3-side creates a deeper relationship like 15:2.

Study is where that kind of nesting becomes visible.

It shows the framework underneath the feel. You can see which pulses belong to the main cycle, which belong to the subdivision, and which belong to the nested layer. Instead of hearing the rhythm as one confusing stream, you can see the architecture.

Study is also where alignment becomes clear.

Where do the pulses agree?
Where do they drift apart?
Where do they return together?

These questions are hard to answer by ear alone, especially as the ratios get larger. Study gives the rhythm a map. It shows the agreement points, the gaps, the subdivisions, and the full return.

If Orbit is a living path, Study is the shared frame beneath it.

It is the rhythm's map.
The grid under the groove.
The structure behind the relationship.

Study shows rhythm as organized time.`,
  },
  {
    title: 'Riff',
    summary: 'Patterns move against a bar frame until phrase, accent, and return become clear.',
    accent: '#ffd166',
    body: `Riff is where rhythm becomes writing.

Orbit shows rhythm as motion. Study shows rhythm as alignment. Riff shows what happens when a pattern is placed against a bar frame and allowed to cycle.

This is the most directly musical surface.

A riff is not only a sequence of hits. It is a shape moving through time. The notes themselves matter, but so does the length of the phrase, where it begins, where it resolves, and how it lands against the bar.

Riff is built around that relationship:

the pattern and the frame.

The frame is the bar: the steady reference that gives the listener a sense of where time is. The pattern is the written phrase moving across it. When the pattern length and the bar length agree, the groove feels stable. When they disagree, the phrase begins to rotate through the bar.

That rotation creates displacement.

A 5-step riff against a 4-beat bar will not land the same way each time it repeats. The riff comes back, but the bar has moved underneath it. Accents shift. Downbeats feel different. The same phrase starts to reveal different sides of itself.

This is one of the core ideas behind a lot of polymetric riff writing.

Meshuggah is a clear example. Many of their riffs are built from patterns that repeat over a steady pulse or bar structure. The guitar pattern may have its own length while the drums or larger meter keep a consistent frame. The result is a groove that feels heavy, strange, and constantly turning, even though the underlying idea can be very simple.

Riff makes that visible.

You can see the bar frame.
You can see the phrase length.
You can see where accents hit.
You can see how the same pattern lands differently each time it cycles.

This is especially useful for displacement and accent cycles.

An accent can make one note feel like the beginning, even if the bar says otherwise. If the accent pattern has a different length than the bar, it creates another layer of motion. The ear may feel the groove pulling in one direction while the frame holds it in another.

That tension is where a lot of interesting rhythm lives.

Riff also shows how patterns create shape.

A phrase with an even, square relationship to the bar can feel balanced and direct. A phrase with an uneven length can feel angular, stretched, or unstable. It can create obtuse rhythmic shapes: forms that do not resolve immediately, patterns that lean across the grid, phrases that feel like they are turning through the bar instead of sitting inside it.

That is not a flaw.

That is the structure.

The groove becomes interesting because the pattern is not perfectly aligned at every moment. It has to travel before it returns. The listener feels the motion. The player feels the cycle. Riff lets you see both.

This makes Riff useful not only for analysis, but for writing.

You can build a phrase, shift it, accent it, shorten it, extend it, or let it run freely. You can hear when it locks in and when it starts to bend against the frame. You can find the moment where a simple pattern becomes a larger system.

Riff is about more than making a loop.

It is about understanding what the loop does over time.

Where does it land?
How does it turn?
When does it resolve?
What shape does it make against the bar?

Riff shows rhythm as phrase, frame, and displacement.`,
  },
  {
    title: 'Where This Connects',
    summary: 'The same relationships appear in music theory, math, physics, art, and perception.',
    accent: '#aa88ff',
    body: `Rhythmic Geometry sits at the intersection of several older ideas.

It is not separate from music theory, math, visual art, physics, or perception. It is a place where those subjects overlap. Rhythm becomes the entry point, but the same relationships appear in many different forms.

In music theory, this connects to polyrhythm, polymeter, tuplets, clave, metric modulation, and accent displacement.

A polyrhythm is already a visual idea hiding inside sound: two or more ways of dividing the same span of time. Polymeter adds another layer, where patterns of different lengths move beside each other until they eventually realign. Tuplets show how a beat can be subdivided in unusual ways. Clave shows how a pattern can organize a whole musical world around tension and return. Metric modulation shows how one rhythmic relationship can become the basis for a new tempo or feel.

Rhythmic Geometry gives these ideas a visible body.

In math, the connections are just as direct.

Rhythm is ratio. Cycles repeat. Numbers divide time. Least common multiples show where different rhythms share a return point. Modular arithmetic describes how a pattern can keep cycling through a frame without starting in the same place each time. Phase describes the position of one cycle against another.

These are not abstract ideas added onto rhythm later.

They are already inside rhythm.

When you play 3 against 4, you are working with ratio. When a 5-step pattern moves across a 4-beat bar, you are working with modular arithmetic. When two cycles drift apart and return, you are working with phase. When a rhythm needs a larger grid to show where everything lines up, you are working with least common multiples.

In visual art, the connection is to systems that generate form through repeated motion.

Spirographs, harmonographs, pendulum drawings, Lissajous figures, and generative geometry all create complex images from simple repeating rules. A small change in ratio can completely change the form. The artist does not draw every detail by hand. The system draws through motion.

Rhythmic Geometry works the same way.

The rhythm sets the rule.
The motion follows the rule.
The form appears over time.

In physics, this connects to cycles, resonance, oscillation, wave interference, and orbital motion.

A rhythm can be understood as a repeating event. A wave is also a repeating event. When waves interact, they reinforce, cancel, phase, and interfere. When orbiting bodies move at different periods, their relationships can create repeating patterns. When systems resonate, small repeated motions can produce large visible effects.

That is why rhythm can feel physical.

It is not just counted. It is felt as movement, pressure, return, and release. The body understands rhythm before the mind explains it.

This is also why rhythm connects so naturally to trance and hypnosis.

Repetition changes attention. A repeating pulse can narrow focus. A slowly evolving pattern can hold the mind in motion without fully resolving. When rhythm repeats but also shifts, it creates a state between stability and change. You recognize the cycle, but you keep watching for the return.

That is part of the power of groove.

It is predictable enough to enter.
It is alive enough to stay inside.

There is also an esoteric side to this, but it does not need to be forced.

Many traditions have treated number, sound, motion, and form as connected. Pythagoras connected musical intervals to numerical ratios. Kepler looked for harmony in planetary motion. Sacred geometry, mandalas, yantras, and other symbolic systems often use repeated proportion, symmetry, and rotation to represent order.

Rhythmic Geometry belongs near those ideas, but in a practical way.

It does not claim that every pattern has a hidden mystical meaning. It simply shows that rhythm, number, motion, and form are deeply related. Some people may experience that relationship musically. Some may experience it visually. Some may experience it mathematically. Some may experience it spiritually.

The golden ratio belongs in this broader family too, but carefully.

It is another example of proportion shaping perception. Not every rhythm needs to involve the golden ratio, and not every beautiful form comes from it. But it points to the same larger idea: relationships between numbers can create forms that feel balanced, tense, organic, or alive.

Rhythmic Geometry is a tool for exploring those relationships.

It connects:
music theory to visual form,
math to motion,
physics to rhythm,
art to structure,
and perception to time.

It shows that rhythm is not only something we hear.

It is something we can see, trace, feel, and study.`,
  },
  {
    title: 'How I Found It',
    summary: 'The project grew from polyrhythm videos, groove writing, and wanting to see what rhythm was doing.',
    accent: '#ff7799',
    body: `Rhythmic Geometry started as a feeling that rhythm had more structure inside it than I could explain with sound alone.

I was not trying to build a normal visualizer. I was trying to understand what I was hearing and feeling.

Certain rhythms felt like they had shape. Some patterns felt circular. Some felt like they were folding over themselves. Some felt like they were rotating, drifting, locking, or returning after a long path. I could hear the movement, but I wanted to see the relationship underneath it.

A big part of this came from making polyrhythm videos on Instagram.

When those videos started reaching people, I saw that the intrigue was real. People were not only reacting to the sound. They were reacting to the relationship: the way two rhythms could seem confusing at first, then suddenly lock into place. The visual side helped people feel the structure before they could fully explain it.

At the same time, I noticed it happening to me too.

Playing rhythms and grooves could become trance-like. Repetition would pull me in. A pattern would start as something I was counting, then become something I was inside of. The longer I stayed with it, the more the rhythm felt like motion, shape, and energy rather than just beats.

At first, it was about simple ratios.

What does 3 against 4 actually look like?
What happens when one cycle finishes before another?
Where do they meet?
What path do they take before returning?

Study came from that world: the Instagram videos, the polyrhythm explanations, and the need to make layered rhythms clear. It became the place for shared cycles, alignment points, subdivisions, and the hidden grid behind the feel.

Riff came from a different obsession.

I was fascinated by Meshuggah and other polyrhythmic music: riffs that sounded heavy, strange, and constantly turning, but still had an underlying logic. I wanted to understand how those patterns were written. How does a phrase move against a bar? Why does a riff feel like it is shifting when the pulse is still steady? How do accents create the illusion of a new downbeat? How can something feel unstable but still groove?

Riff became the answer to those questions.

It was not just about analyzing those ideas. It was about creating with them. I wanted a way to write patterns, see how they cycle, hear how they displace, and understand when they resolve.

Orbit came from the broader realization that rhythm behaves like motion.

Ratios could become paths. Pulses could move like bodies in orbit. The trace could show the memory of the relationship. Simple numbers could create complex forms. A small change in pulse count could change the entire shape.

The deeper I went, the more connections appeared.

Music theory, math, physics, visual art, trance, orbit, phase, proportion, repetition: they were all pointing toward the same thing. Different languages for relationship over time.

That was when the project became more than a rhythm tool.

I started seeing that rhythm was part of something larger. It connected to how we perceive time, how systems repeat, how patterns emerge, and how motion becomes form. The same ideas kept appearing in different places: music, geometry, planetary motion, waves, symmetry, meditation, and visual art.

Rhythmic Geometry grew from that discovery.

It is personal because it came from trying to understand what rhythm feels like from the inside. It is technical because the relationships can be measured. It is visual because the structure can be seen. It is musical because it still begins with pulse.

The goal was never just to make something that looked cool.

The goal was to build an instrument for seeing what rhythm is doing.`,
  },
];

const conceptTiles = [
  {
    label: 'Ratio',
    text: 'The numerical relationship between cycles.',
    accent: '#00ffaa',
  },
  {
    label: 'Phase',
    text: 'The changing position of one rhythm against another.',
    accent: '#88ccff',
  },
  {
    label: 'Form',
    text: 'The visible memory left behind as rhythm repeats.',
    accent: '#ffd166',
  },
] as const;

function getModeIcon(modeId: SiteModeId) {
  if (modeId === 'orbital') {
    return CircleDot;
  }
  if (modeId === 'polyrhythm-study') {
    return Layers3;
  }
  return SquarePlay;
}

function WhatIsRhythmicGeometryPage() {
  const [openSection, setOpenSection] = useState(explanationSections[0]?.title ?? '');

  return (
    <div className="min-h-screen bg-[#090a10] text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(circle at 18% 12%, rgba(0,255,170,0.08), transparent 24%), radial-gradient(circle at 82% 18%, rgba(127,215,255,0.08), transparent 25%), radial-gradient(circle at 70% 82%, rgba(255,209,102,0.07), transparent 28%), linear-gradient(180deg, #090a10 0%, #0d1017 48%, #090a10 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.92), rgba(0,0,0,0.55), rgba(0,0,0,0.92))',
          }}
        />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/6 bg-[#090a10]/72 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-white/58 transition hover:text-white">
            <ArrowLeft size={14} />
            Back To Site
          </Link>
          <div className="hidden text-[14px] font-medium uppercase tracking-[0.28em] text-white/78 sm:block">
            Rhythmic Geometry
          </div>
          <Link
            to="/launch"
            className="inline-flex items-center gap-2 rounded-full border border-[#00ffaa]/25 bg-[#00ffaa]/12 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[#00ffaa] transition hover:bg-[#00ffaa]/18"
          >
            Launch
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main className="px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16">
        <section className="mx-auto max-w-6xl text-center">
          <div className="mx-auto inline-flex w-fit items-center rounded-full border border-[#00ffaa]/20 bg-[#00ffaa]/[0.08] px-4 py-2 text-[11px] font-mono uppercase tracking-[0.32em] text-[#00ffaa] shadow-[0_0_28px_rgba(0,255,170,0.1)]">
            Rhythm As Structure
          </div>
          <h1 className="mx-auto mt-6 max-w-5xl font-serif text-5xl font-light tracking-[-0.05em] leading-[0.95] text-white sm:text-6xl lg:text-[5.4rem]">
            What is Rhythmic Geometry?
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/62 sm:text-lg">
            A deeper guide to the ideas behind Orbit, Study, and Riff: ratio, phase, alignment, displacement, and the moment rhythm becomes visible form.
          </p>
          <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">
            {conceptTiles.map((tile) => (
              <div
                key={tile.label}
                className="rounded-[1.35rem] border bg-white/[0.035] px-5 py-5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl"
                style={{
                  borderColor: `${tile.accent}24`,
                  boxShadow: `0 24px 80px rgba(0,0,0,0.22), 0 0 36px ${tile.accent}12`,
                }}
              >
                <div className="text-[12px] font-mono uppercase tracking-[0.22em]" style={{ color: tile.accent }}>
                  {tile.label}
                </div>
                <div className="mt-3 text-sm leading-7 text-white/62">
                  {tile.text}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-5xl space-y-4 sm:mt-16">
          {explanationSections.map((section) => (
            <details
              key={section.title}
              open={openSection === section.title}
              onToggle={(event) => {
                if (event.currentTarget.open) {
                  setOpenSection(section.title);
                  return;
                }
                if (openSection === section.title) {
                  setOpenSection('');
                }
              }}
              className="group overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.035] shadow-[0_30px_110px_rgba(0,0,0,0.26)] backdrop-blur-xl transition open:border-[#88ccff]/22 open:bg-white/[0.05] open:shadow-[0_0_62px_rgba(136,204,255,0.13),0_30px_110px_rgba(0,0,0,0.28)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 sm:px-7">
                <span className="flex items-center gap-4 text-left">
                  <span
                    className="hidden h-2.5 w-2.5 rounded-full shadow-[0_0_18px_currentColor] sm:block"
                    style={{ backgroundColor: section.accent, color: section.accent }}
                  />
                  <span className="text-[13px] font-mono uppercase tracking-[0.24em] text-white sm:text-sm">
                    {section.title}
                  </span>
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 transition group-open:rotate-180 group-open:border-[#88ccff]/24 group-open:text-[#88ccff]">
                  <ChevronDown size={17} />
                </span>
              </summary>
              <div className="border-t border-white/8 px-5 pb-6 pt-5 sm:px-7 sm:pb-8">
                <div
                  className="mb-6 rounded-[1.2rem] border bg-black/20 px-4 py-4 text-sm leading-7 text-white/76 sm:px-5"
                  style={{
                    borderColor: `${section.accent}28`,
                    background: `linear-gradient(135deg, ${section.accent}12, rgba(255,255,255,0.025))`,
                  }}
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: section.accent }}>
                    Core idea
                  </span>
                  <span className="mt-2 block">{section.summary}</span>
                </div>
                <div className="max-w-3xl space-y-5 text-[15px] leading-8 text-white/68">
                  {section.body.split('\n\n').map((paragraph, paragraphIndex) => (
                    <p
                      key={paragraph.slice(0, 48)}
                      className={`whitespace-pre-line ${paragraphIndex === 0 ? 'text-lg leading-8 text-white/88' : ''}`}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </section>

        <section className="mx-auto mt-16 max-w-6xl rounded-[2rem] border border-white/10 bg-[#0d1017]/80 p-6 shadow-[0_34px_120px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-3 text-center">
            <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-white/46">Open The Instrument</div>
            <h2 className="font-serif text-4xl font-light tracking-[-0.045em] text-white sm:text-5xl">
              Choose a mode
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {SITE_MODE_CARDS.map((mode) => {
              const ModeIcon = getModeIcon(mode.id);

              return (
                <a
                  key={mode.id}
                  href={getModeLaunchHref(mode.id)}
                  className="group rounded-[1.45rem] border border-white/10 bg-white/[0.035] p-5 transition hover:border-white/18 hover:bg-white/[0.055]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                      style={{
                        background: `${mode.accent}12`,
                        borderColor: `${mode.accent}28`,
                        color: mode.accent,
                      }}
                    >
                      <ModeIcon size={18} />
                    </div>
                    <ArrowRight size={16} className="text-white/34 transition group-hover:translate-x-1 group-hover:text-white/70" />
                  </div>
                  <div className="mt-5 text-[12px] font-mono uppercase tracking-[0.22em]" style={{ color: mode.accent }}>
                    {mode.launchLabel}
                  </div>
                  <div className="mt-3 text-sm leading-7 text-white/62">
                    {mode.summary}
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
