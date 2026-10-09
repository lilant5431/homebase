# Verification evidence

Local verification performed October 9, 2026 on the isolated experiment branch, based on main `580b25f69a724a5e0c54e15927e05eafcda6d887`. Node 24.19.0, npm 11.9.0; pinned package versions are in the independent manifest/lockfile. This evidence covers the gallery, not physical Safari acceptance or approval of the visual direction.

## Experimental checks

| Check                  | Actual outcome                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci`               | Passed; independent lockfile, 120 installed packages                                                                                                                                       |
| `npm test`             | 11 passed; all six effects, themes, presets/sliders, pause/reset, reductions, comparison restrictions, contextual actions, live OS changes/listener cleanup, no-storage/fallback operation |
| `npm run typecheck`    | Passed; TypeScript 7.0.2, source, unit tests and typed browser runner                                                                                                                      |
| `npm run lint`         | Passed; type-aware Oxlint 1.87.0 + oxlint-tsgolint 7.0.2003, zero warnings, no suppressions                                                                                                |
| `npm run build`        | Passed; Vite 8.3.2, independent `dist/index.html`                                                                                                                                          |
| `npm run test:browser` | Chromium and WebKit passed; 288 geometry cases plus behavioral/fallback checks                                                                                                             |

Formatting and whitespace checks were run after documentation preparation. The exact hosted result accompanies the PR review report; an earlier production CI result is not substituted for a new-head check.

The browser matrix includes 1440×900, 820×1180, 390×844, 844×390, 667×375 and 320×640, both themes, six effects and both contextual screens in both engines. It checks actual document/control/card geometry, horizontal clipping and **44×44** minimum targets (checkbox labels are the hit target). Fine-tuning can be expanded in document flow; no fixed sidebar or body lock hides controls in landscape.

Additional real-browser assertions verify CSS animations are paused/resumed, OS/manual motion reduction removes continuous animations, reduced-effects chrome is opaque with no blur, pointer lighting responds then clears on pause, comparison changes the actual component, light cue/details work, keyboard outline is visible, and unsupported blur/motion path fall back. Chromium additionally checks forced colors. Tests throw on **any** localStorage/sessionStorage access and reject external runtime requests. No browser exceptions were observed. These are useful bounded checks, not proof of every possible accessibility/browser state.

WebKit initially could not launch because the host checker could not find `libGLESv2.so.2`. The actual dependency was already available under `/tmp/homebase-webkit-libs/root/usr/lib/x86_64-linux-gnu`; using that loader path and bypassing the checker's false-negative probe allowed the actual engine to launch and complete the tests. No app behavior, rule or assertion was disabled. Linux Playwright WebKit is not physical iPhone Safari.

## Source, contrast and link audit

Run `python3 tests/audit.py` from the experimental directory. It checks five pinned-source SHA-256 hashes, local Markdown/asset links, runtime storage/persistence-key/import isolation, and 24 representative **solid-role** contrast combinations. Targets: 4.5:1 ordinary text, 3:1 essential edges/focus. It writes an ignored `test-results/contrast-report.json` with the exact foreground/background/ratio for each pair.

The checked ratios include Daylight solid text 15.83:1, muted text 6.07:1, action label 6.70:1 and control edge 4.76:1; Night equivalents are 14.50:1, 8.30:1, 12.34:1 and 4.47:1. The weakest checked session metadata pair is 5.47:1.

Contrast evidence includes foreground/muted on solid content, muted on canvas, primary action labels, essential control borders/focus, and text/metadata on the three subject session backgrounds in both themes. It does not claim that every mixed glass/background pixel was contrast-audited. Important controls use opaque plates, and reduction keeps the same roles. Decorative rims need not carry important meaning: active items also have an opaque label, border and `aria-current`; session intent has text and icons.

## Measured size and rendering behavior

Production build of this standalone gallery (all effects and compositions included):

- JavaScript: **250.99 kB raw / 78.92 kB gzip**.
- CSS: **27.72 kB raw / 6.70 kB gzip**.
- Five locally hosted Latin WOFF2 fonts total approximately **70.65 kB**. WOFF fallback files also exist in the build; supporting browsers fetch the WOFF2 faces rather than both formats.
- Runtime packages: **5** (React, React DOM, Lucide, DM Sans, Manrope). Effect/animation-specific runtime packages: **0**. Development tools remain isolated.
- Four library adapters built separately using Vite library mode with React and JSX runtime externalized: **3,647 bytes raw / 1,286 bytes gzip**, excluding CSS and React. This is an approximate code-size bound, not the incremental production bundle cost or GPU cost. Their SHA-pinned originals are not bundled.

All techniques are CSS/SVG or scoped event-driven pointer updates. No Canvas, WebGL, per-particle JavaScript, global mouse listener, external image or perpetual JS render loop. Horizon is bounded at 24 stars and 36 lights. The glass handler coalesces one pending animation frame and cancels it on pause/unmount; no looping frame callback. CSS animation pauses when the stage is offscreen or the document hidden. A fixed-size blur kernel is only used on navigation/floating chrome, never animated over content.

One-second headless Chromium requestAnimationFrame samples at 1440×900, Night Flight/Balanced, on the cloud host:

| Effect           | Frames observed | Median interval | p95 interval | Running CSS animations |
| ---------------- | --------------: | --------------: | -----------: | ---------------------: |
| Sunlit lattice   |              44 |         16.7 ms |      33.4 ms |                      3 |
| Airport horizon  |              59 |         16.7 ms |      16.8 ms |                      1 |
| Reflective glass |              60 |         16.7 ms |      16.7 ms |                      0 |
| Border Beam      |              60 |         16.7 ms |      16.8 ms |                      1 |
| Shimmer Action   |              60 |         16.7 ms |      16.7 ms |                      2 |
| Static baseline  |              60 |         16.7 ms |      16.8 ms |                      0 |

A repeat against the clean built preview also passed the 288-case matrix in both engines. That short frame sample observed 59–60 intervals per effect, median 16.7 ms and p95 16.7–16.8 ms. The variation from the first lattice sample underscores why these observations are not a controlled benchmark.

The sampler itself uses RAF only during measurement; it is test code, not shipped runtime code. This is a short, non-controlled cloud observation, not a benchmark promise. Lattice missed more frames; reduce its illuminated area or use the static variant if physical-phone observation confirms a problem. Stationary glass was sampled, so these numbers do not measure a sustained pointer repaint. Desktop headless timing cannot prove iPhone battery, heat, compositor behavior or sustained smoothness. Static screenshots demonstrate layout/materials only.

## Production regression and CI scope

Separately run at the repository root: clean `npm ci`, **604 passing tests across 20 files**, typecheck, type-aware lint, build and formatting all passed. Production manifest, lockfile, source, entrypoint, Vite configuration, workflow and persistence contracts are unchanged. The experiment uses its own unit-test filename pattern to preserve root discovery behavior.

Existing hosted **CI / verify** verifies production Homebase on the experiment PR head. It is not configured to build this independent experiment. The local experimental/browser evidence above must therefore be reviewed separately; no hosted experimental coverage is claimed. No root scripts, dependencies or CI configuration were added.

## Physical acceptance still required

No physical iPhone/iPad test was performed. LAN reachability from a real PC, Safari native compositing, pinch zoom, touch, reduced settings and several-minute thermal behavior remain user acceptance items. The gallery contains no Date/Time inputs and cannot close DT-01. Visual choices require user feedback before production work is authorized.
