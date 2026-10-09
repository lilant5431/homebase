# Homebase · Visual Audition / Phase 2.6A-V2

A working, isolated material lab for comparing light, glass and motion **around actual content**. This is a visual experiment, not Homebase integration or an approved final direction. Overview and Weekly Planner contain fixed illustrative records. No production modules, scheduling engines, persistence, editors or accounts are connected.

## Run on Windows and iPhone

Install Git and Node.js **24.19.0** (the verified version), then use PowerShell:

```powershell
git clone --branch experiment/phase-2-6a-v-visual-audition https://github.com/lilant5431/homebase.git homebase-audition
cd .\homebase-audition\experiments\phase-2-6a-v-visual-audition
npm ci
npm run dev
```

Open **http://localhost:5175/** on the PC. Vite listens on `0.0.0.0`, requires port **5175**, and prints the PC's Network URL. It does not change Homebase's normal server. Keep PowerShell running.

On an iPhone on the **same Wi-Fi**, open the printed Network URL, for example **http://192.168.1.42:5175/**. Use the PC's actual address, not this example or the cloud environment's address. If Windows asks, allow this Node server on your private network. A managed device/network may prohibit LAN access. This experiment requires no secure-context-only API or `crypto.randomUUID`, and does not disable pinch zoom.

The cloud development preview, while the server is running, is http://localhost:5175/ in the environment's browser/forwarded preview. It is not a public deployment or a URL reachable from your phone without forwarding. No hosting was configured.

## How to audition

1. Choose **Daylight — Integrated Sunlit Lattice** or **Night Flight — Integrated Illuminated Horizon**. These are the two primary environments, each with shared reflective glass.
2. Compare **Calm**, **Balanced** and **Cinematic**. Presets change intensity and speed; custom sliders clear the preset. Theme changes preserve tuning, pause, reductions and the selected composition.
3. Open **Fine-tune & accessibility** (collapsed on a freshly loaded phone). Intensity affects atmosphere and decorative rims, never text opacity. Speed changes the shared CSS field's duration.
4. **Pause** freezes ambient motion and clears pointer reflections; it cancels any running cue. Hidden/offscreen effects pause too. Resume never replays an old cue.
5. **Reduce motion** stops nonessential movement and uses static cue confirmation. **Reduce visual effects** removes atmosphere, glow and blur and makes glass opaque; it also stops movement. Device reductions and forced colors take precedence and cannot be disabled by Reset.
6. Switch **Overview / Weekly Planner**, inspect a record, and open **Preview notes** to see reflected menu glass around opaque text. These are real read-only interactions with illustrative content.
7. **Play light cue** briefly illuminates environment → navigation → selected item → action holder → primary rim. Repeated taps restart five fixed decorative layers, not accumulating animations. The confirmation explicitly says no work was saved or scheduled. Pause, reductions, scene changes, hiding and unmount cancel the cue.
8. **Sources & archived comparisons** retains library-default/adaptation comparisons. Border Beam and Shimmer are **rejected**, not primary design choices. Static CSS is only a performance/reduction reference. Return to integrated themes using the same selector. Source comparison selection is retained across theme changes.
9. **Reset** restores Balanced tuning and clears manual reductions, pause and library defaults while retaining theme, selected reference and composition. Settings remain in memory only.

All settings reset on reload. The app never accesses localStorage, sessionStorage or the three Homebase persistence keys. No analytics, external runtime requests, user records, images, APIs or login. Official source links only navigate when you choose them.

## Two integrated environments; archived technical references

| Environment     | Current lighting                                                                                                                 | Reuse                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Modern Daylight | Full-workspace sunlight and geometric reflections; shared moving glass/selected-control edges                                    | Attributed Magic UI Grid Pattern and Magic Card gradient techniques |
| Night Flight    | Visible cyan runway and amber taxiway lights, bounded horizon, sparse stars and moving directional wash; shared reflected chrome | Original SVG/CSS horizon + attributed Magic Card gradient technique |

A single inherited CSS light field drives background and chrome. This is visually coordinated lighting, **not physically accurate propagation**. Native **Preview notes** demonstrates menu glass without installing a menu library. Academic content stays opaque.

The six original effect choices remain in the technical disclosure: lattice, horizon, glass, Border Beam, Shimmer and static baseline. They are references rather than an active six-way shortlist. Source-default comparisons remain available where applicable; no licensed source snapshots were replaced.

Copyright **Magic UI**, MIT. Full notice: [vendor/MAGIC-UI-LICENSE.txt](vendor/MAGIC-UI-LICENSE.txt). Pinned upstream snapshots and SHA-256 hashes: [vendor/source-manifest.json](vendor/source-manifest.json). Runtime adaptations: [LibraryEffects.tsx](src/components/LibraryEffects.tsx) and [styles.css](src/styles.css). Snapshot `.txt` files are evidence, not compiled modules.

**React Bits and Aceternity source is not included.** React Bits' actual license restricts component redistribution; Aceternity public registry redistribution permission could not be established. The [11-component audit](research/component-audit.md) links official demos, actual inspected source and license evidence. shadcn/ui informed semantics only. No paid components or animation libraries are installed. Lucide icons are from `lucide-react` (ISC); local Fontsource font files use the fonts' SIL Open Font License. Full notices for Magic UI and the five runtime packages are also copied to [public/third-party-notices.txt](public/third-party-notices.txt), which Vite includes in the built distribution at `/third-party-notices.txt`.

## Verification

From this directory:

```powershell
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run format:check
```

For browser checks, keep `npm run dev` running in another terminal:

```powershell
npx playwright install chromium webkit
npm run test:browser
```

`AUDITION_URL` can point the browser runner at an independently started built preview instead. Linux may need Playwright's browser OS dependencies. The runner fails if either engine is unavailable; it does not silently count a missing WebKit run as passing. Results go to ignored `test-results/`; reproducible screenshots go to `screenshots/`.

Tests use `src/**/*.audition.tsx`, explicitly included by this project's Vitest configuration, to avoid discovery by production Homebase's default `*.test.*` patterns. Type-aware Oxlint includes source, these tests and the typed browser runner with no suppressions. Dependency/configuration files are independent. Existing repository **CI / verify** checks production Homebase, not this experiment; the experimental verification evidence is recorded separately in [verification.md](research/verification.md).

## Visual evidence and recommendations

- [Daylight Overview · desktop / Balanced](screenshots/v2-daylight-overview-desktop.png)
- [Night Overview · desktop / Cinematic](screenshots/v2-night-overview-desktop.png)
- [Daylight Weekly Planner · desktop](screenshots/v2-daylight-planner-desktop.png)
- [Night Weekly Planner · desktop](screenshots/v2-night-planner-desktop.png)
- [Daylight Overview · phone](screenshots/v2-daylight-overview-phone.png)
- [Night Overview · phone](screenshots/v2-night-overview-phone.png)
- [Daylight Weekly Planner · phone](screenshots/v2-daylight-planner-phone.png)
- [Night Weekly Planner · phone](screenshots/v2-night-planner-phone.png)
- [Daylight cue · desktop](screenshots/v2-daylight-cue-desktop.png)
- [Night cue · desktop](screenshots/v2-night-cue-desktop.png)
- [Candidate comparison and integration recommendations](research/homebase-visual-recommendations.md)

Still screenshots cannot demonstrate fluidity, pointer response, performance or native Safari behavior. Use the running gallery to judge these. Screenshots were produced in Chromium, not physical iPhone Safari.

## Boundaries and limitations

This does not resolve DT-01, redesign native inputs, implement theme persistence, alter PR #14, or implement the Homebase UI. The approved design branch is a read-only reference. Glass exterior opacity and atmosphere here are **experiments**, not replacements for approved semantic contrast roles.

Safari's blur, motion-path masking, container units and GPU behavior vary by version/device. Blur and motion-path feature gates provide opaque/static fallbacks; browsers without CSS registered custom properties retain static coordinated reflections; old browsers without container units keep a usable opaque button. There is no Canvas/WebGL loop, unbounded particle count or animation framework. CSS backdrop-filter and animated gradients can still consume significant GPU/paint work. Desktop profiling and Playwright WebKit cannot prove iPhone battery, heat, sustained frame rate or physical Safari acceptance.

Physical check: at portrait and both short-landscape sizes, reach every control, compare both integrated themes and presets, open Preview notes, retrigger the light cue three times, pause during it, use both reductions and inspect both compositions and verify page scrolling/pinch zoom. Report which light/glass combinations you prefer and any warmth, dropped frames, flicker or readability issue. **Visual selection remains pending user feedback.**

Previous V1 screenshots remain as historical comparison assets. The V2 links above are the current audition evidence. To update an existing Windows checkout, run `git pull --ff-only` on the experimental branch, then `npm ci` and `npm run dev` in this directory.
