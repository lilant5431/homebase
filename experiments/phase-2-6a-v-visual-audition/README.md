# Homebase · Visual Audition / Phase 2.6A-V4

An isolated interactive gallery: **three environments × two palettes**, around fixed illustrative Overview and Weekly Planner content. This is not the Homebase application, production integration or a finalized redesign. No real records, scheduling, editors, accounts or browser storage are connected.

## Run on Windows and iPhone

Use Git and Node.js **24.19.0** (verified). For a new checkout, in PowerShell:

```powershell
git clone --branch experiment/phase-2-6a-v-visual-audition https://github.com/lilant5431/homebase.git homebase-audition
cd .\homebase-audition\experiments\phase-2-6a-v-visual-audition
npm ci
npm run dev
```

For an existing experimental checkout, run `git pull --ff-only` on that branch, then `npm ci` and `npm run dev` in this directory. Keep the terminal running. Open **http://localhost:5175/** on the PC. This dedicated server listens on `0.0.0.0`, requires port **5175** and leaves Homebase's normal server alone.

On an iPhone on the **same Wi-Fi**, open the Network URL printed by Vite, for example **http://192.168.1.42:5175/**. Use your PC's actual address, not that example or the cloud address. Allow this Node server on a private network if Windows prompts. Managed networks/devices may prohibit LAN access. No secure-context-only API, login or API key is needed; pinch zoom is preserved.

A running cloud preview can use http://localhost:5175/ through the environment browser/forwarding. It is not a public deployment or directly reachable by your phone without forwarding. No hosting is configured.

## Six appearances

| Environment               | Light                                                                                  | Dark                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Sunlit Lattice**        | Accepted cool-white/pale-blue architectural grid and flowing sunlight                  | Same grid/geometry under deep-slate lighting, with cool reflected glass               |
| **Atmospheric Landscape** | Full-page soft sky, colored mountain contours, drawn clouds and lightly reflected lake | Same outlined scene: midnight sky, steady sparse stars, moonlit clouds and calm water |
| **Basic**                 | Polished clear surfaces and shared chrome; no cinematic background                     | Same UI in dark colors, with static reflective chrome; no cinematic background        |

**Environment** and **Palette** are independent controls. The select uses the concise label **Landscape**; the heading names it Atmospheric Landscape. **System** (default) resolves Light/Dark from `prefers-color-scheme`, follows live OS changes, and does not use local time. It adds no extra visual design. Without `matchMedia`, System falls back to Light. Native `color-scheme` follows the resolved palette.

Changing environment preserves palette, intensity, speed, preset, pause/reductions and composition. Selecting an environment returns from any technical source comparison to its integrated scene. Changing palette preserves environment and source comparison. Preferences live only in React state and reset on reload.

## Controls and interaction

1. Choose an environment and System/Light/Dark. Compare **Calm**, **Balanced**, **Cinematic**; custom sliders clear the preset. Intensity controls lighting/glass rather than academic text opacity. Speed controls atmospheric CSS motion; it is disabled in Basic or unsupported/reduced modes. Basic retains the speed value for the next atmospheric environment.
2. Open **Fine-tune & accessibility** (collapsed on a freshly loaded phone). **Pause** freezes movement and clears pointer reflections. Hidden/offscreen scenes pause. **Reduce motion** stops nonessential movement. **Reduce visual effects** removes atmosphere/glow/blur and makes chrome opaque; it also stops motion. OS reductions/forced colors take precedence, including after Reset.
3. Switch **Overview / Weekly Planner**, inspect illustrative records, and open **Preview notes** to see menu glass around solid text. No academic edits, saving or scheduling occurs.
4. **Play light cue** sends bounded reflected light across existing decorative layers: five for Lattice/Basic, seven for Landscape (including sky/water). The full-stage scene cue pulses in place, reaching the desktop bottom; overlapping Landscape sky/water pulses illuminate the whole scene. Chrome rims still sweep locally. The maximum remains **1,180 ms**. Repeated taps replace animations/timer. Pause, reductions, appearance changes, hiding/offscreen and unmount cancel it before the next paint. Static confirmation explicitly says no work is saved/scheduled. Restoring motion never replays a cue.
5. **Sources & archived comparisons** keeps four licensed technique comparisons **plus Archive · V3 Landscape band**, the previous filled scene in its original 180px/130px strip. Select either palette while comparing. Choose Return to integrated themes (or reselect an environment) to restore the V4 scene without resetting tuning/view. Library defaults are disabled for the original V3 scene. Beam/Shimmer remain rejected references, not active design choices. The former airport/runway/cockpit scene is removed from runtime. Basic is now a deliberate user choice, not merely an unfinished or rejected fallback.
6. **Reset** restores Balanced tuning and clears manual reductions, pause and library defaults while retaining environment, palette, selected reference and composition. OS requests remain honored.

## Shared materials and sources

One inherited CSS light field drives the accepted lattice, landscape cloud/water drift and reflected chrome. Large lights use transforms; small rims use gradients. These are visually coordinated effects, not physical light propagation. One original landscape uses separate finite SVG sky/range/water planes and full-preview color washes, styled by palette rather than six duplicated trees. Mountains have non-scaling contours, sparse ridge detail and faint fading fill. Drawn clouds, reflected contours and open water ripples replace heavy silhouettes; the scene spans the full preview document height rather than a banner. Solid records remain opaque. [Reference study and V3/V4 comparison](research/landscape-v4-references.md). Decorative stars remain steady, not flashing. No stock image, Canvas, WebGL, animation framework or perpetual JS rendering loop.

Magic UI **Grid Pattern** and **Magic Card gradient-mode** adaptations are retained with attribution; Border Beam/Shimmer source comparisons remain archival. Copyright Magic UI, MIT: [full license](vendor/MAGIC-UI-LICENSE.txt), [pinned source snapshots/hashes](vendor/source-manifest.json), [runtime adapters](src/components/LibraryEffects.tsx). Original landscape/CSS lighting is not copied from excluded libraries. **No new dependencies.** Existing React Bits/Aceternity exclusions remain; see the [11-component audit](research/component-audit.md).

Five runtime packages remain React, React DOM, Lucide (ISC), and local DM Sans/Manrope fonts (SIL OFL). Full upstream/runtime notices ship in [public/third-party-notices.txt](public/third-party-notices.txt). No analytics or external runtime requests. Official source links navigate only when selected.

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

For browser tests, keep the independent dev server running in another terminal:

```powershell
npx playwright install chromium webkit
npm run test:browser
```

`AUDITION_URL` may point to a separately started built preview. Linux may need browser OS libraries. Both engines are required; an unavailable engine is not reported as passing. Results go to ignored `test-results/`; screenshots go to `screenshots/`. `python3 tests/audit.py` verifies provenance, relative links, isolation and solid-role contrast.

Unit tests deliberately use `src/**/*.audition.tsx` to avoid production test discovery. The project's existing type-aware Oxlint includes source, tests and browser runner, with no suppressions. Hosted **CI / verify** checks **production Homebase only**; experimental/browser checks are separate local evidence. [Verification and performance record](research/verification.md).

## Current visual evidence

All examples below use Balanced. Each combination also has a Weekly Planner screenshot named `v4-{environment}-{light|dark}-planner-{desktop|phone}.png`.

| Appearance      | Desktop Overview                                               | Phone Overview                                             |
| --------------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| Lattice Light   | [Desktop](screenshots/v4-lattice-light-overview-desktop.png)   | [Phone](screenshots/v4-lattice-light-overview-phone.png)   |
| Lattice Dark    | [Desktop](screenshots/v4-lattice-dark-overview-desktop.png)    | [Phone](screenshots/v4-lattice-dark-overview-phone.png)    |
| Landscape Light | [Desktop](screenshots/v4-landscape-light-overview-desktop.png) | [Phone](screenshots/v4-landscape-light-overview-phone.png) |
| Landscape Dark  | [Desktop](screenshots/v4-landscape-dark-overview-desktop.png)  | [Phone](screenshots/v4-landscape-dark-overview-phone.png)  |
| Basic Light     | [Desktop](screenshots/v4-basic-light-overview-desktop.png)     | [Phone](screenshots/v4-basic-light-overview-phone.png)     |
| Basic Dark      | [Desktop](screenshots/v4-basic-dark-overview-desktop.png)      | [Phone](screenshots/v4-basic-dark-overview-phone.png)      |

Additional examples: [Landscape Light cue](screenshots/v4-landscape-light-cue-desktop.png), [Landscape Dark cue](screenshots/v4-landscape-dark-cue-desktop.png), [Light phone planner](screenshots/v4-landscape-light-planner-phone.png), [Dark desktop planner](screenshots/v4-landscape-dark-planner-desktop.png). V1/V2/V3 screenshots remain **historical**, not the current shortlist. Still images cannot show fluidity, touch or physical Safari compositing. [Current recommendations](research/homebase-visual-recommendations.md).

Archived live comparison: [Light desktop](screenshots/v4-archived-v3-landscape-light-desktop.png), [Dark desktop](screenshots/v4-archived-v3-landscape-dark-desktop.png), [Light phone](screenshots/v4-archived-v3-landscape-light-phone.png), [Dark phone](screenshots/v4-archived-v3-landscape-dark-phone.png). These show the running V3 band in the V4 gallery, not V4's active scene. The corrected cue is shared by both treatments.

## Physical acceptance and limitations

The user physically tested V2 on iPhone Safari and reported passing Daylight animation, portrait/landscape scrolling and rotation, repeated cues, reduced-motion/effects, and sustained responsiveness/performance. Those accepted behaviors are protected. The aviation direction was rejected; V3 replaces it. These are user reports, not additional automated/physical observations invented here.

Latest pre-V4 physical iPhone feedback additionally reported System appearance following iPhone appearance, smooth scrolling/rotation, correct motion/effects reductions, acceptable sustained responsiveness/warmth, and an appealing mountain/cloud/lake/star direction. No other acceptance outcomes are inferred. The remaining requests were a full-page colored sketch and complete desktop cue coverage.

**V4 needs physical retesting** of Light/Dark Landscape, portrait/landscape scrolling/rotation, repeated/pause/reduction cues, System changes and several-minute warmth/responsiveness. Inspect desktop bottom coverage and compare the older V3 band. Desktop Chromium/WebKit checks do not establish physical Safari or final visual acceptance. The larger painted area may change phone cost despite lightweight geometry. Existing gradients, promoted layers and bounded 18px chrome blur still have paint/memory costs. Unsupported registered properties or blur use static/opaque fallbacks.

No production schemas, keys, academic/scheduling behavior, PR #14 or DT-01 editor work is changed. No appearance persistence or production redesign is implemented. **Final design acceptance remains pending the user's V4 review.**
