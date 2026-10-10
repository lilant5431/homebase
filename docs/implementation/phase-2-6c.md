# Phase 2.6C — Shell, navigation, typography and interaction lighting

Base: `1a62f917688ffa0951571dda6b602e5044466757` (merged PR #16, including the cross-tab initialization fix). Branch: `feat/phase-2-6c-shell-navigation`. The exact published head and hosted CI run are recorded in the PR review package; this document belongs to that commit (a commit cannot embed its own hash without changing it). PR #15 at `0593c853596f47a5fbc4370b92f4e455bdef1a66` remains read-only/unmodified. No merge performed.

## Scope and traceability

| Contract                                       | Implementation                                                                                                                                      | Protection                                                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Stable six destinations and existing view keys | `AppShell.tsx` owns only transient drawer/layout state; App still owns view, records, editors and planner                                           | Navigation/unit tests; full Phase 2 workflows; source/reference/draft browser oracles                       |
| Wide 216px rail / compact scrolling drawer     | `styles/shell.css`; ≥1200px and ≥501px height; all other widths/heights use the same drawer tree                                                    | Eight viewport checks in Chromium/WebKit; narrow/short-height reachability and 400% CSS reflow              |
| Current location and action hierarchy          | One h1 per view; Newsreader page heading, Geist location/controls; Weekly Planner is a label change only                                            | All six destinations/h1s/current markers; assignments avoids duplicate prominent New assignment             |
| Native modal navigation behavior               | Current item initial focus, Tab containment, Escape/outside dismissal, opener focus after inert removal; main inert; drawer-only overflow lock      | Unit keyboard/cleanup/StrictMode tests and real touch/keyboard browser checks                               |
| Sunlit/Moonlit chrome                          | Separate exterior reflection, audited text scrim, solid active marker; 12px blur maximum; opaque reduced/unsupported fallback                       | Solid/Frosted independence, reduction/forced-color/browser checks; semantic token audit                     |
| Shared activation separate from results        | `LightingButton.tsx`: native click once, disposable 180ms opacity light; repeated activation, scope/appearance/reduction changes and unmount cancel | Handler counts, keyboard/pointer/disabled/cancellation tests; no success/status announcements               |
| Isolated appearance                            | Existing preference resolver, bootstrap, boundary and settings preserved; no new keys                                                               | Full appearance suite, including real two-tab initialization race and tab-only fault handling               |
| Protected editors/domain                       | No engine, domain, storage/schema, planner hook, editor components or lifecycle code changes                                                        | Full unit/Phase 2/mobile regression suites; native controls ≥16px, unchanged appearance and document scroll |

No routing, accounts, scenery, planner composition redesign, GPU renderer, animation library or new runtime dependency. The unused Manrope/DM Sans font packages were removed because the authorized pairing replaces them; no unrelated package upgrades. Existing component geometry/content remains recognizable. Long functional titles/metadata now wrap rather than disappear behind ellipses.

## Authorized typography amendment

The maintainer selected **Newsreader for academic/editorial identity + Geist Sans for functional UI**, superseding only the original Manrope/DM Sans pairing. The corresponding system section now explicitly records that amendment; historical atlas/V6 evidence retains its original font selection. Colors, materials, environment definitions, spacing and functional contracts remain authoritative.

Read-only audition inspected at `1ff4405938c36f4d49c7a5d8c424fdc04808071c` (`auditions/newsreader-geist/index.html`). It illustrates the pairing but uses remote fonts/larger mockup headings; neither its bundled HTML nor its application geometry was integrated. Production uses 28px/36px Newsreader h1 (compact 24px/32px), 28px/32px wordmark, weight 600 and automatic optical sizing. Geist supplies functional text, form labels, controls, record titles, metadata and tabular time roles. No runtime font selector.

[Font provenance, hashes, official source commits and licensing](../../src/assets/fonts/README.md). Unmodified official variable WOFF2 assets: Newsreader 214,880 B and Geist 69,760 B. SIL OFL 1.1 notices/copyrights ship under `/font-licenses/`. Matching official TTF metadata: Newsreader 1.003 (wght 200–800, opsz 6–72); Geist 1.800 (wght 100–900). No paid/unofficial fonts, Mono, unused italic weights or third-party runtime requests.

`font-display: swap` preserves immediately readable Georgia/system fallbacks. Vite hashes assets; no font-loading JavaScript, mount delay or preload. No metric overrides/size adjustment added without a demonstrated need. Large text can grow branding/headers vertically rather than shrink or push controls offscreen. Native controls retain 16px and explicit 1.5 line-height.

## Regression-first corrections during implementation

- Drawer focus restoration initially ran while the main header still had `inert`, leaving focus on the closing control. A failing keyboard regression preceded correction: restore focus in the closed layout effect after DOM inert removal, with current-item focus when switching to a permanent rail. No timeout/animation gate.
- New font metrics caused the existing mobile backdrop assertion to fail: native input line-height inherited from its label produced a fractional form/document height, so integer browser scroll rounding left a roughly 0.2px tail. Actual geometry identified the fractional native input, not a keyboard/viewport bug. Explicit functional heading/control line-height removed the gap; all existing mobile assertions remained intact. No fixed-body editor, native picker reset, breakpoint change or overflow clipping.
- The secondary global action initially inherited the primary pressed background while retaining its secondary blue foreground. A focused real-browser assertion failed (blue text on dark blue). The shared secondary pressed state now uses the approved on-action foreground, with system colors in forced-colors mode; both palette checks cover the actual held state.
- Missing `matchMedia` must not make a CSS-mobile shell behave as desktop. Layout uses real width/height fallback with one cleaned-up resize subscription; the appearance resolver/first-paint contract remains untouched.

## Browser evidence and reproducible checks

Preview the production build on port 4178:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run format:check
python3 docs/design/phase-2-6/verify.py
git diff --check
npx vite preview --host 127.0.0.1 --port 4178 --strictPort
```

In a second terminal (install Chromium/WebKit once using `npx playwright install chromium webkit`):

```sh
node --experimental-strip-types src/acceptance/shell.browser.ts
HOMEBASE_PREVIEW_URL=http://127.0.0.1:4178 node --experimental-strip-types src/acceptance/appearance.browser.ts
HOMEBASE_PREVIEW_URL=http://127.0.0.1:4178 node --experimental-strip-types src/acceptance/phase2.browser.ts
HOMEBASE_PREVIEW_URL=http://127.0.0.1:4178 node --experimental-strip-types src/acceptance/mobile.browser.ts
```

PowerShell environment selection: `$env:HOMEBASE_PREVIEW_URL='http://127.0.0.1:4178'`, then run the same `node` commands. Without the override, the prior appearance/Phase 2 scripts retain ports 4176/4174. Only approved labels and preview-server selection changed in those runners; assertions remain intact. Appearance override screenshots go to ignored test-results instead of rewriting historical 2.6B evidence.

Shell coverage: both palettes at 1440×900, 820×1180, 390×844, 844×390, 667×375, 320×640, 720×450 and 360×225 (**64 cases across two engines**). The last two are 200%/400% CSS-layout reflow equivalents, not claims about browser-menu zoom. Separate 200% root text-size, long-title/class wrapping, failed fonts/missing media API, touch menu opening, keyboard focus/Escape, current markers, 44px targets, short-height Classes/Appearance, native fields, material independence/reduction and source preservation checks supplement the matrix. Existing appearance coverage includes Chromium actual 2× visual-viewport scale and forced colors; this is not physical pinch/assistive-tech certification.

## Measured font behavior

Baseline Overview on local desktop requested four WOFF2 files totaling **56,600 encoded bytes** (Manrope 800 plus DM Sans 400/700/800); baseline rail 252px and h1 36px/43.2px. New Overview requests **two WOFF2 files totaling 284,640 encoded bytes** (approximately 285,240 transferred including local response overhead). The authorized full official files add **228,040 encoded bytes** to that first view; they avoid extra weights and remain cacheable. This is a disclosed cost, not a claimed mobile network budget pass.

Controlled delayed-font experiment in the production browser records readable fallback geometry, then releases actual local responses without delaying App mount. Final measurements: h1 height **36px**, y **111px**, unchanged after load in both engines. Chromium observed layout shift approximately **0.000049**; desktop WebKit exposes no LayoutShift entry API in this environment, so no CLS value is claimed for it. Local font timings varied with the deliberately held responses (~61–63ms Chromium, ~2ms WebKit in the final capture); they are not network/device benchmarks. The browser check records resource bytes/duration and checks measured shifts below 0.1 when the API reports them. No Lighthouse/mobile score is invented. Cold physical iPhone transfer, rasterization and battery/warmth remain unverified.

## Visual references

Representative real production renders (not a completed V6 redesign):

- [Historical baseline typography](assets/phase-2-6c-before-desktop.png).
- [Sunlit desktop](assets/phase-2-6c-light-1440.png) / [Moonlit desktop](assets/phase-2-6c-dark-1440.png).
- [Sunlit phone](assets/phase-2-6c-light-390.png) / [Moonlit phone](assets/phase-2-6c-dark-390.png).
- [Sunlit navigation](assets/phase-2-6c-light-390-navigation.png) / [Moonlit navigation](assets/phase-2-6c-dark-390-navigation.png).
- [Short-landscape Appearance](assets/phase-2-6c-dark-667-menu.png) / [opaque reduction](assets/phase-2-6c-dark-667-reduced-menu.png).
- [Long academic text](assets/phase-2-6c-long-text.png).

These preserve the V6 geometry/material distinction and use the audition’s editorial/functional pairing at actual application sizes. They do not prove animation, native picker painting, physical iPhone performance or full accessibility.

## Results and limits

Baseline: **711 tests/23 files passed**. Initial delivery: **731 tests/24 files passed**, including 20 new shell/activation regressions. Clean dependency installation (115 packages), typecheck, type-aware lint, build, formatting, design audit and whitespace checks passed. The exact-head hosted `CI / verify` run is linked in the PR package. Production-browser verification passed: 64 shell/palette/viewport cases across Chromium and desktop WebKit, 84 existing appearance/viewport cases across both engines, all five Phase 2 workflows at each of five viewports (25 cases), and all three existing mobile-editor viewport scenarios (390×844, 844×390, 667×375). These standalone browser suites are local evidence; hosted CI runs the repository’s required project gates.

Type-aware lint remains zero-warning with no suppression/rule weakening. Design semantic/material roles remain unchanged; the original 92 + four reflection + eight Frosted audit remains mandatory.

No fresh physical Safari/VoiceOver/battery/400% browser-menu zoom acceptance is claimed. Linux WebKit is not iOS Safari. The cloud’s extracted WebKit libraries use the documented 2.6B library path/preflight workaround; actual browser startup and assertions must still succeed. Arbitrary legacy class colors are not certified by the token audit. **DT-01 remains unresolved for 2.6E**; browser geometry does not close it.

Later separately authorized work: 2.6D records, 2.6E editors/native group, 2.6F backgrounds/planner lighting, 2.6G integrated physical acceptance. No later milestone was implemented.

## PR #17 review remediation — rendered button contrast

Reviewed head: `e5ca38e7512b2dfbf6fc305e3c86146df2438dfe`. The proposed normal-palette pressed-state failure did **not** reproduce in either production browser: `.top-add:active` already outranked the base secondary background. Pointer-held and Space-held computed pairs were white on `rgb(30, 58, 138)` (Sunlit, 10.36:1) and `rgb(11, 18, 32)` on `rgb(108, 197, 232)` (Moonlit, 9.62:1). The earlier foreground-only assertion did not establish those ratios.

The expanded review found two real defects:

- **Secondary hover:** inherited primary action-hover background with secondary action foreground. Real computed Sunlit pair `rgb(29, 78, 216)` / `rgb(30, 64, 175)` measured 1.30:1; Moonlit `rgb(139, 221, 252)` / `rgb(182, 234, 255)` measured 1.17:1. The new browser regression failed at 1.30:1 before the CSS correction.
- **Shared primary pressed state in forced colors:** `--hb-action-pressed` retained its normal palette value while action/hover/on-action roles used system colors. Chromium rendered white on white (1:1) during both pointer and keyboard holds. The new regression reproduced this before the missing system-role mapping was supplied.

Minimal corrections: secondary hover explicitly pairs `--hb-action-hover` with `--hb-on-action`; secondary pressed explicitly pairs `--hb-action-pressed` with `--hb-on-action`, independently of inherited styles. Both exclude disabled controls. Forced-color secondary hover/pressed use `ButtonText` on `ButtonFace`; the existing forced-color token block now maps action-pressed to `ButtonText`, consistent with action/hover roles. Static pressed edge/focus feedback remains; no normal palette values, handlers, geometry, fonts or persistence changed.

| Actual rendered secondary state         |  Sunlit | Moonlit |
| --------------------------------------- | ------: | ------: |
| Default (unchanged)                     |  6.70:1 | 11.16:1 |
| Hover after correction                  |  8.72:1 | 14.45:1 |
| Pointer-held pressed                    | 10.36:1 |  9.62:1 |
| Space-held pressed                      | 10.36:1 |  9.62:1 |
| Forced-color hover / pressed (Chromium) |    21:1 |    21:1 |

`src/acceptance/buttons.browser.ts` exercises computed foreground **and** background against the 4.5:1 text threshold, for secondary actions, shared page-header primary actions and current navigation, plus other navigation hover/pressed states. It verifies native pointer, Space and Enter activation exactly once, real editor opening/cancellation, unchanged source/preference bytes and planner reference, static pressed feedback, reduced motion, reduced effects and forced colors. Chromium forced-colors is tested; desktop WebKit has no supported forced-color emulation here. The existing shell matrix now measures the actual held pair instead of checking only text color.

`buttonContrast.ts` is acceptance-only WCAG sRGB arithmetic, with five unit regressions for known ratios, reproduced failures and invalid/transparent inputs. It rejects uncomposited alpha rather than fabricating evidence. Navigation's transient alpha is allowed to settle before measuring its opaque hover backplate; content/scrim contrast audits remain separate. Run the new production check with `node --experimental-strip-types src/acceptance/buttons.browser.ts` against port 4178, using the same browser prerequisites above.

Review-remediation local results: **736 tests / 25 files passed** (five new contrast-arithmetic tests); typecheck, type-aware lint, production build, formatting, design audit and whitespace checks passed. The new button suite passed 14 engine/palette/reduction contexts, including Chromium forced colors. Existing appearance (84 cases), Phase 2 workflow (25 cases) and mobile editor (three scenarios) checks passed. The shell matrix passed all 64 Chromium/WebKit cases on a serialized rerun. An initial parallel run stopped at the existing WebKit font-readiness assertion; its font assertions were not changed or weakened, and font/loading production code remains unchanged. This transient execution failure is reported rather than represented as an uninterrupted green run. The exact new commit/hosted run is recorded in the updated PR package. No new physical Safari evidence; DT-01 remains unresolved for 2.6E.
