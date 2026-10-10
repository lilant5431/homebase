> Historical V5 only, superseded by V6. The retired third material is recorded here solely to preserve measurements from commit `36954bc80afcd785a41db821507c68757bb0c934`. It is unavailable in the current gallery; its screenshots have been removed. These are not current options, acceptance gates or comparison recommendations.

# Archived V5 verification evidence

October 9, 2026. Inspected PR #15 OPEN at V4 `3981f4b32e1d1d5bccf5b9aa7aa4444963c81a40`; PR #14 remains OPEN/read-only at `02abb2097e184dc21fe102b349a9d43c2da1ad99`. Production baseline is `580b25f69a724a5e0c54e15927e05eafcda6d887`. All changes remain under the independent experiment; production source, manifests, schemas, keys, Vite and CI definitions are unchanged.

## Scope and material recipes

Solid remains the original opaque default. One React-state material survives environment/palette/view/tuning/reset changes and does not restart a cue. Frosted uses 72% surface alpha, 4px blur (3px at phone widths) and stronger local metadata colors. Clearer uses 26% Light/24% Dark alpha, 1px blur and opaque text plates. Text/card subtree opacity remains 1. Actual cards/metrics change; native editors and critical detail/session surfaces are not made translucent. Reduction and unsupported backdrop filtering force fully opaque content without losing the selected material. Restoring effects restores the choice. No storage or new packages.

Moonlit Lattice is the existing Lattice + Dark, with steel geometry, lunar/silver light, a #07101E/94% navigation recipe and #080F1B branding plate. Lattice geometry, motion and shared cue semantics remain unchanged. Landscape V4 SVG and scene layers are unchanged: material transparency makes the existing contours/clouds/water visible through content, with no new scenery complexity.

### Findings resolved during verification

The built-browser filter assertion exposed a minification problem: standard `backdrop-filter` preceding the WebKit-prefixed declaration was omitted from the built CSS. Prefix-first/standard-last ordering retains both declarations and their original values. Regression assertions now require actual bounded content blur and shared 18px navigation blur in the production build. Existing opacity/unsupported fallbacks still require computed `none`. This corrects syntax compatibility within the experiment only; no production changes or rule suppressions.

The higher-specificity Moonlit shadow selectors also needed explicit reduction fallbacks. Tests require no branding/navigation halo under reduced effects while keeping the active inset marker. Two exploratory runner issues (normalized CSS color serialization and a closed native controls disclosure) were corrected in tests, not by weakening rendered assertions or application interactions.

## Local verification

| Check                                          | Actual result                                                                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean experiment install                       | Passed, 120 packages; task-specific npm cache, unchanged manifests/lockfile.                                                                  |
| Experiment units                               | **48 tests / 4 files**, 11 new cases beyond V4.                                                                                               |
| Typecheck, lint, build, formatting, whitespace | Passed; type-aware zero-warning lint, no suppressions; `dist/index.html` exists.                                                              |
| Built browser matrix                           | **Chromium and actual Linux WebKit passed**: 728 geometry, 162 full-page scene, 432 midpoint cue cases.                                       |
| Source/link/licensing audit                    | Passed: five unchanged hashes, Markdown/assets, storage/import/clock scan; 24 solid pairs + 8 blended-envelope text checks.                   |
| Sampled material contrast                      | Both engines passed: 24 scene/material/view/width combinations and 528 computed text roles each; actual RGB swatches differ across materials. |
| Root Homebase                                  | Separate clean install (117 packages), **604 tests / 20 files**, typecheck/lint/build/format/whitespace passed.                               |

## Browser evidence and limits

Primary matrix: all three materials × six appearances × Overview/Planner × 1440×900, 820×1180, 390×844, 844×390, 667×375, 320×640 × both engines. Archival source comparisons remain tested with Solid. Simulated reserved edges (44px sides/34px bottom) cover 390×844 and 667×375 with Clearer; these are not physical safe-area measurements. Six unsupported-blur geometry cases additionally prove opaque rendering.

Checks require computed alpha, bounded filters, card/text opacity 1, local opaque Clearer backing, unchanged Moonlit branding tokens, actual material pixel differences, no clipping/document overflow, 44×44 targets, navigation/focus/touch and cue coverage. Shared motion phases, bounded retriggers/cancellation, Pause, OS/System, live color scheme, forced colors, reduced motion/effects and offscreen/hidden behavior remain exercised. No exceptions or external runtime requests. Storage getters deliberately throw; none were accessed.

Contrast uses scene-only screenshots with composition temporarily hidden (layout retained), sampling a 12px grid across each real panel footprint. Source-over blending uses computed panel RGB/alpha and foreground roles; Clearer additionally requires computed opaque local backing. Bright/dark extrema and a full black/white envelope cover uncertainty from blur averaging and light pulses. These are representative role checks, **not certification of every glyph or arbitrary future background**. Test-only Canvas samples PNGs; none is introduced into runtime. [Recorded material comparisons](material-v5-results.md).

Linux WebKit runs the actual engine using the existing disposable browser cache/library setup, with host-path validation bypassed but all engine assertions retained. It is not physical Safari, touch/keyboard/thermal acceptance or a guarantee of blur availability on every device.

## Visual inspection

**50 current Chromium renders**: 40 desktop/phone context images (all six appearances in Solid, Landscape in all materials), two cue frames, four live V3 archive frames, two branding close-ups and two Sunlit/Moonlit comparison sheets composed from actual rendered previews. [README index](https://github.com/lilant5431/homebase/blob/36954bc80afcd785a41db821507c68757bb0c934/experiments/phase-2-6a-v-visual-audition/README.md). V1–V4 assets remain historical and intact. Inspected desktop and long phone layouts across upper/middle/lower regions: Clearer exposes the original mountain/water marks while text stays backed; Frosted is quieter, with bounded blur. These are working-render screenshots, not physical iOS acceptance or conceptual mockups.

## Budget and observed performance

Zero dependencies added or upgraded; five runtime packages and lockfiles unchanged. Build **263.57 kB JS /82.62 kB gzip; 42.11 kB CSS /9.25 kB gzip** (fonts unchanged). Versus V4, approximately +0.31 kB compressed JS/+0.60 kB CSS. Committed review PNGs are not bundled. No new runtime frame loop, scenery, shader or particle system.

One-second headless Chromium samples, Balanced/Overview, compared all materials at both widths. Values below are **median / p95 milliseconds**, not promised frame rates:

| Appearance/material       | 1440px desktop | 390px phone viewport |
| ------------------------- | -------------- | -------------------- |
| lattice Light / solid     | 33.3 / 50.1    | 16.7 / 16.7          |
| lattice Light / frosted   | 50.0 / 50.1    | 16.7 / 16.7          |
| lattice Light / clearer   | 49.9 / 50.1    | 16.7 / 16.8          |
| lattice Dark / solid      | 33.3 / 33.4    | 16.7 / 16.8          |
| lattice Dark / frosted    | 50.0 / 50.1    | 16.7 / 16.8          |
| lattice Dark / clearer    | 50.0 / 50.0    | 16.7 / 16.7          |
| landscape Light / solid   | 33.3 / 50.1    | 16.7 / 16.8          |
| landscape Light / frosted | 33.4 / 50.0    | 16.7 / 33.4          |
| landscape Light / clearer | 33.4 / 50.1    | 16.7 / 16.7          |
| landscape Dark / solid    | 33.3 / 50.0    | 16.7 / 16.8          |
| landscape Dark / frosted  | 50.0 / 66.8    | 16.7 / 16.8          |
| landscape Dark / clearer  | 33.4 / 50.0    | 16.7 / 16.8          |

All samples reported one running shared CSS animation. Overview adds up to five content filters, Planner one; content blur is 4px desktop/3px phone for Frosted, 1px for Clearer, alongside existing 18px chrome. Desktop translucent samples show a real cost (for example Dark Landscape Frosted median 50ms/p95 66.8ms vs Solid 33.3/50.0); 390px samples mostly stayed around 16.7ms, with Light Frosted p95 33.4ms. These short, sequential, uncontrolled cloud observations are neither hardware-isolated benchmarks nor physical phone/thermal results. They do not prove the effects are inexpensive. Keep Solid default, bounded blur, explicit reductions and instant opaque fallback; obtain sustained physical feedback before integration.

## Physical acceptance and next review

The user approved V4 **Landscape Light, full-page sketch vs V3's band, full-stage desktop cue, iPhone cues, scrolling/rotation, reduced motion/effects, and sustained responsiveness/warmth**. Those reports do not approve all six appearances and do not automatically accept V5 material cost.

Remaining V5 physical steps: directly compare Sunlit/Moonlit branding/navigation; inspect Landscape Dark Solid/Frosted/Clearer and Light Frosted in both views; inspect top/middle/lower long phone content in portrait/landscape; switch appearances/materials without losing selection/view/tuning, play/retrigger/pause cues, restore Solid/reduced effects; observe several-minute responsiveness/warmth. No new physical result or finalized design direction is claimed. DT-01 and native editors remain outside this isolated gallery.

Hosted **CI / verify** must pass on the exact published head; the final review report links that run. Hosted CI checks production only, not these independent experiment/browser checks. PR #15 stays open/unmerged; PR #14 remains unchanged.
