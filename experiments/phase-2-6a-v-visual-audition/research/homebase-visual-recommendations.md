# Visual comparison and recommendations

This is a provisional selection for user audition, not a finalized Homebase design. [Component audit](component-audit.md) records actual source and licensing. [Verification](verification.md) records measurements and their limits.

## Relationship to the approved design

Read-only reference: [Phase 2.6A design branch](https://github.com/lilant5431/homebase/tree/docs/phase-2-6a-design-spec/docs/design/phase-2-6), inspected at `02abb2097e184dc21fe102b349a9d43c2da1ad99`. This experiment starts separately from stable main `580b25f69a724a5e0c54e15927e05eafcda6d887`, which includes PR #13. It neither imports design assets nor modifies that branch.

The same hierarchy, solid records, top-to-bottom mobile content order and shared semantic palette support both themes. Night is a change of atmosphere, not a different navigation model. Date/Time DT-01 remains an unresolved product defect assigned to 2.6E; the audition contains no editor or native picker and provides no evidence about its resolution.

### Content roles retained

| Role                   | Modern Daylight       | Night Flight          |
| ---------------------- | --------------------- | --------------------- |
| Canvas                 | `#F3F6FA`             | `#0B1220`             |
| Solid content          | `#FFFFFF`             | `#121D2E`             |
| Foreground             | `#172334`             | `#E8EEF6`             |
| Muted                  | `#536477`             | `#A8B7CB`             |
| Action / on-action     | `#1D4ED8` / `#FFFFFF` | `#8BDDFC` / `#0B1220` |
| Essential control edge | `#64748B`             | `#71859E`             |

Experimental chrome uses light glass `rgba(240,248,255,.70)` or dark glass `rgba(18,34,54,.72)`, static 18px backdrop blur and restrained edge reflections. The source-default comparison intentionally uses different upstream colors/cadence. These are audition values requiring approval, not silently revised design tokens. Main navigation actions and all academic cards keep opaque text-bearing plates. Reduced effects replace chrome with the solid content color. Contrast evidence for actual content roles is in the verification record; contrast of every possible mixed backdrop is not claimed.

## Effect comparison

| Effect           | Daylight contribution                                                      | Night contribution                                                 | Motion/material value                                                | Integration risk                                                             |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Sunlit lattice   | Strongest structural identity: diagonal sunlight and coherent geometry     | Architectural grid with cooler reflected light                     | Three bounded CSS transforms around one static SVG pattern           | Low–medium; large gradient paints still need phone observation               |
| Airport horizon  | Subtle distant blue/amber accents; less characteristic than sunlit lattice | Strongest atmosphere: sparse sky and distant horizon, no wallpaper | One slow CSS translation; 60 deterministic SVG circles               | Low–medium; no runtime dependency or particle loop                           |
| Reflective glass | Clear edges and cool reflected light                                       | Richest layered navigation, restrained cyan/amber rim              | Scoped pointer response; centered lighting for keyboard/touch        | Medium; backdrop blur and radial repaint need real Safari performance review |
| Border Beam      | Distinct active chrome, source orange/purple is less coherent              | Ice/amber tracing light is legible but can distract                | Continuous motion-path border; source technique retained with CSS    | Low–medium; modern mask/rect support required, static fallback supplied      |
| Shimmer Action   | Crisp primary action with gentle reflection                                | Strong illuminated action without glowing text                     | Small bounded conic gradient + source translating/rotating keyframes | Low–medium; best used on one action or briefly after a real event            |
| Static baseline  | Calm sunlight/reflection with no motion                                    | Quiet dimensional shading, less cinematic                          | No continuous motion; useful reduction/reference                     | Lowest risk; proves whether moving effects actually add value                |

The six choices are distinct effect auditions, not six libraries to install. Magic UI supplies four verified MIT source techniques without a runtime effect package. The CSS sun rays and original horizon are expressly not ports of the excluded React Bits/Aceternity candidates.

## Small coherent collection to consider next

Subject to physical-phone/user feedback:

1. **One ambient scene per theme:** tuned sunlit lattice for Daylight, original sparse horizon for Night. Use Calm/Balanced bounds; leave Cinematic as an audition stress comparison rather than the planner default.
2. **One shared chrome material:** bounded reflective glass for navigation/floating action exterior, opaque inner action plates. Reduce effects to solid material; centered static lighting for touch/keyboard, no pointer tracking requirement.
3. **One restrained action accent:** tuned Shimmer technique on a deliberately chosen primary action, potentially time-limited to genuine successful feedback. Do not apply shimmer, beams and glass trails simultaneously to every card.

Keep Border Beam as a secondary experiment until the user decides whether a tracing rim helps navigation or competes with academic attention. Keep the static baseline as the fallback. Do not incorporate WebGL Aurora, React Three Fiber or GSAP merely to make the planner feel premium; this audition shows substantial lighting without them, and their licensing/performance work remains separate.

## Fluidity and interaction interpretation

Pause halts continuous CSS effects and clears pending pointer work. Speed changes duration, never layout. Intensity changes atmosphere/rims, never text opacity. Reduced motion removes animations rather than slowing them; reduced effects also removes blur and glow. Hidden/offscreen previews pause. No permanent ambient animation is required for integration: the static versions remain meaningful.

The cue button announces a real decorative action, **not** a fake save/lock operation. Future successful-action feedback must follow a real successful domain operation, with failure/cancellation states preserved. The specimen does not establish scheduling interaction semantics.

## Dependencies, cost and remaining questions

Five runtime packages are isolated: React, React DOM, Lucide and two local font packages. **Zero effect/animation packages**; no Tailwind/Next/Motion/OGL/Three/GSAP stack. The total gallery bundle includes all six effects and the read-only compositions, so it is not the incremental production cost of adopting one effect. Four adapter components measured separately with React externalized are about **1.29 kB gzip**, excluding CSS; see the measurement method in verification. This is a useful size bound, not proof of low paint cost.

Questions for physical audition: Does Balanced light feel visible enough? Is Cinematic inviting or distracting? Does the glass read as dimensional in bright daylight? Does motion remain smooth in landscape while scrolling? Does iPhone Safari visibly render the Beam fallback rather than the moving rim? Does reduced mode preserve the same spatial hierarchy? Does the device become warm over several minutes?

No visual direction is finalized until those observations and the user's preferences are returned. Future production integration belongs to a separately authorized milestone with existing persistence/scheduling/accessibility contracts protected.
