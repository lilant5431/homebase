# Visual recommendations — Phase 2.6A-V6

Three environments, independently accessible in Light/Dark, preserve the accepted interaction architecture without tying appearance to a clock or particular time of day. This is an audition, not final design approval. [Audit](component-audit.md) and [verification](verification.md) distinguish licensing, local measurements and physical reports.

## Direct feedback and resulting choices

User-reported V2 physical iPhone Safari results passed Daylight animation, portrait/landscape scrolling/rotation, repeated cues, reduced-motion/effects and sustained responsiveness/performance. Keep those behaviors. The **aviation concept is removed**: no runtime airport, runway/taxiway geometry, instrument ticks or fabricated flight details. Historical V2 research/screenshots remain labeled evidence of an earlier direction.

| Environment           | Light identity                                                    | Dark identity                                                              | Motion and cost                                                                                           |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Sunlit Lattice        | Loved cool-white/pale-blue geometry and diagonal light            | Moonlit Lattice: midnight/slate, steel geometry and silver reflections     | Existing transform-driven rays/outline plus small shared gradient rims; largest atmospheric painting area |
| Atmospheric Landscape | Layered mountains, soft clouds, warm sun and calm reflective lake | Identical mountain/lake geometry, sparse steady stars and moonlit blue sky | Original finite SVG, cloud/water translation and broad soft wash; no particle/image/shader system         |
| Basic                 | Clear light surfaces, polished hierarchy and static chrome        | Same composition in dark colors                                            | No cinematic background or continuous ambient animation; pointer/focus/cue remain available               |

Basic is a positive preference for lower complexity, not a broken version or merely the previously rejected static audition. Beam/Shimmer remain technical source comparisons only. Preserve the now-approved Lattice and Landscape direction, shared reflective glass and bounded cue; V6 is final polish rather than further artistic exploration.

## Composable appearance architecture

React state: `environment: lattice | landscape | basic`, `mode: system | light | dark`. `effectiveMode` derives from the explicit choice or live `prefers-color-scheme`. System is default; unsupported media queries fall back to Light. No clock-based inference or storage. The existing internal day/night CSS palette selectors are retained for safety and derived from `effectiveMode`, not independently controlled.

Each dimension preserves the other. Tuning, preset, pause/reductions, view and detail state are retained. Environment selection exits the optional technical-source override to show the requested environment; palette changes can also audition a source reference in either palette. Reset retains appearance. Native `color-scheme` follows the resolved mode on the initial render and updates live. No SSR/hydration system is introduced.

## Landscape/material composition

The [V4 reference study](landscape-v4-references.md) informed original colored linework, faint gradients and three contour ranges. Separate finite sky/range/water SVG planes span the entire preview, with drawn clouds, twenty fixed star points, sparse ridge lines and open reflected-water strokes. Palettes change decorative tokens rather than geometry. Full-height washes connect the sky/ranges/lake behind navigation and around records, with no active scenic band. V3 remains an explicit live archived band comparison in either palette. Native selectors use concise labels so the longer Landscape title cannot clip in desktop chrome. Solid remains the original default; optional Frosted makes the existing geometry visible through actual panels.

Large light layers use bounded transforms; small chrome rims share the existing inherited CSS field. There is no physically accurate propagation claim, animated React position state, global RAF loop, WebGL, external image or new runtime dependency. The attributed Magic Card gradient adaptation remains on navigation, notes menu and action holder. Touch depends on ambient/focus/pressed reflections, not mouse hover. Focus/current-state semantics remain explicit.

Content colors remain approved solid roles: Light canvas `#F3F6FA`, surface white, text `#172334`, muted `#536477`, action `#1D4ED8`/white; Dark canvas `#0B1220`, surface `#121D2E`, text `#E8EEF6`, muted `#A8B7CB`, action `#8BDDFC`/`#0B1220`. Landscape adjusts decorative sky/mountain/water and reflected-light tokens; it does not redefine text contrast. Frosted uses stronger local metadata colors (#35465A Light/#D0DCEA Dark) tested against actual scene samples and black/white blended bounds. This is representative contrast evidence, not a universal accessibility certification.

## Shared cue and reductions

The accepted 900ms cue with offsets ending at 1,180ms is retained. Lattice/Basic have five fixed decorative targets; Landscape adds visible sky and water targets (seven total). The scene target no longer has a 70% height cap or lateral translation: a separate full-stage decorative field pulses in place, including Basic. Sky/water cover overlapping upper/lower regions; local chrome alone sweeps. Scene opacity peaks at 0.65 without increasing the 1,180ms budget. Retrigger replaces old animations/timer; pause, reductions, effective appearance changes, hidden/offscreen state and unmount cancel before the next paint. The check/text confirmation explicitly says nothing was saved/scheduled. Reduced or unsupported animation receives static feedback and never replays on restoration.

One inherited field drives the atmospheric variants. Basic disables continuous ambient motion but preserves static glass, usable actions and pointer feedback; stored-in-memory speed is retained for a later atmospheric selection. Reduction stops decorative motion; effects reduction makes chrome opaque and removes atmosphere/blur/glow. OS requests and forced colors take precedence.

## Boundaries and next review

The design branch [PR #14](https://github.com/lilant5431/homebase/pull/14), inspected at `02abb2097e184dc21fe102b349a9d43c2da1ad99`, is unchanged/read-only. The experiment remains based on main `580b25f69a724a5e0c54e15927e05eafcda6d887`. V4 responds to new user feedback here; it does not silently revise approved design documentation. DT-01 remains outside this editor-free gallery. MIT attribution/source hashes and five runtime packages remain unchanged.

## Final V6 polish

The user approved V4 Landscape Light, full-page sketch vs V3 band, full-stage desktop/iPhone cues, scrolling/rotation, reductions and sustained responsiveness/warmth. This does not approve every appearance. Preserve V4 linework, finite SVG geometry and its lighting/cancellation mechanisms unchanged.

The only materials are Solid (original opaque default) and Frosted (unchanged 72% surface, 4px desktop/3px phone blur). Subtree opacity remains 1. The selection survives appearance/view/tuning/cue/reset changes in React state only. Reduction/unsupported blur temporarily use Solid, then restore Frosted. Critical details and semantic session surfaces remain opaque.

Moonlit Lattice keeps the approved midnight branding/navigation, steel geometry and silver lighting unchanged. The only lattice visual adjustment is a short 112px × 8px capsule replacing the full-width two-rule gradient bar. Its 26px flow slot is unchanged so headings and content do not move. A restrained rounded edge and soft eight-pixel halo reuse palette/intensity/shared light position. It is decorative, hidden from assistive technology, pointer-transparent, and adds no handler, separate animation or cue. Reduced motion is static; reduced effects/forced colors hide the accent.

The user has approved the current direction and requests a final polishing pass, not another exploration. Keep these choices fixed unless a demonstrated regression warrants correction. Existing V4 physical passes and approved Moonlit/Frosted direction are preserved; no new physical result is inferred. [V5 numerical evidence](archive/material-v5-results.md) remains clearly historical, not an active material comparison.

Five Overview content filters versus one Planner filter remain a genuine paint cost. No new backdrop areas or scenery are added. Solid default, bounded Frosted blur, Pause and opaque reductions remain safeguards. See [current verification](verification.md). Physical Safari regression checks should inspect capsule geometry/readability, both materials, cues and scrolling/rotation/warmth; automated browsers cannot establish those device outcomes. No production integration, PR #14 update or DT-01 editor work.
