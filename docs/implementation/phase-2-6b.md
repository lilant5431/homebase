# Phase 2.6B — appearance foundations

Base: `81badeacc5cb399b00d6784ab9eba8bae5da1104`, including the approved 2.6A specification. PR #15 remains read-only at `0593c853596f47a5fbc4370b92f4e455bdef1a66`; none of its project/source/dependencies are copied.

## Contract → implementation → regression protection

| Contract                                                                         | Implementation                                                                                | Evidence                                                                                                                                   |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Exact version-1 preferences, valid sibling recovery, isolated reads/writes       | `src/appearance.ts`                                                                           | `appearance.test.ts`: enums, types, defaults, partial/malformed/future values, blocked storage; no automatic recovery writes               |
| Selected/effective separation, mandatory OS reductions, independent environments | Pure `resolveAppearance`                                                                      | All six combinations and 2,304 preference/capability combinations; Frosted restoration, Basic static policy, frozen inputs/no clock        |
| Persisted palette before visible render, one authority                           | `appearanceBootstrap.ts`, `appearanceBrowser.ts`, Vite head injection, HTML token stylesheet  | `appearanceBrowser.test.ts`, boundary parity and actual Chromium/Linux WebKit pre-mount frame checks                                       |
| Live OS, cross-tab synchronization, listener cleanup, truthful tab-only warning  | `AppearanceBoundary.tsx`                                                                      | `AppearanceBoundary.test.tsx`: OS/storage transitions, StrictMode cleanup, no API/storage fallback, clear/removal, invalid-event rejection |
| No domain writes, remount, draft loss or scheduling dependency                   | Stable App child; only settings/decoration consume appearance                                 | Same editor DOM node/draft; same plan, source and reference objects; source bytes unchanged; actual browser session/reference checks       |
| Approved semantic colors, opaque critical surfaces, bounded Frosted              | `styles/tokens.css`, incremental paint substitutions in `styles.css`, `styles/appearance.css` | CSS/token parity and existing contrast audit; production browser/native field/reduction/geometry checks                                    |
| Accessible controls without shell redesign                                       | Native details/selects/button in existing sidebar                                             | Keyboard/focus, 44px controls, six reference widths including 320px, scrolling short-landscape drawer                                      |
| Disposable presentation seam                                                     | `VisualEffectsLayer.tsx`                                                                      | Inert, aria-hidden, no handlers/store/domain imports; no scene, rendering library or animation loop                                        |

## Preference and first-paint behavior

`homebase.appearance.v1` is independent from both source-record keys. Defaults: Lattice / System palette / Solid / System effects / System motion, numeric version 1. Invalid individual fields fall back independently; invalid JSON/object/version falls back entirely **in memory**. Unknown fields are ignored. Startup never deletes or rewrites source bytes. Explicit selection/reset writes a full version-1 appearance preference only.

Selected Frosted remains selected when effective Solid is necessary. Effects reduction = OS reduced transparency OR manual Reduced OR forced colors. Motion reduction = OS reduced motion OR manual Reduced OR effective effects reduction. Unsupported standard/prefixed blur forces Solid, without discarding the preference. Basic never permits continuous atmosphere. Editors, native fields, session cards, warnings, conflicts and availability/unplaced panels remain opaque.

Storage write failure applies the tab selection and announces: “Appearance applies to this tab; this browser could not save your preference.” It does not use academic error state. Valid appearance storage events synchronize; invalid/future events and other keys/sessionStorage are ignored; key removal or a localStorage clear restores defaults. There is no academic synchronization.

Vite bundles the **same** pure/browser modules into a small inline IIFE at a head marker after charset and before styles/React. This is synchronous at browser runtime, not a React effect, async request or duplicate handwritten resolver. React adopts its snapshot and installs/cleans up OS listeners. The cache is invalidated during development changes. No visibility workaround, CSP relaxation or runtime dependency is added. If a CSP is introduced, authorize the emitted script with a build hash/nonce; do not add unsafe-inline. CSS has an OS/System fallback without JavaScript (the React application itself still requires JavaScript).

Appearance does not become an App key or a planner memo dependency. The initial planner reference is still captured once in main, independently of appearance. No academic/scheduling module, schema, validation or storage key changed.

## CSS scope and deferred work

Existing selectors, screen composition, native input appearance, sizing and Safari portal/document-scroll lifecycle are retained. Paint values now use the approved two palettes; completed/disabled backgrounds no longer fade whole content, preserving readable semantic text. Frosted is limited to existing noncritical panel backplates with opaque text and stronger metadata/edge roles, at .72 alpha and 4px blur (3px phone/short landscape). This is a foundational opt-in, not the full 2.6D card redesign or final real-device compositing certification.

All three environment selections persist and reach the inert decoration boundary, but share a static canvas **in this milestone**. Full Lattice/Landscape scenery is 2.6F; glass navigation and interaction lighting are 2.6C. Existing sizes/typography/legacy class swatches remain for later scoped screen work. No animation/shader/dependency, duplicate component tree or quality-setting registry is installed.

**DT-01 remains unresolved, assigned to 2.6E.** The accepted eight physical keyboard checks and failed four Date/Time visual checks remain as recorded in [Phase 2 acceptance](../acceptance/phase-2.md). Desktop native-control geometry cannot close that exception.

## Reproduce verification

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run format:check
python3 docs/design/phase-2-6/verify.py
git diff --check
```

In a second terminal:

```sh
npx vite preview --host 127.0.0.1 --port 4176 --strictPort
```

Then:

```sh
npx playwright install chromium webkit
node --experimental-strip-types src/acceptance/appearance.browser.ts
```

The new acceptance script runs both engines against the **built app**, not Vite source mocks. It intercepts the React module with an empty module to inspect an actual bootstrap/CSS pre-mount frame opposite OS; then loads the original module under a fresh URL in the same document and checks adoption. It also checks script-disabled OS CSS fallback, all six appearances at 1440×900, 820×1180, 390×844, 844×390, 667×375 320×640, and 720×450 (the CSS reflow equivalent of 200% desktop zoom), native controls/focus, Chromium 2× visual-viewport scaling (not physical pinch certification), live OS/reductions, Chromium forced colors, actual two-tab events/removal/clear, blocked storage/absent capabilities and stable source bytes/draft/planner output. Screenshots are generated at the paths below.

Existing browser acceptance stays unchanged: run a preview on 4174 and `node --experimental-strip-types src/acceptance/phase2.browser.ts`, followed by `node --experimental-strip-types src/acceptance/mobile.browser.ts`. Browser checks are separate from the hosted unit/type/lint/build/format job.

## Verification evidence

- Baseline: **604 tests / 20 files passed** before implementation. Final: **702 tests / 23 files passed**, including 98 new appearance tests and a 2,304-case precedence property.
- Clean dependency install passed with a writable `/tmp` npm cache after the default cache location was denied by the workspace sandbox. Lockfile/package versions are unchanged.
- Typecheck, zero-warning type-aware lint, build, formatting and whitespace checks passed. No lint suppression or rule weakening.
- Design audit: **92 semantic + 4 reflection + 8 Frosted envelope** checks passed; original design assets/hashes/links resolve. Semantic palette parity also runs in the unit suite.
- Chromium and Linux WebKit: **84 appearance/viewport combinations**, four explicit-opposite-OS pre-mount cases, script-disabled fallback, live preferences, source/draft isolation, real cross-tab and fault cases passed. Existing Phase 2 browser workflows passed across five sizes; existing mobile regression script passed at 390×844, 844×390 and 667×375.
- Cloud browser setup: `PLAYWRIGHT_BROWSERS_PATH=/tmp/homebase-pw-browsers`. WebKit's dlopen preflight consults `/sbin/ldconfig -p` and misses the locally extracted library. `ctypes.CDLL('libGLESv2.so.2')` successfully loaded it with `LD_LIBRARY_PATH=/tmp/homebase-webkit-libs/root/usr/lib/x86_64-linux-gnu`. The actual browser run used that library path and `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` solely for this cache-based dependency probe; browser startup/execution and all assertions still had to succeed. No application/browser security flags or repository dependencies were changed.
- Hosted `CI / verify` must pass on the published PR head; its exact run/head is in the PR review package. An old baseline run does not count.

[Light foundation screenshot](assets/phase-2-6b-light-desktop.png) · [Dark foundation screenshot](assets/phase-2-6b-dark-desktop.png). These show the running foundation/settings, **not** the final V6 redesign.

## Limits

No fresh physical iPhone/iPad, VoiceOver or battery/warmth certification is claimed. Linux WebKit is not physical Safari. 320px reflow and browser focus/reductions are evidence, not complete accessibility certification. Further assembled-screen contrast, legacy class colors and real-device Frosted performance remain 2.6D/F/G gates. Native picker visuals remain 2.6E. No atmosphere, new academic workflow, scheduling change, appearance-triggered refresh, cloud, GPU renderer or automatic merge is introduced.

Next scoped implementation after independent review and maintainer merge: **2.6C — Shell and navigation**.

## Final review: bootstrap/listener storage gap

Confirmed on the original PR head `528f46b`: the regression “reconciles Dark saved after the Light bootstrap and before listener installation” failed with Light instead of Dark. A real two-tab Chromium reproduction also failed: the initializing document received the other tab’s storage event before the React module loaded, then stayed Light after mount. Module loading leaves a real event-loop gap; a later capability refresh cannot recover a lost preference event.

The boundary now installs its listener before one appearance-only reconciliation read. Valid preferences or key removal converge; corrupt/future-version values and blocked reads retain the current snapshot without writing. A selection revision protects newer local choices/events, and a one-time ref prevents StrictMode replay from re-reading stale persisted data over failed-save tab-only choices. Synchronous bootstrap and the shared resolver are unchanged. The old no-mount-read assertion was replaced with an exact single appearance-key read and unchanged no-write protection because that additional read closes the demonstrated gap.

Nine added unit regressions cover the gap, invalid/future data, removal, blocked reads, early tab-only selection with/without StrictMode, newer selection precedence, and single-read StrictMode replay. The production-build browser runner now verifies the missed-event scenario with two actual tabs in both Chromium and Linux WebKit, alongside existing first-paint, OS, reductions, storage, editor/draft and planner isolation checks. These are desktop browser results, not fresh physical Safari acceptance; DT-01 remains deferred to 2.6E.
