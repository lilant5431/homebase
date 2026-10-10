# V6 final-polish verification

October 10, 2026 UTC. PR #15 was inspected OPEN on `experiment/phase-2-6a-v-visual-audition` at `36954bc80afcd785a41db821507c68757bb0c934`, with a clean working tree. Remote main remains `580b25f69a724a5e0c54e15927e05eafcda6d887`; PR #14 remains OPEN/read-only at `02abb2097e184dc21fe102b349a9d43c2da1ad99`. This final pass changes only the experiment. No production source, manifests, lockfiles, schemas, persistence keys, Vite or CI definitions changed.

## Exact scope

- **Only Solid and Frosted remain.** Solid is the opaque default; Frosted retains its existing 72% panel alpha and 4px desktop/3px phone blur. State/model, UI, live tests, active comparison tables and current screenshots contain only these two materials. Reduced effects or unsupported blur force opaque rendering while retaining the choice; restoration restores Frosted. Card/text subtree opacity stays 1.
- **Decorative lattice capsule:** replaces the full-width two-rule gradient strip with a 112px × 8px rounded accent. The original 26px flow slot and margins remain unchanged. Palette tokens, a fine edge/inset highlight, a restrained 8px halo and the existing shared light position supply illumination. It has no handler, focus target, cue target, additional animation or hit area. Reduced motion leaves static lighting; reduced effects/forced colors hide it.
- Existing Moonlit branding/materials, Landscape artwork, System handling, shared cue lifecycle and behavior CSS before the material section remain unchanged. No new environment, palette, interaction model, dependency, storage or rendering loop.
- Retired-material runtime/CSS/test branches and eight images are deleted. [V5 verification](archive/verification-v5.md) and [V5 numerical measurements](archive/material-v5-results.md) are archived historical records only, not active options or recommendations.

## Local results

| Command / check                                                                     | Actual result                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Experiment `npm ci`                                                                 | Passed; 120 packages, unchanged manifests/lockfile.                                                                                                                                                                |
| Experiment `npm test`                                                               | **47 tests / 4 files passed**. Two new palette-specific capsule cases; retired material parameter cases removed.                                                                                                   |
| Experiment `npm run typecheck`                                                      | Passed.                                                                                                                                                                                                            |
| Experiment `npm run lint`                                                           | Passed; existing type-aware zero-warning configuration, no suppressions.                                                                                                                                           |
| Experiment `npm run build`                                                          | Passed; `dist/index.html` exists.                                                                                                                                                                                  |
| Experiment `npm run format:check`, archived Markdown formatting, `git diff --check` | Passed.                                                                                                                                                                                                            |
| Built Chromium and actual Linux WebKit                                              | **582 geometry, 114 full-page scene, 164 capsule and 288 midpoint cue cases passed** across both engines.                                                                                                          |
| `python3 tests/audit.py`                                                            | Passed: five source hashes, internal links/assets, isolation scan, 24 solid-role contrast pairs, 8 Frosted blended-envelope checks.                                                                                |
| Actual material sampling                                                            | Each engine: 16 scene/material/view/width combinations, 352 computed text roles; all **704 roles** pass 4.5:1. Minimum sampled 6.07:1; full-envelope minimum 4.84:1. Actual painted Solid/Frosted swatches differ. |
| Production Homebase, separate clean install                                         | **604 tests / 20 files passed**; typecheck, lint, build, formatting and whitespace passed. 117 packages installed.                                                                                                 |

The first browser attempt exposed an evidence-harness edit mistake: the PNG sampler copied two rather than three RGB channels and produced NaN. Restoring all three channels corrected the harness; the complete two-engine run above then passed without loosening contrast assertions. No runtime correction was needed.

## Browser coverage and visual review

The primary matrix covers both materials × six appearances × Overview/Planner × 1440×900, 820×1180, 390×844, 844×390, 667×375 and 320×640. Licensed/legacy comparisons retain Solid. Reserved-edge simulations use 44px sides/34px bottom at 390×844 and 667×375 with Frosted. Four unsupported-blur geometry cases additionally verify opaque rendering. These reserved edges are simulated, not physical safe-area measurements.

Focused assertions require exactly two options/default Solid; actual bounded Frosted filters and alpha; retained preference through reduction/restoration and navigation/cue changes; capsule size/radius/slot containment; no content overlap, focusables, pointer interception or extra animation; static capsule with reduced motion and hidden capsule with reduced effects. Existing overflow, target-size, focus, touch, live System palette, forced-colors, cue cancellation/retrigger, hidden/offscreen and source fallback checks remain active. No runtime exceptions, external requests or forbidden storage access.

**46 refreshed Chromium screenshots**: 32 context images (six appearances in Solid; Landscape additionally in Frosted), two cue frames, four live V3 archive frames, two branding crops, two Sunlit/Moonlit comparisons and four capsule/Planner crops. All images decode and remain correctly linked. Inspected Sunlit/Moonlit desktop and phone capsule compositions plus Landscape Solid/Frosted long-phone content; content spacing and readable solid semantic surfaces remain intact. [Screenshot index](../README.md#v6-visual-evidence).

Actual Linux WebKit ran against the production-built experiment using the existing disposable browser cache/library setup. Host-path validation was bypassed; engine execution and assertions were not. This is not physical iPhone Safari acceptance, keyboard/rotation behavior, native compositing or thermal evidence.

## Size and performance

No packages added/upgraded. Full gallery: **263.57 kB JS / 82.60 kB gzip; 42.18 kB CSS / 9.27 kB gzip**. Review PNGs are not bundled. The capsule uses the existing CSS lighting field and does not create another runtime loop.

One-second sequential headless Chromium samples, Balanced/Overview; median / p95 milliseconds:

| Appearance / material     | 1440px viewport | 390px viewport |
| ------------------------- | --------------- | -------------- |
| lattice Light / solid     | 33.3 / 33.4     | 16.7 / 16.8    |
| lattice Light / frosted   | 49.9 / 50.0     | 16.7 / 16.8    |
| lattice Dark / solid      | 33.3 / 33.4     | 16.7 / 16.7    |
| lattice Dark / frosted    | 49.9 / 50.1     | 16.7 / 16.8    |
| landscape Light / solid   | 33.3 / 33.4     | 16.7 / 16.8    |
| landscape Light / frosted | 33.3 / 50.1     | 16.7 / 33.3    |
| landscape Dark / solid    | 33.3 / 50.1     | 16.7 / 16.8    |
| landscape Dark / frosted  | 33.4 / 50.1     | 16.7 / 16.7    |

All 16 samples report one running shared CSS animation. Frosted still has a real paint cost (for example desktop Lattice median ~49.9ms versus Solid ~33.3ms). Short cloud samples are not controlled hardware benchmarks, phone frame-rate promises or sustained warmth/battery measurements. Solid default, bounded blur, Pause and opaque reductions remain safeguards.

## Physical evidence and final boundary

Preserve the user-confirmed V4 passes: Landscape Light, full-page sketch versus V3 band, full-stage desktop/iPhone cues, scrolling/rotation, reductions and sustained responsiveness/warmth. The user also fixes the approved Moonlit/Frosted direction for V6. No new physical test result is inferred from screenshots or automated browsers. Any physical retest is a regression check of the capsule/materials and preserved behavior, not a new visual exploration.

This is the **final experimental polishing pass**. Stop further visual experimentation unless a regression appears. No production redesign, PR #14 edit, native-editor/DT-01 work or persistence integration. PR #15 remains open and unmerged.

Hosted **CI / verify** checks production Homebase only. The exact published-head run URL and conclusion accompany the PR/review report; local experiment/browser evidence remains separate.

---

The following V4/V3/V2/V1 records are historical. Their counts, old review requests and acceptance limits do not substitute for the current V6 evidence above.

# Historical V4 verification evidence

October 9, 2026. Reviewed/published V3 source was `6aef662e1505c338d29b35107a31234456f4d8b1`; fetched PR #15 was OPEN on the expected experiment branch with green CI. PR #14 remained OPEN/read-only at `02abb2097e184dc21fe102b349a9d43c2da1ad99`. Production baseline remains `580b25f69a724a5e0c54e15927e05eafcda6d887`. Only the isolated experiment is changed; production manifests, dependencies, source, entrypoint, Vite configuration, CI and persistence are untouched.

## Current actual verification

| Check                     | Actual V4 result                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Experiment clean install  | Passed: `npm ci --cache /tmp/homebase-audition-npm-cache`, 120 packages. Default cache path was unavailable in the managed sandbox; task-specific cache retry succeeded without changing manifests/lockfile. |
| Experiment unit tests     | **37 passed / 3 files**, five new focused cases beyond V3.                                                                                                                                                   |
| Typecheck                 | Passed; TypeScript 7.0.2 including typed browser runner.                                                                                                                                                     |
| Lint                      | Passed; existing type-aware Oxlint, zero warnings, no suppressions.                                                                                                                                          |
| Production build          | Passed; Vite 8.3.2, `dist/index.html` present.                                                                                                                                                               |
| Formatting / whitespace   | `npm run format:check` and `git diff --check` passed.                                                                                                                                                        |
| Evidence audit            | `python3 tests/audit.py`: five unchanged source hashes, local Markdown/asset links, storage/import/clock isolation scan, 24 representative solid-role contrast pairs passed.                                 |
| Built-preview browser run | **Chromium and actual Linux WebKit passed**: 434 geometry cases, 66 full-page scene checks and 144 midpoint cue-coverage cases. No browser exceptions or external runtime requests.                          |
| Production Homebase       | Separately: clean install (117 packages), **604 passing tests / 20 files**, typecheck, lint, build and formatting passed.                                                                                    |

The first added opacity assertion incorrectly compared CSS `#fff` with `#ffffff`; the observed card was correctly opaque white. The assertion now compares resolved RGB against the actual selected palette. The subsequent complete two-engine run passed. This was a test-authoring correction, not a product defect or disabled diagnostic. One preliminary browser run was superseded after separating the global cue from ambient backgrounds; final results below cover the final build.

Five new unit cases protect whole-atmosphere placement/finite contour geometry, both palettes of the explicit archive with retained tuning/view, in-place scene vs locally swept chrome keyframes, and cancellation on sketch-to-archive switching. Existing six-appearance, System precedence, immutability of appearance dimensions, cue retrigger/timer/removal, reductions, visibility and storage-disconnection tests remain passing.

### Browser matrix and actual assertions

Viewport matrix: **1440×900, 820×1180, 390×844, 844×390, 667×375, 320×640**. Both compositions, palettes and engines:

- 144 primary six-appearance layout cases.
- 240 archival layout cases (four existing library references plus V3 Landscape).
- 48 reserved-edge simulations and two open-menu cases.
- Within these, 66 full-page Landscape cases compare actual scene/stage rectangles on every edge, require no visible scenic band, retain three contour ranges/reflected water, and verify opaque academic card faces.
- **144 additional cue checks** trigger the cue and freeze its actual Web Animation at the illuminated midpoint. Scene rectangle must cover every stage edge within the 1px border tolerance and remain untransformed; sky/water must overlap and reach the top/bottom. This covers all six appearances, both views, all six sizes and both engines, including tall mobile documents and Basic's visible cue without ambient scenery.

Reserved edges are a CSS 44px left/right +34px bottom simulation at 390×844/667×375, not physical iOS safe-area measurements. Geometry asserts no horizontal overflow/clipped controls/content and minimum 44×44 targets. Archive selection stays a reference override, retains selected environment/palette and can return to integrated scenes. Actual motion/gradient phases, rim exclusion/XOR masks, live System/native color scheme, forced colors (Chromium), OS/manual reductions, opaque/unsupported fallbacks, keyboard/touch, bounded retriggers/cancellation/completion, offscreen pause and synthesized hidden-document handlers remain exercised. Browser storage getters throw; no access occurred.

Linux WebKit used the existing disposable browser cache/missing OS-library setup described in the historical record. Host-path validation was bypassed, **not the actual engine or any assertion**. This is desktop WebKit evidence, not physical iPhone Safari acceptance. Runtime build was fixed throughout the final complete run.

## Visual and reference evidence

[Targeted reference study](landscape-v4-references.md) distinguishes source/description evidence, failed preview fetches, paid-source exclusion and original geometry. No reference artwork was copied/traced or shipped. Magic UI attribution and pinned adapters remain intact.

**30 current Chromium screenshots**: all six appearances × Overview/Planner × desktop/phone (24), two desktop Landscape pulse frames, and four running archived-V3 Light/Dark desktop/phone frames. Screenshots were inspected for linework, full-page atmosphere, opaque content, full-height cue and genuine legacy comparison. [README image index](../README.md). V1/V2/V3 images remain historical. Cue images pause the actual discrete animations at the midpoint, not a custom mockup; still images cannot establish fluidity or native Safari rendering.

The active Landscape is original finite SVG/CSS: three independently sized sky/range/water planes, 20 nonblinking dark-mode stars, sparse open mountain/ridge contours, lightly filled drawn clouds and reflected water strokes. The scene spans the entire preview's document geometry. Existing neutral gallery controls/footer stay outside the concept space. No image/download, hatching/noise, shader, Canvas, particles, layout animation, new animation package or continuous JS frame loop. Older original V3 SVG and band dimensions remain inspectable as an archive.

The 70%-height scene pulse and lateral translation caused uncovered edges; both are removed. A separate full-stage cue field works even when Basic hides atmosphere. Scene pulses peak at 0.65; chrome still sweeps within local clips. Five regular/seven Landscape targets, one timer and **1,180ms maximum** remain. Pause/reduction/hidden/offscreen/appearance change/unmount cancellation is unchanged.

## Budget and performance

**Zero new dependencies**; five existing runtime packages and unchanged manifests/lockfile. Full isolated build: **262.58 kB JS raw /82.31 kB gzip; 38.83 kB CSS raw /8.65 kB gzip**. Relative to V3: approximately +1.33 kB compressed JS/+0.49 kB CSS, including the retained original scene. Fonts are unchanged. These are whole-gallery sizes, not hypothetical production integration costs; committed review PNGs are not bundled.

One-second headless Chromium samples from the final built preview, 1440×900/Balanced:

| Appearance      | Intervals observed | Median |    p95 | Running CSS animations |
| --------------- | -----------------: | -----: | -----: | ---------------------: |
| Lattice Light   |                 36 | 33.3ms | 33.4ms |                      1 |
| Lattice Dark    |                 37 | 33.3ms | 33.4ms |                      1 |
| Landscape Light |                 40 | 16.8ms | 50.0ms |                      1 |
| Landscape Dark  |                 45 | 16.7ms | 33.4ms |                      1 |

Basic's lack of continuous motion is checked in both engines. This is short, non-controlled cloud sampling, **not a guaranteed frame rate, phone benchmark or thermal/battery test**. Light Landscape's p95 includes slower frames; the expanded painted area and chrome blur remain real costs. Prior acceptable physical performance/warmth cannot automatically accept V4. Calm, Pause and opaque reductions remain available.

## Physical evidence and remaining review

The latest user-reported pre-V4 physical iPhone outcomes passed exactly: System follows iPhone appearance, smooth scrolling/rotation, correct reduced-motion/effects, acceptable sustained responsiveness/warmth, and an appealing mountain/cloud/lake/star direction. Preserve those facts separately from the earlier V2 passes below. Full-page blending, sketch treatment and desktop cue coverage were the requested revisions. **No new V4 physical outcome or final artistic approval is claimed.**

Retest Light/Dark Landscape in portrait and landscape, compare the old band, inspect desktop cue bottom/edges, repeat and pause cues, check reductions/System independence, and observe several-minute phone scrolling/rotation/responsiveness/warmth. The gallery has no editors and does not resolve DT-01. No production integration/persistence/PR #14 changes.

Hosted **CI / verify** checks production Homebase on the final PR head, not this standalone experiment/browser suite. Its exact-head run URL and outcome accompany PR #15 and the completion report; local experiment evidence remains separate. PR #15 and #14 must remain open and unmerged.

---

The following V3/V2/V1 records are historical; their counts, geometry, sizes and remaining physical-review statements do not substitute for the V4 evidence above.

# Historical V3 verification evidence

Historical V3 experimental revision on October 9, 2026, based on unchanged main `580b25f69a724a5e0c54e15927e05eafcda6d887`. Node 24.19.0/npm 11.9.0; same independent manifests, TypeScript 7.0.2, Vite 8.3.2, Oxlint 1.87.0/oxlint-tsgolint 7.0.2003 and Playwright 1.63.0. Evidence below distinguishes automated simulations from user-reported physical V2 observations.

## Current scope and checks

Three independent environments × Light/Dark; System resolves OS appearance, not clock time. One shared composition and landscape geometry; no six duplicated component trees. Runtime aviation art/styling has been removed. No new dependencies, storage, production source/schema/key changes or PR #14 edits.

- Clean independent `npm ci`: passed (120 packages).
- Experiment `npm test`: **32 passed across three files** (12 additional cases versus V2).
- Typecheck, type-aware zero-warning lint, production build, formatting and whitespace: passed. No suppressions.
- Source/contrast/link audit: **five unchanged source hashes, relative links, storage/import/clock isolation and 24 solid-role contrast pairs passed**.
- Chromium/WebKit: full six-appearance matrix plus archived licensed comparisons and reserved-edge simulations. **386 geometry cases passed** in the final complete two-engine built-preview run. This includes 144 primary appearance cases, 192 archived-source cases, two open-menu checks and 48 reserved-edge simulations. Final performance is recorded below.
- Separately rerun production: clean install (117 packages), **604 tests across 20 files**, typecheck/lint/build/format passed. No production file changes.

Unit coverage adds all six appearances, independent environment/palette retention, preset/view/pause/speed retention, System live changes/explicit override precedence/listener cleanup, shared geometry, bounded fixed stars, Basic motion semantics and Landscape sky/water cue retrigger/cancellation. Existing cue/reduction/fallback/isolation interactions remain covered.

Browser matrix: 1440×900, 820×1180, 390×844, 844×390, 667×375, 320×640; all six appearances in both compositions and engines. Four source comparisons are additionally checked in both palettes. It asserts actual control/content bounds, no overflow/clipping and 44×44 minimum targets. An additional 390×844/667×375 matrix reserves **44px left/right and 34px bottom** as a cutout-space simulation; this is not native iPhone safe-area measurement. Existing CSS continues using safe-area environment insets.

Behavior checks include live `prefers-color-scheme`/native `color-scheme`, explicit override precedence, resolved glass/sky/light tokens, stars hidden in Light and steady in Dark, Basic's absent cinematic layer/no continuous animations, shared rendered gradient/transform phases, rim-only mask compositing, cue sky/water/chrome count and bounded retrigger/cancellation, offscreen pausing, synthesized hidden-document cancellation, OS/manual reductions, opaque/unsupported fallbacks, keyboard/focus and touch across all appearances. Storage access throws in browser tests; unexpected runtime network requests/exceptions are rejected. No actual mobile tab-lifecycle or physical Safari claim.

## Physical V2 record supplied by the user

The user physically tested V2 on iPhone Safari and reported passing:

- Daylight animation.
- Portrait/landscape scrolling and rotation.
- Repeated light cues.
- Reduced-motion and reduced-effects behavior.
- Sustained responsiveness/performance.

The airport/airplane artistic direction required revision. These are exactly user-reported outcomes; no additional physical test result is inferred. V3 protects those interactions but **still requires physical review of its changed scene and six appearances**.

## Runtime budget and performance limits

Same five runtime packages; zero added packages. One CSS field for atmospheric variants, no continuous field in Basic. Original Landscape: one finite SVG with three mountain layers, two clouds, twenty steady stars, lake/reflection paths and a sun/moon disc. Scenic strip is 180px desktop/130px narrow. Cloud/water/wash motion uses bounded transforms; no Canvas/WebGL/stock image/particle/JS frame loop. Academic cards and labels retain approved solid roles. Magic UI MIT source attribution and snapshots are unchanged.

Lattice/Basic cues use five fixed decorative targets; Landscape adds sky and water (seven). Maximum remains 1,180ms, one timer; retriggers cancel previous animations. Pause/reductions/hidden/offscreen/unmount cancel before paint. Reduced motion provides static confirmation and no replay. Performance sampling RAF exists only in test code.

Short headless cloud samples do not predict sustained iPhone smoothness, battery/heat or native WebKit compositing. Gradients, promoted layers and static 18px chrome blur remain nonzero paint/memory costs. The user's V2 sustained-performance pass does not automatically accept V3. Final four-variant samples and exact build sizes follow.

## Final V3 build and four-variant samples

Full isolated gallery: **258.07 kB JavaScript raw / 80.98 kB gzip; 36.29 kB CSS raw / 8.16 kB gzip**. This includes all source comparisons and illustrative content, not an incremental production integration cost. Compared with V2, approximately +0.91 kB compressed JavaScript and +0.05 kB compressed CSS. Fonts/dependencies are unchanged; screenshots are review assets and are not bundled by the app.

One-second headless Chromium samples at 1440×900/Balanced against the final built preview:

| Appearance      | Frame intervals observed |  Median |     p95 | Active CSS animations |
| --------------- | -----------------------: | ------: | ------: | --------------------: |
| Lattice Light   |                       37 | 33.3 ms | 50.0 ms |                     1 |
| Lattice Dark    |                       39 | 33.3 ms | 33.4 ms |                     1 |
| Landscape Light |                       49 | 16.7 ms | 33.4 ms |                     1 |
| Landscape Dark  |                       50 | 16.7 ms | 33.4 ms |                     1 |

Basic has no continuous ambient animation (checked in both engines), rather than a fabricated timing estimate. Earlier preliminary V3 samples were similar but are not substituted for these final results. Desktop sampling is non-controlled and cannot prove physical iPhone performance.

All 26 committed V3 screenshots were generated from Chromium against this build: six appearances × Overview/Weekly Planner × desktop/phone, plus two Landscape cue frames. Rendered samples were inspected for scene recognition and solid control/content faces. They are not physical Safari screenshots.

## Hosted scope and remaining acceptance

Hosted **CI / verify** checks production Homebase only on the final PR head, not the experimental project/browser runner. Final run URL/conclusion is reported with delivery; local experimental evidence is separate. PR #15 and PR #14 remain unmerged.

Physical review still needs all six combinations, System changes, new landscape recognition/lighting, both compositions, presets, repeated cues/pause, reductions, portrait/landscape scrolling/rotation, pinch zoom and sustained responsiveness. No new physical acceptance, final artistic approval or DT-01 resolution is claimed.

---

The following is the earlier V2 automated record. Its counts, sizes and samples are historical, not current V3 evidence.

# Historical V2 automated evidence

Local verification: October 9, 2026. Independent experiment based on main `580b25f69a724a5e0c54e15927e05eafcda6d887`; Node 24.19.0, npm 11.9.0. This record covers the gallery, not physical Safari acceptance or approval of a final visual direction.

## Experiment checks

| Check                    | Actual outcome                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                 | Passed; independent unchanged lockfile, 120 packages installed                                                                        |
| `npm test`               | 20 passed across two files: 11 existing/updated interaction tests + 9 new lighting tests                                              |
| `npm run typecheck`      | Passed; TypeScript 7.0.2, source, unit tests and typed browser runner                                                                 |
| `npm run lint`           | Passed; type-aware Oxlint 1.87.0 + oxlint-tsgolint 7.0.2003, zero warnings, no suppressions                                           |
| `npm run build`          | Passed; Vite 8.3.2, independent `dist/index.html`                                                                                     |
| `npm run format:check`   | Passed; experiment source/config/tests and Markdown                                                                                   |
| `git diff --check`       | Passed                                                                                                                                |
| `python3 tests/audit.py` | Passed: five pinned source hashes, local links, isolation scan and 24 solid-role contrast checks                                      |
| `npm run test:browser`   | Chromium and WebKit passed against development and built preview; 338 geometry cases each complete run, plus behavior/fallback checks |

Matrix: 1440×900, 820×1180, 390×844, 844×390, 667×375 and 320×640; both themes; integrated scene plus six archival modes; Overview and Weekly Planner; both engines (336 combinations plus two open-menu checks). It tests actual document/control/card bounds, no horizontal clipping/overflow and 44×44 minimum hit targets. Controls scroll in document flow in short landscape. Screenshots cover both integrated scenes and compositions at desktop/phone sizes, plus both desktop cue frames.

Additional assertions compare the **actual rendered** shared field, navigation/menu/action-holder gradients, active/primary rims and sky transform at two animation phases. They also assert exclusion/XOR mask compositing: prefixed shorthand must not reset modern masks to additive layers over text. Screenshot inspection identified and corrected that V2 mask-order defect before delivery. They verify retained tuning across theme changes, pause/resume, CSS motion removal under OS/manual reductions, opaque no-blur reductions, pointer reflections and cleanup, keyboard Enter/Space/focus, touch cue/composition switching, five fixed cue nodes, bounded repeated cue animations, immediate pause cancellation, timed completion, actual offscreen pausing and synthesized hidden-document cancellation. Unsupported registered properties, backdrop blur and motion paths have static/opaque fallbacks. Chromium additionally checks forced colors. Tests throw on any localStorage/sessionStorage access, reject external runtime requests and record browser exceptions; none were observed. Synthesized visibility tests exercise the handler, not an actual iOS tab lifecycle.

Unit cue checks cover repeated triggering/one timer, cancellation on pause/motion/effects/theme/unmount, static confirmation without replay, unavailable animation API and theme/preset/composition retention. No test violation or broad lint suppression was added.

Linux WebKit needed missing browser OS libraries. Official Debian packages were extracted into `/tmp/homebase-webkit-libs`; missing shared-library symlinks were added only inside the disposable Playwright browser cache (bundled existing libraries preserved). `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` bypassed the system-path checker; **the real WebKit engine launched and all assertions ran**. No application behavior or browser assertion was disabled. Standard Windows instructions remain `npx playwright install chromium webkit`. Linux Playwright WebKit is not physical iPhone Safari.

## Contrast, links and source provenance

`python3 tests/audit.py` verifies five unchanged upstream SHA-256 hashes and every relative Markdown/asset link. It scans runtime source for forbidden storage keys/APIs and cross-project imports. Isolation is also checked by the Git diff and storage-throwing browser tests; the scan alone is not a security proof.

Twenty-four representative solid-role combinations meet 4.5:1 ordinary text and 3:1 essential edge/focus targets. Daylight solid text 15.83:1, muted 6.07:1, action label 6.70:1, control edge 4.76:1; Night equivalents 14.50:1, 8.30:1, 12.34:1, 4.47:1. Weakest checked session metadata: 5.47:1. Exact pairs/ratios are written to ignored `test-results/contrast-report.json`.

Academic cards and controls retain opaque text plates. The audit does **not** claim every mixed glass/background pixel passes contrast. Decorative lights carry no required meaning: selected navigation also uses a label, border and `aria-current`; cue confirmation uses text and a check icon. Approved solid-role colors are unchanged.

## Runtime and size budget

- Existing runtime packages: **5** (React, React DOM, Lucide, DM Sans, Manrope). New packages: **0**. No animation/effect framework, Canvas, WebGL, global mouse listener, network image or perpetual JS render loop.
- One inherited CSS field changes primary X/Y, secondary X and wash angle. Large sunlight/reflection/wash layers use transforms; small chrome gradients reflect the same field. Registered-property support is gated; unsupported browsers get a static field rather than discrete jumps.
- Night geometry: 24 stars, 36 runway points, 20 taxiway points; horizon height 260 CSS px, directional wash capped at 650 CSS px. Light points remain steady.
- Pointer work: one pending RAF per glass wrapper, event-driven, canceled on pause/unmount. Ambient positions never enter React state. No work is required from hover on touch.
- Cue: five fixed layers, five discrete Web Animations, one timer, maximum duration 1,180 ms. Retrigger cancels/replaces; layout-effect cancellation precedes the next paint. Reduced/unsupported animation gives static confirmation only.
- Pause/hidden/offscreen freezes CSS movement and cancels pointer/cue work. Reduction removes continuous movement; reduced effects removes atmosphere/blur/glow and makes materials opaque. No automatic replay.

The full standalone build includes both environments, all archived effects and illustrative compositions. Its size is **not** the incremental cost of a future production integration. **Final JavaScript: 255.00 kB raw / 80.07 kB gzip; CSS: 35.66 kB raw / 8.11 kB gzip.** Relative to V1, approximately +1.15 kB compressed JS and +1.41 kB compressed CSS; local Latin WOFF2 fonts remain approximately 70.65 kB. Font WOFF fallbacks also exist; supporting browsers fetch WOFF2 rather than both formats.

### Performance investigation and limits

The first V2 shared-gradient implementation repainted large background areas. A separate two-second Chromium sample observed Night median 50 ms/p95 50.1 ms; removing blur alone still gave median 33.5 ms/p95 50 ms. Day without blur gave median 50 ms/p95 100.1 ms; hiding the large atmosphere restored median 16.7 ms/p95 16.8 ms. This evidence led to moving the large rays/reflection/wash with transforms, leaving only small chrome gradients position-sensitive.

After that correction, a separate two-second sample observed Night 87 frame intervals, median 16.7 ms/p95 33.4 ms; Day 65 intervals, median 33.3 ms/p95 33.4 ms. Earlier built-preview sampling while other verification ran was substantially worse (8 Day / 12 Night intervals in one second). This variation is retained rather than represented as a stable frame-rate guarantee. The pre-mask-correction built runner observed Day 37 intervals/median 33.3 ms/p95 33.4 ms and Night 55/16.7/33.3 ms. Final rim regression and runner samples are recorded below.

Final built-preview run, after the rim correction (one-second headless Chromium sample, 1440×900/Balanced):

| Scene        | Frame intervals observed |  Median |     p95 | Active CSS animations |
| ------------ | -----------------------: | ------: | ------: | --------------------: |
| Daylight     |                       33 | 33.3 ms | 50.0 ms |                     1 |
| Night Flight |                       45 | 16.7 ms | 33.4 ms |                     1 |

These are short non-controlled cloud observations. The sampler's RAF is **test code only**, not shipped runtime. CSS gradient updates and fixed 18px chrome blur still incur paint/compositing and memory costs; layers are finite but are not free. Desktop measurements cannot prove physical iPhone frame rate, thermal/battery behavior or Safari compositing. Calm, pause and opaque reductions remain available. Still screenshots demonstrate layout/materials, not fluidity.

## Production verification and hosted CI scope

Separately rerun at repository root: clean `npm ci` (117 packages), **604 tests passed across 20 files**, typecheck, type-aware lint, production build and formatting passed. Production source, manifests/lockfile, Vite/entrypoint/workflow, persistence keys/schemas and scheduling behavior are unchanged. No PR #14 edits. Experiment tests keep their separate `*.audition.tsx` discovery pattern; no root scripts/dependencies/CI changes.

Hosted **CI / verify** verifies production Homebase on the experimental PR head. It does not build or run this independent gallery. Local experimental tests/browser checks are separate evidence; no hosted experimental coverage is claimed. Exact final-head hosted run URL/conclusion accompany the PR delivery report.

## Historical V1 evidence

V1 reviewed head `bed4997a9ba6b0752c287d38e370e784e6942ca7`: 11 unit tests, 288 geometry cases in each complete two-engine dev/build run, five source hashes and 24 contrast pairs passed. JavaScript 250.99 kB raw/78.92 kB gzip; CSS 27.72/6.70 kB. Four adapters separately built with React externalized measured 3,647 bytes raw/1,286 gzip excluding CSS; that is **historical V1**, not a newly measured V2 adapter size. Initial V1 one-second samples showed 44 lattice intervals (median16.7/p95 33.4 ms) and 59–60 for other candidates (median16.7/p9516.7–16.8); repeat built-preview showed 59–60 across effects. V1 screenshots are retained as historical comparison assets. These older results are not substituted for current-head verification.

## Physical acceptance still required

At the time of the V2 automated delivery below, no physical acceptance had been reported. The user subsequently supplied the V2 passing results recorded in the current V3 section above. On the Windows LAN server, test both themes in Overview and Weekly Planner, all three presets, intensity/speed, notes menu, repeated cue taps, pause mid-cue, both reductions, rotation/short-landscape scrolling, pinch zoom and several-minute warmth/smoothness. Judge lighting visibility/readability and report flicker, abrupt transitions or touch issues. Source/library archives need not be the primary comparison. The experiment has no Date/Time inputs and cannot resolve DT-01. Visual direction remains pending user feedback.
