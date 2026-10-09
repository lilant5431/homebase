# Visual recommendations — Phase 2.6A-V2

This refines the existing audition using direct user feedback. It does not finalize a redesign or authorize production integration. [Component audit](component-audit.md) retains source/license evidence; [verification](verification.md) separates experimental tests from production CI.

## Feedback and current shortlist

**Sunlit lattice was loved.** Its cool-white/pale-blue architectural grid and palette are retained. The sunlight now spans the illustrative workspace and responds on foreground glass, navigation, menus and selected-control edges. It has not been replaced with Aurora or another effect.

**Airport horizon needed stronger visible lighting.** Its SVG is now bounded to a recognizable top horizon instead of stretching/cropping across a tall phone composition. Larger cyan runway lights, warm accents, perspective taxiway rows, sparse stars and an exposed lighting band make the scene readable around the header and metric panels. A slowly changing directional wash provides actual motion; runway points remain steady rather than flashing.

**Reflective glass and the temporary light cue were kept.** Both integrated environments use them. **Border Beam and Shimmer were rejected** and remain only in the closed technical-reference disclosure. **Static CSS was rejected aesthetically** and remains solely a performance/reduction comparison. None is promoted as a new preferred direction.

## One coordinated light language

Four inherited, registered CSS properties describe a small shared field: primary X/Y, secondary X and wash angle. One eased, alternate animation on the preview drives transformed rays/night wash and position-sensitive small glass rims/selected borders. Large light-layer backgrounds stay fixed within their moving layers to avoid repeatedly repainting a full-workspace gradient. There is no animated React position state, WebGL or global JavaScript frame loop. These are coordinated visual gradients, not physical light propagation.

The Magic UI Magic Card gradient-mode adaptation is reused on navigation, the primary-action holder and the native Preview notes menu. Opaque inner plates keep labels readable. Pointer-capable devices add a scoped cursor-relative reflection; touch uses ambient, focus and pressed feedback without hover. Active navigation has `aria-current`, a border and a solid label. Academic cards, planner sessions and read-only detail panels stay solid.

| Scene           | Identity                                                                                          | Motion                                                                    | Production caution                                                           |
| --------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Modern Daylight | Original grid/palette, full-workspace diagonal sunlight and geometric outline                     | Shared sunlight positions reflected across chrome                         | Gradient changes can cause paint; check phone scrolling and thermal behavior |
| Night Flight    | Abstract airport horizon, sparse sky, cyan/amber runway/taxiway points; restrained ticks/dividers | Directional sky wash and coordinated reflected edges; steady light points | Several-minute physical Safari compositing/performance remains unverified    |
| Reduced effects | Same content hierarchy with opaque chrome, no atmosphere/glow/blur                                | No decorative movement; immediate cue confirmation                        | A functional fallback, not a preferred aesthetic                             |

Precision ticks and divisions are decorative. There is no fabricated flight telemetry or unrelated aircraft control. Balanced is the recommended audition start; Calm and Cinematic are comparisons, not permanent Homebase preferences.

## Temporary cue

Play light cue sends a bounded illumination across five existing decorative surfaces, with 0/100/170/230/280 ms offsets and 900 ms animations (latest finish 1,180 ms). Retrigger cancels the previous five animations and timer. Pause, scene/reference changes, hidden/offscreen state, reductions and unmount cancel it. Cancellation runs before the next paint. A check icon and explicit **no save/schedule** confirmation remain when motion is reduced or the animation API is unavailable; restoring movement never replays the cue.

The effect lives behind content or in masked control rims, so it does not sweep over academic text. It demonstrates decorative lighting, not future lock/save semantics. Real product success feedback must follow an actual successful domain operation.

## Protected references and cost

Read-only design reference: [PR #14 branch](https://github.com/lilant5431/homebase/tree/docs/phase-2-6a-design-spec/docs/design/phase-2-6), inspected at `02abb2097e184dc21fe102b349a9d43c2da1ad99`. This separate experiment remains based on stable main `580b25f69a724a5e0c54e15927e05eafcda6d887`, which includes PR #13. No production code or design-branch change. DT-01 remains assigned to 2.6E; this gallery has no Date/Time editor and cannot verify that fix.

The approved content roles remain unchanged: Daylight canvas `#F3F6FA`, surface `#FFFFFF`, text `#172334`, muted `#536477`, action `#1D4ED8`/white; Night canvas `#0B1220`, surface `#121D2E`, text `#E8EEF6`, muted `#A8B7CB`, action `#8BDDFC`/`#0B1220`. Chrome opacity/rays/glow are audition experiments, not silent replacements for approved tokens. Representative solid-role contrast is verified; arbitrary mixed glass pixels are not claimed audited.

Five existing runtime packages, zero new packages or effect/animation libraries. MIT Magic UI attribution, notices and SHA-pinned snapshots remain intact. The reused techniques are Grid Pattern and gradient-mode Magic Card; Beam/Shimmer adapters remain archival. React Bits/Aceternity source is still excluded. Registered-property animation has a static fallback; unavailable backdrop blur uses opaque chrome. No large blur animation, Canvas or particles loop.

## Remaining user decisions

Compare both integrated scenes in Overview and Weekly Planner on physical iPhone Safari. Is expanded Daylight still the loved lattice? Are Night runway lights and the moving wash sufficiently visible without distracting from work? Do shared reflections and the cue feel connected on touch? Do Calm/Balanced/Cinematic remain smooth while scrolling, rotating and using the notes menu? Check pause, reductions, text clarity, pinch zoom, flicker and device warmth over several minutes.

Most promising collection: **the loved lattice, refined original horizon, shared bounded glass and brief explicit light cue**. Do not restore rejected continuous Beam/Shimmer accents as the production lighting language. Selection remains pending V2 user feedback; integration requires a separate authorized milestone.
