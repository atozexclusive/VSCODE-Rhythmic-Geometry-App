# Study groove scenes

The six drum scenes and four musical scenes are free presets in Study → Scenes → Grooves. Each part has the
same number of steps and zero rotation, so the layers share a grid and loop.
They start in Split View with unlinked instruments and dry, balanced levels.
No recorded loops or external samples are included.

## References

- Ableton Learning Music, [Rock and house](https://learningmusic.ableton.com/make-beats/rock-and-house.html): familiar rock and house foundations and their shared backbeat.
- DNB Academy, [Drum and bass drum patterns](https://app.dnbacademy.net/learn/drum-and-bass-drum-patterns): basic two-step, kick 1/11, snare 5/13, eighth-note hats at 174 BPM.
- Berklee PULSE, [Create Your Own Afro-Latin Groove](https://pulse.berklee.edu/content/public/pub_unit_assets/lessons/lesson6_banded/BANDED_Lesson_6_Create_Your_Own_Groove.pdf): combine 2–3 son clave, cáscara, quarter-note shaker and bass drum on 1/3. This is an educational arrangement, not a complete traditional ensemble.

## Transcription conventions

Positions are one-based. A 16-step bar places quarter notes at 1/5/9/13.
A 12-step bar places quarter notes at 1/4/7/10. The shuffle plays the first
and last triplets of each beat; it is an original basic teaching arrangement.
Electronic Drive is also an original teaching variation, not a transcription.

Son Clave Groove uses 32 sixteenth-note steps across **two bars** (8 quarter-note
beats). The 2-side is on first-bar beats 2 and 3 (steps 5,9); the 3-side is on
second-bar 1, the & of 2, and 4 (17,23,29). Cáscara uses the existing Study
3–2 shell timeline reversed into 2–3, expanded from eighths to sixteenths.
The shaker and kick follow Berklee's beginner arrangement. The cáscara sound
models a timbale shell rather than pretending a pitched bell is the same voice.

## Sounds and timing

New voices: clave (short wooden modal strike), cáscara (short inharmonic shell
partials), cowbell (filtered dual square partials), shaker (band-limited noise
with a softened transient). Shaker reuses the existing cached noise buffer.
Modal voices use two or three oscillators and short decays, with no sample packs.
Existing instruments are unchanged.

`cycleBeats` defaults to 4 for existing studies; the son-clave scene uses 8.
Live animation, video audio scheduling, and MIDI use the same loop duration.
MIDI percussion uses General MIDI channel 10, with side stick as the closest
portable shell proxy. Synthesized audio remains the intended timbre.


## Musical scenes and authored note phrases

Deep House Stabs (C minor), Liquid Keys (D minor), Triplet Keys (A Dorian), and
Clave & Keys (C minor) are original arrangements built on the groove foundations
above. Each adds two pitched parts and stays within the six-layer limit.
Chorus Keys supplies chord stabs, Velvet Keys supplies melodies, and Soft Synth
supplies low bass. These are intentional arrangements, not artist transcriptions.

`noteSequence` stores zero-based scale degrees per active hit. Each group has up
to four simultaneous notes; a single note makes a melody. All authored parts use
the shared root and scale, so key changes transpose them together. Octave and
Wide/Tight range remain active. Wide spreads upper chord tones by an octave;
on a melody it alternates the octave of successive hits. Standard tuning bypasses
an authored phrase; In Key plays it.

In Sound → Pitch → Pattern & Range, choose “Write a note phrase” or edit an existing
phrase. Displayed degrees are one-based: `1+3+5 | 4+6+8` plays two triads on
successive hits. Use “Use Note Order” to return to the existing melodic walks.
Phrases repeat by hit count, so changing the rhythm can change their relationship
to the bar. Authored scene phrase lengths match each layer's hit count.

Live and exported audio share the phrase renderer; MIDI includes every chord
tone. Chords distribute gain across their notes instead of multiplying the layer
level. Key samples are silently prepared on scene load / Play to keep the first
chord from having to generate samples on the animation frame.
