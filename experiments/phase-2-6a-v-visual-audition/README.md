# Homebase · Visual Audition / Phase 2.6A-V

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

1. Choose **Daylight** or **Night Flight**, then select one of six live effects.
2. Compare **Calm**, **Balanced** and **Cinematic**. Presets change intensity and speed; custom slider changes clear the selected preset.
3. Open **Fine-tune & accessibility**. It starts collapsed on a freshly loaded phone. Intensity affects atmosphere/rims rather than text opacity. Speed affects moving candidates; it is disabled for static or direct-pointer effects.
4. **Pause** freezes effect motion and pointer lighting. Resume restores it. Offscreen and hidden-tab effects also pause.
5. **Reduce motion** stops continuous movement. **Reduce visual effects** removes atmosphere/glow and replaces glass with opaque surfaces; it also stops motion. OS reductions and forced colors take precedence over manual controls and cannot be disabled by Reset.
6. **Library defaults** compares source palette/geometry/cadence against tuning for the four licensed adaptations. This is not a claim of an unmodified upstream demo. It is disabled for original effects. The untuned grid is static, so speed is disabled.
7. Switch **Overview / Weekly Planner** in the illustrative navigation. Inspect an assignment or session to open a real read-only detail panel. **Play light cue** runs a decorative feedback cue and announces what happened; it never claims a save or lock.
8. **Reset** restores Balanced tuning and clears manual reductions, pause and candidate mode, while retaining the selected theme/effect/composition. Device-requested reductions remain honored.

All settings reset on reload. The app never accesses localStorage, sessionStorage or the three Homebase persistence keys. No analytics, external runtime requests, user records, images, APIs or login. Official source links only navigate when you choose them.

## Six running effects

| Effect              | Reuse                                         | Live difference                                                      |
| ------------------- | --------------------------------------------- | -------------------------------------------------------------------- |
| Sunlit lattice      | Magic UI Grid Pattern + original sunlight     | SVG architectural grid, translating light and geometric reflection   |
| Airport horizon     | Original bounded SVG/CSS                      | 24 sparse stars, 36 distant lights, soft drifting sky illumination   |
| Reflective glass    | Magic UI Magic Card gradient-mode adaptation  | Pointer-relative illuminated rim and original translucent navigation |
| Border Beam         | Magic UI masked border/motion-path adaptation | CSS moving light around navigation; static fallback when unsupported |
| Shimmer Action      | Magic UI layered button + source keyframes    | Conic rim illumination behind an opaque actionable button face       |
| Static CSS baseline | Original                                      | Static light and materials; no continuous animation                  |

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

- [Daylight desktop · Balanced](screenshots/daylight-desktop-balanced.png)
- [Night desktop · Cinematic](screenshots/night-desktop-cinematic.png)
- [Night Weekly Planner](screenshots/night-weekly-desktop.png)
- [Daylight phone · Balanced](screenshots/daylight-phone-balanced.png)
- [Night phone · Cinematic](screenshots/night-phone-cinematic.png)
- [Night reflective glass · phone](screenshots/night-glass-phone.png)
- [Candidate comparison and integration recommendations](research/homebase-visual-recommendations.md)

Still screenshots cannot demonstrate fluidity, pointer response, performance or native Safari behavior. Use the running gallery to judge these. Screenshots were produced in Chromium, not physical iPhone Safari.

## Boundaries and limitations

This does not resolve DT-01, redesign native inputs, implement theme persistence, alter PR #14, or implement the Homebase UI. The approved design branch is a read-only reference. Glass exterior opacity and atmosphere here are **experiments**, not replacements for approved semantic contrast roles.

Safari's blur, motion-path masking, container units and GPU behavior vary by version/device. Blur and motion-path feature gates provide opaque/static fallbacks; old browsers without container units keep a usable opaque button. There is no Canvas/WebGL loop, unbounded particle count or animation framework. CSS backdrop-filter and animated gradients can still consume significant GPU/paint work. Desktop profiling and Playwright WebKit cannot prove iPhone battery, heat, sustained frame rate or physical Safari acceptance.

Physical check: at portrait and both short-landscape sizes, reach every control, switch all effects/themes, compare presets, pause/resume, use both reductions, inspect content and verify page scrolling/pinch zoom. Report which light/glass combinations you prefer and any warmth, dropped frames, flicker or readability issue. **Visual selection remains pending user feedback.**
