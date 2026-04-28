# QA Checklist

Use this pass to catch only four things:

- `Broken`
- `Confusing`
- `Visually Off`
- `Duplicated`

Do not log feature ideas here.

## Run Rules

- Test on desktop and mobile.
- Test cold, as if you have never seen the screen before.
- When something fails, log:
  - surface
  - exact action
  - actual result
  - expected result
  - one tag: `Broken`, `Confusing`, `Visually Off`, or `Duplicated`
- Add a screenshot or screen recording for anything visual or timing-related.

## Quick Log Template

```md
- Surface: Study desktop > Utility > Overlays
- Tag: Broken
- Action: Turn on Ghost Steps, switch selected layer
- Actual: Ghost nodes disappear until Step Numbers is turned on
- Expected: Ghost nodes stay visible for the selected layer
- Evidence: screenshot / recording
```

## Website

### Homepage Desktop

- [ ] Hero shows headline, supporting line, primary action, and preview clearly without overlap
- [ ] Mode switching in hero updates image, title, and button state correctly
- [ ] `Three Clear Entries` cards align cleanly and read in a clear order
- [ ] `Workflow Tools`, `Orbits Showcase`, and `Extended Access` sections feel visually consistent
- [ ] Section reveals / motion feel smooth and not distracting
- [ ] No repeated images or obviously duplicated copy
- [ ] No cropped screenshots or text running out of frames

### Homepage Mobile

- [ ] First screen shows headline, preview image, and mode chooser without crowding
- [ ] Hero title fits and centers correctly
- [ ] Mode tabs are tappable and update the preview immediately
- [ ] Primary launch button matches the selected mode
- [ ] Cards and sections do not become one long awkward stack
- [ ] Text remains readable without crowding or wrapping badly

### Launch Page

- [ ] `Geometry Modes` header spacing looks intentional on desktop and mobile
- [ ] Three mode entries read as equally clear choices
- [ ] Images fit their frames cleanly
- [ ] Mode copy is distinct, not repetitive
- [ ] Entry buttons and last-used affordances work correctly

## App Shell

### Shared Desktop

- [ ] Mode switcher never overlaps the canvas or top geometry points
- [ ] Top-left `Rhythmic Geometry` logo appears in Orbit, Study, and Riff and links back to the website
- [ ] Bottom dock does not overlap panels or trays
- [ ] Present mode removes non-essential buttons and leaves a clean surface
- [ ] Utility and quick-edit launchers stay visible but do not block important canvas areas

### Shared Mobile

- [ ] Surface chrome fits on common phone sizes without clipped controls
- [ ] Opening menus does not trap content off-screen
- [ ] No desktop-only layout leaks into mobile

## Orbit

### Orbit Desktop

- [ ] Scene loading works from the visible menu and scene browser
- [ ] Geometry motion, hover, and playback remain smooth
- [ ] Mode labels, overlays, and canvas controls are readable
- [ ] Present mode is clean and uncluttered
- [ ] MIDI export imports correctly into a DAW

### Orbit Mobile

- [ ] Playback, randomization, and scene switching work without layout breakage
- [ ] Help / tutorial targets the right controls
- [ ] Export and scene actions stay usable on smaller screens

## Study

### Study Desktop

- [ ] Quick Edit panel scrolls correctly with many layers
- [ ] Layer cap is enforced cleanly
- [ ] Layer count can be changed by typing and by slider/buttons
- [ ] Selecting a layer updates:
  - left panel
  - canvas highlight
  - playback focus target
- [ ] Solo / Full Stack changes audio immediately while playback is running
- [ ] Hovering a layer highlights it and clicking selects it
- [ ] Ghost Steps works with and without Step Numbers enabled
- [ ] Ghost nodes stay visible as neutral reference points, not highlighted playback points
- [ ] Shared Cycle info is correct and readable
- [ ] Focus editor top bar stays balanced and does not clip the canvas
- [ ] Reference-layer trace toggle works and does not affect the selected layer styling
- [ ] Utility order makes sense:
  - Playback
  - Overlays
  - Sound
  - Canvas
  - Scenes
- [ ] Scene thumbnails fit in the compact utility section
- [ ] `Playback` feels clearly separate from `Sound`

### Study Mobile

- [ ] Layer editing remains usable with multiple layers
- [ ] Overlay toggles visually match the canvas state
- [ ] Sound mode and palette selection behave correctly
- [ ] Focus editor fits and remains tappable

## Riff

### Riff Desktop

- [ ] Main canvas top point clears the mode switcher
- [ ] Utility order is correct:
  - Lane View
  - Playback
  - Overlays
  - Sound
  - Canvas
  - Scenes
- [ ] `Lane View` controls fit their buttons and labels cleanly
- [ ] `Riff Bounds` toggle behaves as a lane aid and does not clutter overlays
- [ ] Lane labels do not collide with bracket / guide text
- [ ] White playback marker moves through visible bars correctly instead of flashing every bar at once
- [ ] Focus editor header is compact and does not waste vertical space
- [ ] `Bar`, `Riff`, and `Ending` focused tabs read as distinct work modes
- [ ] `Bar Frame` grouping is visually clearer:
  - Meter + Bars
  - Reference Grid + Subdivision
  - Backbeat
- [ ] `Pattern` grouping is clear:
  - Steps
  - Offset / Invert / Clear
- [ ] `Ending` layout is clear:
  - left settings panel
  - middle ending roll
  - right return window
- [ ] Return-window bar boxes highlight the active playback bar correctly
- [ ] Ending markers appear only in the final bar and line up with the canvas pattern positions
- [ ] Ending roll reference and editable row line up cleanly
- [ ] No label collisions or clipped action buttons in the focused editors

### Riff Mobile

- [ ] Quick edit, lane controls, and ending controls remain readable
- [ ] Overlay toggles reflect the lane correctly
- [ ] Help / tutorial lands on the right controls
- [ ] MIDI export options are clear and usable

## Help And Tutorial

- [ ] Every help target points to the correct visible control
- [ ] Every tutorial step can be completed without forcing a reload or wrong panel state
- [ ] Skipping tutorial leaves the app in a sane state
- [ ] Help popovers are not clipped by the panel they came from

## Scenes, Save, Export

- [ ] Saving a scene works in each mode
- [ ] Reloading restores the scene correctly
- [ ] Scene thumbnails and names match the actual content
- [ ] PNG export works where offered
- [ ] MIDI export works where offered

## MIDI Validation

- [ ] Orbit MIDI imports cleanly
- [ ] Study MIDI imports cleanly
- [ ] Riff MIDI imports cleanly
- [ ] Tempo is correct
- [ ] Time signature is correct
- [ ] Loop length is correct
- [ ] Riff ending / full-cycle behavior survives export
- [ ] Study shared-cycle render makes musical sense in the DAW

## Performance

- [ ] No audible glitch when switching Study solo target during playback
- [ ] No visible hitch when Riff bar tracking changes in the ending editor
- [ ] Random / Remix / Random+ do not reset overlay state unexpectedly
- [ ] No panel interaction causes a noticeable audio dropout
- [ ] Present mode runs smoothly

## Final Release Gate

- [ ] No known clipping bugs
- [ ] No broken playback-state bugs
- [ ] No broken tutorial/help targets
- [ ] No scene/save regressions
- [ ] MIDI tested in at least two DAWs
- [ ] Homepage and launch page look intentional on mobile and desktop
