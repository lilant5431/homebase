# Component audit — Phase 2.6A-V / V2 / V3 / V4

Research checked October 8, 2026. This is an independent, publicly reviewable experimental app, not Homebase product integration. Eleven specific components were inspected using their actual source, dependencies and official license evidence. The candidate entries are the original research record; the dated V2/V3 selection updates below describe the current audition. No paid assets, login or subscription was used.

## License boundaries

- **Magic UI:** [MIT license](https://github.com/magicuidesign/magicui/blob/cdb348cb4c72a9b54b554d8617801e479fbc8714/LICENSE.md), copyright Magic UI. Reuse, modification and redistribution are permitted with notice. This experiment keeps the complete notice, attribution, exact source snapshots and SHA-256 provenance in `vendor/`, with the full notice also shipped in `public/third-party-notices.txt`. Upstream commit `cdb348cb4c72a9b54b554d8617801e479fbc8714` is pinned. Public repository components below were accessible without payment; no Pro content is used.
- **React Bits:** [actual MIT + Commons Clause text](https://github.com/DavidHDev/react-bits/blob/b2098591ad5b3489eff65ca9e5b9f9bdf2de29c3/LICENSE.md), copyright 2026 David Haz. It allows incorporation into applications but prohibits selling, sublicensing or redistributing the components themselves, including ports/bundles. Public source access is not unrestricted MIT permission. A public component-audition repository is sufficiently close to a component bundle that redistribution is not assumed. **Reference only; no React Bits code/assets are copied.** Seek clarification before a later integration.
- **Aceternity:** official [licence](https://ui.aceternity.com/licence) covers items available for purchase/download, allows end products but restricts redistribution of source; its page describes Pro. [Terms](https://ui.aceternity.com/terms) also reserve rights/restrict republishing. Public registry files have author/source metadata but no component-specific MIT notice. Accessible free demo/code does not settle public-gallery source redistribution. **Reference only; no Aceternity code/assets are committed.** This is a conservative scope decision, not a claim that every free Aceternity use is prohibited.
- **shadcn/ui:** [MIT license](https://github.com/shadcn-ui/ui/blob/6ea090075cd537d3b792c6c1a625e2448b6ede26/LICENSE.md), copyright shadcn. Reference only for semantics; no source copied or full framework installed.

## Examined candidates

### 1. React Bits Aurora — reference only

[Official demo](https://reactbits.dev/backgrounds/aurora) · [inspected TypeScript source](https://github.com/DavidHDev/react-bits/blob/b2098591ad5b3489eff65ca9e5b9f9bdf2de29c3/src/ts-default/Backgrounds/Aurora/Aurora.tsx).

Public source, not a paid Pro asset; restricted redistribution as above. Depends on `ogl` and its CSS. WebGL procedural noise/shader, triangle mesh and a continuous requestAnimationFrame loop. React/Vite portability is plausible from imports, not installed/tested here. Source cancels its frame and resize listener on cleanup; no built-in reduced-motion branch was found. High risk for full-screen mobile GPU/thermal cost, context support/loss and shader precision; would need DPR bounds, offscreen/pause handling and a static fallback. Potential: fluid sky/aurora. Excluded rather than silently replaced by an alleged Aurora implementation.

### 2. React Bits Light Rays — reference only

[Demo](https://reactbits.dev/backgrounds/light-rays) · [source](https://github.com/DavidHDev/react-bits/blob/b2098591ad5b3489eff65ca9e5b9f9bdf2de29c3/src/ts-default/Backgrounds/LightRays/LightRays.tsx).

Public non-Pro code with the same redistribution restriction. `ogl`, CSS, WebGL shader; mouse tracking, animation frames, IntersectionObserver; source bounds DPR to 2 and cancels frame/resize listeners. Vite adaptation feasible in principle but not claimed verified. No OS-reduction branch found. Medium/high mobile GPU risk; transparency/context fallback and stronger pause/resource tests needed. Potential: diagonal sunlight and cyan night beams. Official demo is linked; no exact implementation integrated.

### 3. React Bits Dot Grid — reference only

[Demo](https://reactbits.dev/backgrounds/dot-grid) · [source](https://github.com/DavidHDev/react-bits/blob/b2098591ad5b3489eff65ca9e5b9f9bdf2de29c3/src/ts-default/Backgrounds/DotGrid/DotGrid.tsx).

Public non-Pro code with the same restriction. Canvas 2D + GSAP/InertiaPlugin; canvas DPR follows device DPR without a cap in the inspected path, a redraw loop and global mouse/click listeners. ResizeObserver cleanup and frame cancellation exist; no OS-reduction branch found. React/Vite imports are plausible but GSAP licensing/version compatibility was not independently cleared for redistribution here. Medium mobile CPU/pixel-count risk and mostly desktop pointer interaction. Potential: interactive geometric structure. Excluded; SVG Grid Pattern offers a smaller, MIT alternative, explicitly named as a different candidate.

### 4. Aceternity Spotlight New — reference only

[Demo](https://ui.aceternity.com/components/spotlight-new) · [actual official registry source](https://ui.aceternity.com/registry/spotlight-new.json), author Aceternity/Manu Arora.

Official component page metadata says accessible for free; no payment was used to inspect source. Redistribution ambiguity described above. Imports `motion/react`; Tailwind utilities. Layered radial-gradient rectangles rotate −45° and move left/right; no Canvas/WebGL. Could port to standalone React but would require Motion/styles, pause and OS-reduction integration; source does not provide those reductions. Medium risk from very large animated gradient areas, not particle counts. Potential: dramatic diagonal light. Do not copy its code or imply the original CSS baseline is this component.

### 5. Aceternity Background Beams — reference only

[Demo](https://ui.aceternity.com/components/background-beams) · [registry](https://ui.aceternity.com/registry/background-beams.json), Aceternity/Manu Arora.

Public downloadable registry, no component-specific redistribution grant verified. `motion`, utility `cn`, Tailwind. Dozens of SVG paths with animated linear gradients; React.memo. React/Vite possible after utility/style adaptation, not installed/tested. No reduced-motion/pause behavior found. Medium continuous DOM/SVG animation cost, nondeterministic original durations and dense visual texture. Potential: slow night trails. Reference only; licensing is unresolved for this repository.

### 6. Aceternity Card Spotlight — reference only

[Demo](https://ui.aceternity.com/components/card-spotlight) · [registry](https://ui.aceternity.com/registry/card-spotlight.json), including Canvas Reveal source.

Public registry inspected without payment; source redistribution not cleared. Depends on `motion`, Canvas Reveal, `@react-three/fiber`, `three` and Tailwind utilities. Pointer mask plus WebGL dot-matrix shader via a React Three Fiber render loop. Vite portability plausible but unnecessary stack here; coarse touch, reduced-motion and resource lifecycle need separate work. High relative dependency/GPU risk for a planner. Potential: reactive card lighting. Reject for this audition; Magic Card has a smaller inspectable MIT technique.

### 7. Magic UI Grid Pattern — adopt/adapt with attribution

[Docs](https://magicui.design/docs/components/grid-pattern) · [pinned source](https://github.com/magicuidesign/magicui/blob/cdb348cb4c72a9b54b554d8617801e479fbc8714/apps/www/registry/magicui/grid-pattern.tsx).

Verified MIT/free public source. React useId + local `cn`/Tailwind classes; no animation package, Canvas or WebGL. SVG pattern definition, path, full rect and optional highlighted squares. Actual pattern/square construction is reused in `src/components/LibraryEffects.tsx`; class utilities become plain CSS. Vite build/browser verified. Library-default comparison is static 40px gray geometry; Homebase tuning adds original CSS sunlight and bounded CSS shape motion. Static source has no movement to reduce; our added movement respects OS/manual reduction and pause. Low risk; one tiled pattern and four square accents, no per-frame JavaScript. Safari SVG/mask support requires physical review, but baseline grid remains visible without advanced masking.

### 8. Magic UI Border Beam — archival adaptation; rejected by user

[Docs](https://magicui.design/docs/components/border-beam) · [source](https://github.com/magicuidesign/magicui/blob/cdb348cb4c72a9b54b554d8617801e479fbc8714/apps/www/registry/magicui/border-beam.tsx).

Verified MIT/free. Original `motion/react` and `cn`/Tailwind; masked border layer + CSS offset-path/offsetDistance animation. The geometry/masked-gradient technique is reused; CSS keyframes replace Motion, removing runtime package need. Candidate mode keeps 50px/orange-purple/6-second source defaults; tuning changes palette, cadence and bounds. Original lacks pause/OS reduction; audition implements both. Offset-path rect and mask-composite support is capability-gated; static border fallback is explicit. Low/medium moving-edge paint risk. Useful for selected navigation/control chrome, not every task card. No claim that the CSS port is byte-identical Motion execution.

### 9. Magic UI Shimmer Button — archival adaptation; rejected by user

[Docs](https://magicui.design/docs/components/shimmer-button) · [source](https://github.com/magicuidesign/magicui/blob/cdb348cb4c72a9b54b554d8617801e479fbc8714/apps/www/registry/magicui/shimmer-button.tsx) · [keyframes](https://github.com/magicuidesign/magicui/blob/cdb348cb4c72a9b54b554d8617801e479fbc8714/apps/www/styles/globals.css).

Verified MIT/free. React forwardRef plus `cn`/Tailwind; no Motion import. Nested spark container, translating square, rotating conic gradient, highlight and opaque inset backdrop. These source layers and spin-around/shimmer-slide keyframes are retained with plain CSS. Candidate defaults: black, white shimmer, rounded pill, 3 seconds; tuning: semantic opaque button, 10px radius and slower cycle. Vite build/browser verified. Container units/conic gradients need fallback on older Safari; opaque native button remains functional. Original has no OS-reduction/pause; ours stops movement and retains solid focus/contrast. Low/medium compositor/paint cost; use sparingly rather than making every action shine.

### 10. Magic UI Magic Card — gradient-mode adaptation with attribution

[Docs](https://magicui.design/docs/components/magic-card) · [source](https://github.com/magicuidesign/magicui/blob/cdb348cb4c72a9b54b554d8617801e479fbc8714/apps/www/registry/magicui/magic-card.tsx).

Verified MIT/free. Original React, Motion motion values/springs, next-themes, Tailwind. Cursor-relative coordinates feed layered radial-gradient borders behind opaque content; optional orb mode exists. We retain gradient-mode coordinate/reset/border technique, remove orb/Motion/Next dependencies, coalesce pointer writes into one requested frame, and use supplied theme props. Candidate uses source purple/pink border colors inside an audition-only translucent shell; tuning adds original glass exterior/reflection, keeping readable content plates solid. Keyboard/touch get a centered focus highlight, not a mouse-only requirement. Original global-reset listeners/visibility handling are replaced by scoped handlers and shared lifecycle state. Vite/browser verified. Low/medium pointer-driven repaint + bounded chrome backdrop-filter cost; no constant JS loop, frame cancellation on pause/unmount. Reduction removes translucent/interactive lights entirely. This is explicitly a limited adaptation, not a complete original Magic Card port.

### 11. shadcn/ui Dropdown Menu — reference only

[Docs](https://ui.shadcn.com/docs/components/dropdown-menu) · [inspected Radix wrapper](https://github.com/shadcn-ui/ui/blob/6ea090075cd537d3b792c6c1a625e2448b6ede26/apps/v4/registry/new-york-v4/ui/dropdown-menu.tsx).

Verified MIT/free source. Radix dropdown primitives, Lucide, `cn` and Tailwind; portals, keyboard/menu semantics and focus treatment. React/Vite possible, but installing the complete system for gallery controls is unnecessary. Low rendering risk; animation CSS must respect reduced motion. Reference informs explicit labels/focus/current state. Native selects, buttons and disclosure are used instead; no imitation menu role without arrow-key behavior.

## What ran in V1

Four licensed Magic UI adaptations: Grid Pattern, Border Beam, Shimmer Button and gradient-mode Magic Card. Two original effects: deterministic CSS/SVG horizon lighting and a static CSS-only baseline. Sunlight/reflections added around the grid and glass are **original Homebase audition work**, not unlicensed ports of React Bits/Aceternity. These exclusions are deliberate and visible in the gallery's credits. No restricted source/assets were copied into this repository.

## V2 selection update

October 9, 2026 refinement uses the same inspected sources and unchanged license notices/source hashes. Grid Pattern remains the loved Daylight foundation; Magic Card gradient-mode is now a shared chrome technique in both primary scenes (navigation, action holder and native Preview notes menu). Library defaults remain an archival technical comparison. Border Beam/Shimmer are not shortlisted following explicit user rejection; static CSS is only a performance/reduced-effects reference. Their retained source is clearly labeled archival, not newly endorsed.

The new coordinated CSS light field, bounded SVG horizon (24 stars, 36 runway points and 20 taxiway points), exposed decorative lighting band and five-surface bounded cue are original audition code. They do not incorporate excluded library assets. The cue uses browser Web Animations only on a user event; CSS drives the shared ambient field. No package or redistribution permission was added or changed. The original audit decisions above remain the research record, not the current six-way preference.

## V3 selection update

V3 removes the original aviation scene from runtime following physical user feedback. Its V1/V2 audit statements remain historical. An original reusable SVG Landscape now uses three mountain layers, two cloud paths, a calm lake/reflections, twenty fixed stars and a sun/moon disc; palette tokens change lighting without duplicating geometry. Existing Grid Pattern/Magic Card reuse remains, and the four licensed source comparisons stay archival. Basic is promoted to a complete light/dark user choice. Source notices/hashes and redistribution decisions are unchanged; no new dependency or copied component is introduced.

A cue adds two finite Landscape sky/water targets to the original five chrome/environment targets, retaining the bounded 1,180ms duration and cancellation architecture. Physical V2 passing behavior is user-reported and recorded separately; the new scene is not physically accepted yet.

## V4 reference-only landscape refinement

[Targeted reference study](landscape-v4-references.md) covers colored minimal line-art, mountain outlines, atmospheric depth and contour UI backdrops. These illustration sources are reference-only; no paid artwork/code/path geometry is copied or redistributed. The new full-page drawing and retained V3 band are original SVG/CSS. Magic UI adapters, five pinned source hashes, MIT notices and dependencies are unchanged. No new license or runtime dependency burden is introduced. Previous audition recommendations and V3 measurements above are historical where explicitly labeled; current results are in [verification](verification.md).
