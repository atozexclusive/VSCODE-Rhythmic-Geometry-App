# Sola-inspired landing preview

## Latest pass: concrete Pro benefits and mobile usability

Preserve-mode refinement, retaining the existing dark palette, fonts, logo, and composition. Pro now explicitly lists Cell Sequencer, Voices, and advanced sound controls, checked against the feature entitlements. Short benefit descriptions replace the generic wider-control-set paragraph.

Mobile tool illustrations now appear directly inside the expanded tool dropdown; desktop keeps the adjacent illustration. Only one illustration is displayed at each breakpoint. Intrinsic image dimensions reserve space while loading. Phone header buttons and mode tabs have at least 44px target heights, the header arrangement is consistent, and the Pro action fills the available phone width. Comparison text is 14px on phones.

Verification: build and targeted landing ESLint pass. Tested 320, 375, 390, 768, and 1440px layouts; no horizontal overflow. All three launch URLs and all five tool disclosures work. Phone launch actions remain visible on 568px-tall screens. Keyboard menu dismissal, keyboard disclosure activation, 200% enlargement, image decoding, one-time section reveals, and reduced-motion visibility pass. Rendered em-dash count is zero.

Preservation audit: no route, anchor, primary navigation, form field, logo, legal text, account logic, billing, or app behavior changes. Pro wording and mobile presentation changes were requested. The existing shared bundle-size/load-time and viewport limitations remain documented release concerns; this pass does not claim a new performance score. No commit or push.

## Design read and audit

Reading this as a landing page for musicians and curious explorers, with a dark, spacey editorial language. This is an original adaptation of Sola's composition, not a copy of its code, assets, claims, or product UI.

- Mode: preserve brand, overhaul composition.
- Dials: `DESIGN_VARIANCE: 6`, `MOTION_INTENSITY: 3`, `VISUAL_DENSITY: 4`.
- Foundation: existing React, CSS/Tailwind environment, and existing Lucide icons. No dependencies or fonts added.
- Reference: <https://sola.framer.media/> and <https://www.framer.com/marketplace/templates/sola/>.
- Existing brand: near-black background, mint `#00FFAA`, Study blue `#7FD7FF`, Riff gold `#FFD166`; light Helvetica appearance with monospace labels; uppercase spaced wordmark.
- Existing architecture: landing, launch, app modes, scene library, explanation page, and account panel. Conversion paths enter modes or open Pro through the app.
- Preserve: mode identities and selector, real scene pictures, light typography, philosophical copy, account-dependent actions, legal text.
- Retire: competing nested hero panels, very tall sticky mode comparison, scroll-driven mode switching, landing import of the large application module.
- Levers, in order: centered opening composition, page-wide alignment/dividers, image-led mode overview, selectable feature explanations, varied gallery proportions, consistent spacing and surfaces.
- SEO baseline: route URLs and metadata are unchanged. Ranking/traffic data was not available; no ranking claims are made.

## Implementation scope

Only landing presentation changed. The existing account form and handlers remain in `src/routes/index.tsx`; marketing is separated into `LandingExperience.tsx` with scoped styles. Audio, timing, canvases, exports, scenes, billing, public APIs, and shared mode data were not edited.

Six original pictures have 1200px WebP delivery copies. Originals are untouched. Their combined delivery size is about 1.1 MB, versus roughly 12 MB for the original PNGs. Gallery images are uncropped; image boxes reserve layout space. There are no videos, audio elements, canvas loops, scroll listeners, or continuous animation on the landing page.

## Verification

- Production build and landing-file ESLint: pass. Existing shared bundle-size warning remains.
- Responsive checks: 320, 375, 390, 768, 1024, 1280, 1440, and 1920px, including short screens.
- No horizontal overflow at those sizes or in the 200% enlargement stress check. Primary launch remains visible in the tested initial viewports, including 320x568.
- All three selector states: correct accent, one active image, correct purpose statement and launch destination.
- Orbit, Study, and Riff: launches render, browser Back restores landing.
- Keyboard: tabs support arrows, Home/End, visible focus; menu supports Escape and dismissal.
- Features: one open explanation at a time; all four images and destinations load.
- Account panel opens and closes. No account creation, password reset, purchase, or billing mutation was performed.
- All original navigation anchors resolve; all scene image URLs load.
- Reduced motion: transitions disabled. No hidden reveal-dependent content.
- Browser runtime errors: none observed. Em-dash audit: zero in rendered landing copy.

## Preservation and brand fidelity

- Changed route URLs: none.
- Changed primary navigation labels: none (`Modes`, `Showcase`, `What Is It?`, `Tools`, `Pro`).
- Changed existing anchor IDs: none (`modes`, `showcase`, `tools`, `pro`). Added a `hero` skip-link destination and internal control IDs.
- Changed account field names/order or handlers: none.
- Scene IDs and destinations: `prime_ritual`, `rose_engine`, `blue_mandala`, and `metallic_whorl`, all under `/app?mode=orbital&scene=...`.
- Mode URLs, `/launch`, `/scenes`, and `/how-it-works`: preserved.
- Wordmark wording, capitalization, spacing identity, light sans-serif appearance, and mint/blue/gold palette: preserved. No new display font or recolored logo.
- Legal wording and shared metadata: unchanged.

## Skill pre-flight

Pass: declared brief/dials/mode; one dark theme; consistent palette and radius families; CTA contrast; no desktop button wrapping; balanced headline; responsive collapse; stable image dimensions; real imagery; readable copy; varied section families; functional icons; no fake logos, stats, testimonials, decorative SVG product UI, marquees, version labels, or overlay captions; no scroll hijacking; reduced motion; cleanup for menu listeners; no extra design system or dependencies.

Reference/preservation exceptions: Sola's centered opening and three-column overview are intentional. Repeated section labels and feature dividers follow the requested reference. Existing mode accents, copy length, repeated launch paths, and Lucide icons are retained rather than enforcing generic single-accent, short-copy, or alternate-icon rules. Account form behavior is preserved rather than redesigned.

## Release blockers and limitations

This is a local design preview, not an all-checks-passed production release.

- Lighthouse accessibility: 95. The existing shared viewport tag disables mobile zoom; changing it could affect the app and was left out of scope.
- Lighthouse mobile lab performance: 63, LCP 4.8s, total blocking time 710ms, CLS 0. The earlier restored-page report scored 45 with LCP 43.3s and CLS 0. These are local lab observations, not controlled field-performance guarantees. The 2.5s LCP target is not yet met.
- Paid-account and purchase flows require authenticated verification; handlers and destinations were preserved without making account or billing changes.
- Nothing committed, pushed, or deployed.

## Background visibility refinement

Increased hero artwork opacity from 25% to 50% on desktop and from 33% to 56% on phones. Softened the surrounding dark overlay while retaining stronger shading behind the text. This pass changes three landing-only CSS values; layouts, typography, copy, routes, controls, and application behavior are unchanged. All three modes checked at desktop and phone sizes: images load, links retain their destinations, no horizontal overflow, and reduced-motion transitions remain disabled. Build and landing lint pass. Lighthouse contrast check passes; the existing shared viewport restriction remains.

## User-approved chooser removal

Removed the separate mode-choice screen. `/launch` remains as a compatibility redirect to `/#hero`, so existing links do not break. The closing `Choose A Mode` link now uses `#hero`, retaining the current selection while returning to the opening selector. Removed the closing `Explore The Modes` link. Following the user's subsequent request, desktop and mobile header Launch both open `/app?mode=orbital` directly. Other direct mode launch URLs and app behavior are unchanged. This supersedes the original preservation audit for these explicitly requested navigation changes.

## Compact mobile opening

Removed fixed hero minimum heights below 800px and reduced phone padding to 32px above and 36px below the content. Tightened the nearby text spacing without changing fonts, copy, mode controls, imagery, or desktop layout. At 390px wide the hero is approximately 418px tall instead of 610px; narrower screens expand naturally for wrapped text. Verified Orbit, Study, and Riff at 289, 320, 390, 540, 768, and 1440px: no horizontal overflow, launch buttons remain inside the panel, and each mode has the same panel height at each size. Desktop remains 750px tall. Production build passes.

## Readability, Pro, and product imagery refinement

Reading this as a targeted landing-page refinement for musicians and visual rhythm explorers, retaining the existing dark, spacey language. Preserve mode; dials remain `DESIGN_VARIANCE: 6`, `MOTION_INTENSITY: 3`, `VISUAL_DENSITY: 4`. Existing React and native CSS are retained. No new dependencies, font families, or animation are introduced.

Audit: small captions ranged from 8-13px; Pro listed benefits without a free comparison; tool illustrations repeated geometry rather than controls; the Study capture contained a black upper edge. Preserve the current header, selector, page order, mode colors, wordmark, links, and account behavior. Apply typography sizing, a localized Pro comparison, real product captures, and edge blending only.

- Captions and supporting descriptions are now generally 14px, primary descriptions 16px, technical labels 12px (11px for the narrow-phone hero label). Display typography remains unchanged.
- Pro has the requested gold surface glow, heading, and button. A six-row semantic table compares free and paid access against `src/lib/entitlements.ts`. No price or unsupported benefit is invented.
- The closing heading uses the existing gold `#FFD166`.
- Library, editor, and export images are real screenshots captured from the local app. No stock, generated, or simulated interface imagery is used. Export controls show their actual Pro requirement. Originals and application code are untouched.
- Hero images remain proportionally contained. A mask fades the captured upper and lower edges, including the black Study strip, into the full-panel background. No image stretching or geometry cropping.
- Preservation: no routes, link destinations, navigation labels, anchor IDs, account fields, legal wording, metadata, or billing handlers changed in this pass. Pro explanatory copy and tool captions were updated as requested.
- Brand fidelity: Helvetica/Arial appearance, monospace labels, existing wordmark, and mint/blue/gold mode identities retained. Gold glow is explicitly requested rather than a new palette.
- Build and landing ESLint pass. Mobile widths 320, 390, and 768px and desktop 1440px have no horizontal overflow. Study's upper seam is absent in visual checks. Free/Pro comparison wraps without clipping on phones.

Pre-flight inherits the documented preservation exceptions and production limitations above. This remains a local preview; nothing committed or pushed.

Final checks: all four tool images decode successfully; all three direct launch destinations are unchanged; keyboard Home selects Orbit; reduced-motion transitions are `0s`; 200% enlargement has no horizontal overflow; rendered em-dash count is zero. The current Lighthouse run reports accessibility 95, passing text contrast, with the same shared mobile-zoom restriction. Performance is 60, LCP 5.2s, CLS 0; the existing load-time target remains a release blocker, not a claimed pass. No application-wide performance or viewport changes were made during this visual refinement.

## Middle-section flow refinement

Design read: targeted evolution of the dark, spacey landing page for musicians and rhythm explorers. Preserve mode, with `DESIGN_VARIANCE: 6`, `MOTION_INTENSITY: 3`, `VISUAL_DENSITY: 4`. Continue with existing React/native CSS, Helvetica/Arial, monospace labels, and mint/blue/gold identities.

Audit before implementation: the instrument overview repeated bordered cards, numbered labels, and bullet lists; philosophy used another enclosing surface; tool screenshots sat inside oversized frames; showcase images had no strong lead. The user approved removing that repetition while preserving the opening and Pro section.

Changes: open three-mode introductions with the original descriptions and direct links; removal of redundant numbers and detail lists; centered, unboxed philosophy statement with supporting copy below; frameless, tightly fitted tool captures; a larger Prime Ritual lead followed by three gallery images. Phone mode images use their natural proportions to remove empty vertical padding. Desktop tool-section height stays stable across all four selections.

Preservation audit: no URL, navigation label, anchor ID, account form field, legal wording, scene destination, or metadata changes. Hero, selector, header, Pro, closing, and application behavior are unchanged. Existing real pictures, brand colors, type families, and logo treatment survive. No new dependency, generated imagery, motion, or backend change.

Verification: build and targeted landing lint pass; desktop 1440px, tablet 768px, and phones 320/390px checked; no horizontal overflow, including 200% enlargement. All four tool images decode, all scene links retain their IDs, and navigation anchors resolve. Em-dash count is zero. Existing reduced-motion handling remains in place. The skill pre-flight retains the documented user-approved layout/palette exceptions and existing release limitations. No commit or push.

Latest local Lighthouse: performance 63, LCP 4.9s, CLS 0; accessibility 95 with text contrast passing. The shared mobile-zoom restriction and unmet load-time target remain release blockers, not regressions resolved by this scoped design pass.

## Matching instrument frames and heading color

User-requested refinement: all three mode pictures now use the same 1.12:1 frame, border, background, and radius. Images remain contained and uncropped; lighter image pixels blend into the shared dark surface. Verified equal frame dimensions at 1440, 768, 390, and 320px with no horizontal overflow. The section heading uses near-white sentence text, existing mint for “instrument,” and existing blue for “rhythm.” Hero typography and colors are unchanged. Build and landing lint pass. No copy wording, URLs, controls, app behavior, or legal changes; no commit or push.

## Single rotating showcase

Preserve-mode refinement: replace the featured scene and lower thumbnails with one display. All four original pictures, names, descriptions, and scene destinations remain. Picture and caption crossfade together every seven seconds; previous, next, and pause controls allow deliberate browsing. Rotation stops on hover, keyboard focus, offscreen, hidden-tab, and reduced-motion states. Manual navigation pauses rotation. Inactive slides are inert and hidden from assistive technology.

Verification: build and targeted landing lint pass. At 1440, 768, 390, and 320px, every scene retains the same stage height with no horizontal overflow. All four images decode and all four scene IDs remain in their original launch URLs. Automatic advancement, pause, hover pause, and reduced-motion static behavior were exercised. Original image proportions are contained, not cropped. No new dependencies or application changes.

Preservation and brand-fidelity checks: no routes, navigation labels, anchors, form fields, logo, fonts, legal text, metadata, or brand colors changed. No copy additions contain em-dashes. The pre-flight retains prior user-approved composition exceptions and the existing documented performance/viewport release limitations; this pass does not claim to resolve those. Local preview only, no commit or push.
