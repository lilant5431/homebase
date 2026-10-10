# Homebase · Visual Audition / Phase 2.6A-V6

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
| **Lattice**               | Accepted cool-white/pale-blue architectural grid and flowing sunlight                  | **Moonlit Lattice**: steel grid, silver reflections, midnight branding/navigation     |
| **Atmospheric Landscape** | Full-page soft sky, colored mountain contours, drawn clouds and lightly reflected lake | Same outlined scene: midnight sky, steady sparse stars, moonlit clouds and calm water |
| **Basic**                 | Polished clear surfaces and shared chrome; no cinematic background                     | Same UI in dark colors, with static reflective chrome; no cinematic background        |

**Environment** and **Palette** are independent controls. The select uses the concise label **Landscape**; the heading names it Atmospheric Landscape. **System** (default) resolves Light/Dark from `prefers-color-scheme`, follows live OS changes, and does not use local time. It adds no extra visual design. Without `matchMedia`, System falls back to Light. Native `color-scheme` follows the resolved palette.

Changing environment preserves palette, content material, intensity, speed, preset, pause/reductions and composition. Selecting an environment returns from any technical source comparison to its integrated scene. Changing palette preserves environment and source comparison. Preferences live only in React state and reset on reload.

## Controls and interaction

1. Choose an environment and System/Light/Dark. Compare **Calm**, **Balanced**, **Cinematic**; custom sliders clear the preset. Intensity controls lighting/glass rather than academic text opacity. Speed controls atmospheric CSS motion; it is disabled in Basic or unsupported/reduced modes. Basic retains the speed value for the next atmospheric environment.
2. Open **Fine-tune & accessibility** (collapsed on a freshly loaded phone). **Pause** freezes movement and clears pointer reflections. Hidden/offscreen scenes pause. **Reduce motion** stops nonessential movement. **Reduce visual effects** removes atmosphere/glow/blur and makes chrome opaque; it also stops motion. OS reductions/forced colors take precedence, including after Reset.
3. Switch **Overview / Weekly Planner**, inspect illustrative records, and open **Preview notes** to see menu glass around solid text. No academic edits, saving or scheduling occurs.
4. **Play light cue** sends bounded reflected light across existing decorative layers: five for Lattice/Basic, seven for Landscape (including sky/water). The full-stage scene cue pulses in place, reaching the desktop bottom; overlapping Landscape sky/water pulses illuminate the whole scene. Chrome rims still sweep locally. The maximum remains **1,180 ms**. Repeated taps replace animations/timer. Pause, reductions, appearance changes, hiding/offscreen and unmount cancel it before the next paint. Static confirmation explicitly says no work is saved/scheduled. Restoring motion never replays a cue.
5. **Sources & archived comparisons** keeps four licensed technique comparisons **plus Archive · V3 Landscape band**, the previous filled scene in its original 180px/130px strip. Select either palette while comparing. Choose Return to integrated themes (or reselect an environment) to restore the V4 scene without resetting tuning/view. Library defaults are disabled for the original V3 scene. Beam/Shimmer remain rejected references, not active design choices. The former airport/runway/cockpit scene is removed from runtime. Basic is now a deliberate user choice, not merely an unfinished or rejected fallback.
6. **Content material**: Solid keeps original opaque panels; Frosted retains 72% surface alpha and bounded 4px/3px phone blur. These are the only two choices. This affects actual cards and metrics, not just navigation. Reduced effects or unsupported blur force opaque panels without losing the selected material; restoration returns the choice. One React-state setting survives environment, palette, view, tuning and cue changes. No storage.
7. **Reset** restores Balanced tuning and clears manual reductions, pause and library defaults while retaining environment, palette, selected reference, content material and composition. OS requests remain honored.

## Shared materials and sources

The lattice accent is **decorative only**: a 112px × 8px rounded LED-like capsule in the original 26px layout slot. It uses existing palette tokens/shared lighting, has no pointer handler, focus target, new animation or cue target, and cannot intercept input. Reduced motion leaves static lighting; reduced effects/forced colors hide it. Landscape and Basic are untouched.

One inherited CSS light field drives the accepted lattice, landscape cloud/water drift and reflected chrome. Large lights use transforms; small rims use gradients. These are visually coordinated effects, not physical light propagation. One original landscape uses separate finite SVG sky/range/water planes and full-preview color washes, styled by palette rather than six duplicated trees. Mountains have non-scaling contours, sparse ridge detail and faint fading fill. Drawn clouds, reflected contours and open water ripples replace heavy silhouettes; the scene spans the full preview document height rather than a banner. Solid is the default. Optional Frosted backgrounds expose scenery while protecting text. [Reference study and V3/V4 comparison](research/landscape-v4-references.md). Decorative stars remain steady, not flashing. No stock image, Canvas, WebGL, animation framework or perpetual JS rendering loop.

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

`AUDITION_URL` may point to a separately started built preview. Linux may need browser OS libraries. Both engines are required; an unavailable engine is not reported as passing. Results go to ignored `test-results/`; screenshots go to `screenshots/`. `python3 tests/audit.py` verifies provenance, relative links, isolation, solid contrast, blended envelopes and actual sampled scene evidence after browser tests.

Unit tests deliberately use `src/**/*.audition.tsx` to avoid production test discovery. The project's existing type-aware Oxlint includes source, tests and browser runner, with no suppressions. Hosted **CI / verify** checks **production Homebase only**; experimental/browser checks are separate local evidence. [Verification and performance record](research/verification.md), [Solid/Frosted rendered contrast evidence](research/material-v6-results.md).

## V6 visual evidence

Actual browser renders, Balanced, not conceptual mockups:

- Sunlit / Moonlit side-by-side: [desktop](screenshots/v6-lattice-comparison-1440.png), [phone](screenshots/v6-lattice-comparison-390.png).
- Moonlit branding/navigation close-up: [desktop](screenshots/v6-moonlit-branding-1440.png), [phone](screenshots/v6-moonlit-branding-390.png).
- Lattice accent above the real Weekly Planner: [Sunlit desktop](screenshots/v6-lattice-light-accent-1440.png), [Moonlit desktop](screenshots/v6-lattice-dark-accent-1440.png), [Sunlit phone](screenshots/v6-lattice-light-accent-390.png), [Moonlit phone](screenshots/v6-lattice-dark-accent-390.png).

| Landscape Dark | Desktop Overview                                                      | Phone Overview                                                    | Long phone Planner                                                 |
| -------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| Solid          | [Desktop](screenshots/v6-landscape-dark-overview-desktop-solid.png)   | [Phone](screenshots/v6-landscape-dark-overview-phone-solid.png)   | [Planner](screenshots/v6-landscape-dark-planner-phone-solid.png)   |
| Frosted        | [Desktop](screenshots/v6-landscape-dark-overview-desktop-frosted.png) | [Phone](screenshots/v6-landscape-dark-overview-phone-frosted.png) | [Planner](screenshots/v6-landscape-dark-planner-phone-frosted.png) |

Landscape Light Frosted: [desktop](screenshots/v6-landscape-light-overview-desktop-frosted.png), [phone](screenshots/v6-landscape-light-overview-phone-frosted.png), [long phone Planner](screenshots/v6-landscape-light-planner-phone-frosted.png). All six appearances retain desktop/phone Overview/Planner renders named `v6-{environment}-{light|dark}-{overview|planner}-{desktop|phone}-{material}.png`; Landscape has both materials.

Historical V4 evidence is retained: [Light sketch](screenshots/v4-landscape-light-overview-desktop.png), [Dark sketch](screenshots/v4-landscape-dark-overview-phone.png), [full-stage cue](screenshots/v4-landscape-light-cue-desktop.png), [live V3 band comparison](screenshots/v4-archived-v3-landscape-light-desktop.png). Other non-retired V1–V5 assets remain as historical references. Still images cannot establish fluidity or physical Safari acceptance.

## Physical acceptance and limitations

The user physically tested V2 on iPhone Safari and reported passing Daylight animation, portrait/landscape scrolling and rotation, repeated cues, reduced-motion/effects, and sustained responsiveness/performance. Those accepted behaviors are protected. The aviation direction was rejected; V3 replaces it. These are user reports, not additional automated/physical observations invented here.

Latest pre-V4 physical iPhone feedback additionally reported System appearance following iPhone appearance, smooth scrolling/rotation, correct motion/effects reductions, acceptable sustained responsiveness/warmth, and an appealing mountain/cloud/lake/star direction. No other acceptance outcomes are inferred. The remaining requests were a full-page colored sketch and complete desktop cue coverage.

The user approved V4 **Atmospheric Landscape Light, the full-page sketch compared with V3's band, the full-stage desktop cue, iPhone cues, scrolling/rotation, reduced motion/effects, and sustained responsiveness/warmth**. These reports do not approve all six appearances.

**V6 regression review:** inspect the short lattice capsule in Sunlit/Moonlit, both compositions and portrait/landscape. Verify unchanged Solid/Frosted, opaque fallback/restoration, navigation and cues. Observe several-minute scrolling, rotation, responsiveness and warmth with translucent panels. Chromium/Linux WebKit and short cloud samples do not establish physical iPhone compositing or battery/thermal cost. Content blur is bounded at 4px (3px phone); up to five Overview panels add filters while Planner adds one. Pause, reductions and Solid remain available.

No production schemas, keys, academic/scheduling behavior, PR #14 or DT-01 editor work is changed. No appearance persistence or production redesign is implemented. **The user has fixed the experimental direction. This is the final polishing pass; no further visual exploration is planned unless a regression appears.**
