# Semantic design system

The V6 visual direction is approved; these are implementation specification tokens, not production CSS. `themes.daylight` and `themes.night` retain the historical stable documentation keys for the **Light and Dark semantic palettes**, not two environments. `paletteAliases` maps them explicitly. Three environments supply decorative roles only; there are six appearances, not six semantic systems. [tokens.json](tokens.json) is the machine-readable palette/dimension reference. Convert camelCase names to `--hb-kebab-case` (e.g. `onAction` → `--hb-on-action`). Components consume roles, not theme names or direct hex literals. [Calculated contrast evidence](contrast.md) is reproducible with [verify.py](verify.py).

## Color roles

| Token                       | Light palette     | Dark palette      | Role / permitted use                                                      |
| --------------------------- | ----------------- | ----------------- | ------------------------------------------------------------------------- |
| canvas                      | #F3F6FA           | #0B1220           | Page background; no essential text on gradients                           |
| surface                     | #FFFFFF           | #121D2E           | Lists, cards, forms, session and conflict content                         |
| elevated                    | #FFFFFF           | #1A293D           | Menus/editor panels; elevation also uses edge/shadow                      |
| quiet                       | #EAF0F7           | #1C2B40           | Secondary buttons, subdued grouped regions                                |
| text                        | #172334           | #E8EEF6           | Titles, values, main text                                                 |
| muted                       | #536477           | #A8B7CB           | Metadata/help; fully opaque readable text                                 |
| action                      | #1D4ED8           | #8BDDFC           | Primary fill, links, active indicator                                     |
| onAction                    | #FFFFFF           | #0B1220           | Text/icon on primary action                                               |
| actionHover / actionPressed | #1E40AF / #1E3A8A | #B6EAFF / #6CC5E8 | Primary hover/press fills; same onAction                                  |
| border                      | #D5DEE8           | #314359           | Decorative dividers only; not the sole form boundary                      |
| controlBorder               | #64748B           | #71859E           | Input/secondary-button essential outline, separator between native fields |
| selection                   | #E5EDFF           | #233D58           | Selected nav/row; text + explicit selected indicator                      |
| focus                       | #1D4ED8           | #8BDDFC           | 2px outline, 2px solid surface offset; no glow substitution               |
| success / successSurface    | #166534 / #EAF6EF | #7AE0AE / #102C24 | Check + Completed, successful save confirmation                           |
| warning / warningSurface    | #854D0E / #FFF4D6 | #F5C96A / #312611 | Attention/unscheduled; amber is never decorative urgency                  |
| danger / dangerSurface      | #B4233A / #FFF0F2 | #FF9AA7 / #351C28 | Blocking conflict, destructive action/error                               |
| neutral / neutralSurface    | #536477 / #EAF0F7 | #A8B7CB / #1C2B40 | Fixed commitment / neutral metadata                                       |
| cyan / sage                 | #216777 / #23695E | #8BDDFC / #8ED4C2 | Restrained secondary indicators; no additional meanings                   |
| glow                        | #BBDFFF           | #236E91           | Decorative static edge lighting only, no text contrast claim              |

Primary action = action/onAction. Secondary = quiet/text/controlBorder. Tertiary = transparent/action on solid surface; hover uses selection. Destructive actions use danger text on solid surface, not an unverified danger-fill button. Disabled uses quiet + muted + explicit reason; opacity stays 1. Selection is always accompanied by an indicator and `aria-current` or the applicable checked/selected state.

Subject slots (color plus written class name): Light `#315B9A, #5C4A8F, #23695E, #86531A, #924968, #4D6479`; Dark `#9ABEF3, #C3B2F4, #8ED4C2, #E8BF82, #E7A9C6, #ACC2D8`. These are presentation candidates, not a data migration. Existing persisted class colors remain untouched; legacy/custom swatches are decorative dots with a controlBorder rim and text in the theme's text token. Never put white text directly over an arbitrary saved color. A reviewed lookup may map recognized palette slots to theme variants without rewriting stored values; unknown colors retain the decorative-dot treatment.

## Contrast evidence and limits

[contrast.md](contrast.md) contains 92 calculated passing pairs: body/metadata across surfaces, primary default/hover/pressed, state foreground/background, subject text on surface, control/focus boundaries and glass composites over black/white extremes. Targets: 4.5:1 for all tested text, 3:1 for essential boundaries. We do not claim that decorative separators, arbitrary alpha composites, subject-color-only states, native picker internals or every assembled screen are WCAG conformant. Rendered checks remain mandatory. Token contrast does not prove focus order, reflow, readable content or picker usability.

## Typography, spacing and dimensions

Retain existing bundled DM Sans for body/control text and Manrope for headings/brand; system-ui/sans-serif fallback must remain usable. No new font download or network dependency. Static atlas uses system fallback when bundled fonts are unavailable; it is a layout study, not typography acceptance.

| Role            | Size / line height               | Weight / behavior                                  |
| --------------- | -------------------------------- | -------------------------------------------------- |
| Page heading    | 28/36px desktop; 24/32px compact | 700; one h1, wrap normally                         |
| Section heading | 20/28px                          | 700; sentence case                                 |
| Card/title      | 16/24px                          | 600; wrap, do not hide deadlines                   |
| Body / control  | 16/24px                          | 400/500; never shrink native input text below 16px |
| Metadata / help | 14/20px                          | 400/500; muted, never low-opacity                  |
| Short status    | 12/16px                          | 600; status word + icon, not long prose            |
| Time/duration   | 14/20px                          | tabular numerals; units always visible             |

Spacing scale: 0, 4, 8, 12, 16, 24, 32, 48, 64px. Default row gap 12px; card padding 16px; desktop section gap 24px; phone side gutters 16px. Content maximum 1440px (excluding navigation); rail 216px; editor outer width ≤720px. Controls ≥44px high and interactive icon targets ≥44×44px. Compact rows may be 56px; cards grow for wrapped content. Border radii: control 8px, content card 12px, floating layer 16px, pill 999px for short statuses and the decorative lattice capsule; never native fields. No pill-shaped text fields. Borders 1px, focus outline 2px. Use rem equivalents for text/minimum field widths; allow zoom/text scaling to trigger stacking.

Elevation: 0 = no shadow; 1 = `0 1px 2px rgba(11,18,32,.08)` Daylight / `0 1px 2px rgba(0,0,0,.24)` Night; 2 = `0 8px 24px rgba(11,18,32,.12)` / `0 8px 24px rgba(0,0,0,.32)`; 3 = `0 16px 40px rgba(11,18,32,.18)` / `0 16px 40px rgba(0,0,0,.40)`. Card boundaries must work without shadows. Layer order: page 0, nav 10, transient menu 20, backdrop 30, editor 40; mobile editor remains document flow rather than a fixed transformed ancestor.

## Final material system

Content material is independent from environment/palette and from navigation glass. **Only Solid and Frosted are current choices**. The discarded third material is not an option. Prefer Solid until real-device evidence supports Frosted at each surface.

| Material          | Default / states                                                                                                                                               | Effective fallback and protections                                                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Solid content     | surface/elevated 100%, no panel blur; text opacity 1; default                                                                                                  | Identical geometry under all reductions. Essential boundaries/focus use their solid semantic roles.                                                                                            |
| Frosted content   | 72% surface alpha; candidate cap 4px desktop / 3px phone; opaque text and stronger metadata `#35465A` Light / `#D0DCEA` Dark                                   | OS/manual reduced effects, forced colors or unsupported blur → actual opaque Solid, while selected `material=frosted` is retained. Restoration reapplies Frosted. Never fade the card subtree. |
| Navigation glass  | Separate outer reflective environment skin + tested text-bearing scrim; default/hover/selected/pressed/focused/disabled retain words and visible state markers | Opaque elevated, no decorative reflection/halo when reduced or unsupported. No double-blurred layers. Essential focus is a 2px solid ring with 2px solid offset.                               |
| Interaction glass | Menus/floating exterior; conservative 8px blur cap, opaque selected items and actionable content                                                               | Same opaque fallback; closed/disabled controls never require shine. No floating mobile editor Save bar.                                                                                        |

Frosted is permitted only for validated record/list/metric panel backgrounds. Individual semantic sessions, editor inputs, notices, conflict explanations, error surfaces and critical control labels remain opaque. Keep local action/selected-day backplates opaque, as in V6. Class colors stay decorative with written names. Default border uses `border`; Frosted edge candidates use `contentMaterials.frosted` but do not replace essential `controlBorder`/focus semantics.

Navigation exterior targets the V6 appearance: Sunlit cool pale-blue reflections (`#F0F8FF` / .70 outer decorative skin); Moonlit `#07101E` / .94 with `#080F1B` branding, fine silver edge, steel geometry and restrained cyan. These are **decorative shell tokens, not new semantic palettes**. The original `glass.daylight` white/.92 and `glass.night` surface/.94 recipes remain conservative text-bearing scrims with their 92-pair contrast evidence. Place labels on these checked scrims/opaque inset controls where the exterior alone is insufficient. Production must verify assembled text/focus contrast; do not claim the .70 exterior passes all text combinations. V6's 18px chrome blur is reference evidence, not a mandatory mobile budget: start with the documented 12px navigation cap and use less/no blur on constrained devices without changing the approved lighting/geometry. Content Frosted remains separately bounded.

Backdrop remains Light `rgba(11,18,32,.48)` / Dark `rgba(0,0,0,.64)`, no blur. Preserve accepted document-scrolling page shading. Reflections/soft halos stay behind chrome or scenery, never body text/forms/errors. Forced colors use system surfaces/outlines; explicit reductions work even where OS transparency queries do not. Capability-gate standard/prefixed blur and keep prefixed-first/standard-last declarations when building CSS.

## Environment decoration and capsule

`environmentDecorations` records approved V6 decorative color endpoints. Lattice uses one geometry tree for sunlight/moonlight; Landscape one finite mountain/cloud/lake geometry for both palettes, sparse **steady** Dark stars and full-workspace coverage (no band). Basic has no continuous atmosphere. Scale shared decoration to the actual workspace, including tall phone content; it must not clip controls or create document overflow. Atmosphere is pointer-transparent and hidden from assistive technology.

Lattice capsule: **112px × 8px**, radius 999px, inside existing **26px** flow slot/margins. Fine palette-colored edge, inset highlight, bounded **8px** halo and existing shared light-position sheen. No handler/click/focus, extra cue target or loop. Reduced motion freezes its existing lighting; reduced effects/forced colors hide the paint while preserving layout geometry. It must remain quieter than headings/content. Landscape/Basic do not gain a new bar.

## Supplemental Frosted evidence

[contrast.md](contrast.md) retains 92 original semantic pairs and records eight new reproducible Frosted black/white envelope checks. Stronger metadata colors are scoped to Frosted; original semantic foregrounds remain unchanged. The [V6 source report](https://github.com/lilant5431/homebase/blob/0593c853596f47a5fbc4370b92f4e455bdef1a66/experiments/phase-2-6a-v-visual-audition/research/material-v6-results.md) previously recorded 704 computed roles across Chromium/Linux WebKit: minimum sampled 6.07:1, Frosted envelope ≥4.84:1. That is experiment evidence at a pinned commit, not a newly run production or physical Safari certification.

## Shared component state contract

| Component family       | Required states and behavior                                                                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button / IconButton    | Default, hover (fine pointer only), focus-visible, pressed, disabled with reason. Native button semantics; loading only if a real async operation exists. No fake spinner for synchronous saves. Destructive label says what is removed. |
| NavigationItem         | Text/icon, current marker, focus, hover; current destination remains visible. Whole 44px row hit area. No status conveyed solely by tint.                                                                                                |
| RecordRow / Card       | Title → class/type → deadline/time → optional estimate; wrap. Separate edit, delete and completion buttons, never nested buttons. No hover-only required actions.                                                                        |
| StatusBadge            | Icon + word + semantic tint; Recommended, Manual, Commitment, Due, Completed, Unscheduled, Conflict are distinct. Subject tint does not replace status.                                                                                  |
| Field / DateTimeGroup  | Label, optional/required cue, help, validation message, disabled reason, focus and native picker. Associate errors with `aria-describedby`; `aria-invalid` only when invalid. No placeholder-only labels.                                |
| EditorShell            | Title, close, fields, inline error, Cancel and primary action. Mobile native document scrolling; desktop bounded solid dialog. Preserve draft, opener focus and scroll restoration.                                                      |
| Notice / ConflictPanel | Persistent until underlying issue changes; title, consequence, reason, applicable repair action. Announce changes once, not every render. No auto-dismiss on failure.                                                                    |
| EmptyState             | Explain absence and a valid next action; no mock data unless planner is genuinely empty under the existing guard.                                                                                                                        |
| AppearanceChoice       | Independent environment selector, System/Light/Dark radio group, Solid/Frosted selector and effects/motion reduction preferences, with explicit selected states. Future UI, not existing functionality.                                  |

## Historical showcase recipes — superseded exterior styling

[Showcase](assets/mockups.html#materials-motion) styling is isolated in [materials-motion.css](assets/materials-motion.css). It refines existing material tokens without changing passed contrast roles. It is retained as historical state/anatomy evidence, not the current environment exterior recipe or installed application CSS. The final material contracts above take precedence.

| Layer                    | Exact construction                                                                                                                                                                                                | State / fallback                                                                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test scene behind chrome | quiet base; static radial reflected light from glow at 10%/0%, fading by 55%; overall scene opacity .30 Daylight/.40 Night. Sparse 115° canvas-colored 2px lines, 160px period. Confined behind chrome specimens. | Entire reflection/line layer removed for reduced effects/transparency/forced colors. Never beneath academic content. These scene numbers are review candidates, not additional semantic colors or a required app background. |
| Navigation shell         | 16px radius; 12px inset; existing white .92 / surface .94 scrim; blur 12px maximum; 1px controlBorder boundary; inset top highlight white .65/.08; elevation 1.                                                   | Unsupported blur: opaque elevated; reduction: opaque elevated, no reflections/shadow/halo. Geometry and labels unchanged.                                                                                                    |
| Menu                     | Same scrim; blur 8px; elevation 2; 16px radius/12px inset; 1px controlBorder. Header/help text uses opaque muted token; item hit areas use opaque elevated and selection.                                         | Selected item adds a visible check and word; native focus outline remains 2px with 2px solid offset. Reduced/unsupported: opaque elevated. No double-blurred menu sitting over glass navigation.                             |
| Active navigation        | Opaque selection with text, 2px action-colored vertical marker, 10px top/bottom inset; fine edge, not text glow.                                                                                                  | Night only: existing `0 0 16px rgba(35,110,145,.14)` marker halo. At most one halo per navigation surface. No Daylight halo; no halo in reduced/forced colors.                                                               |
| Primary action           | Opaque action/onAction; 8px radius; at least 44px height, 12px horizontal inset; pressed actionPressed, focused solid focus/offset; disabled quiet/muted/controlBorder plus reason, opacity 1.                    | No blur, glow or translucent actionable text. Hover/press transition respects motion reduction.                                                                                                                              |
| Floating holder          | Interaction scrim/8px blur/elevation 2, 16px radius and 12px inset; label/value inside an opaque surface capsule, primary action fully opaque.                                                                    | Opaque holder when reduced/unsupported. No mobile editor Save bar. This illustration does not authorize a new floating product feature.                                                                                      |

The optional Night indicator uses the same solid action marker with a written state label, not an additional status color or persistent animation. Reflections and fine edges carry no meaning. The showcase confines them to navigation/chrome; successful-action storyboards use solid session content. CSS-only 80/120/160/180ms state changes follow 04. No blur, reflection position, backdrop or native-input animation is proposed.

The amber Unscheduled work example uses the existing solid warningSurface/warning pair with a written consequence; it is not decorative cockpit lighting. Normal/reduced specimens are side by side, with identical words, dimensions and state markers. Forced colors use system foregrounds/backgrounds/boundaries and visible focus; native contrast requires rendered review beyond this candidate example. All 92 existing token-pair checks remain applicable and unchanged; they do not certify every gradient, rasterized blur or intermediate animation frame. Text stays on the checked scrim or solid token, never directly on the illustrative scene.

The documentation audit additionally checks muted labels against the maximum scene-light wash over both quiet/canvas endpoints (four supplemental pairs, 4.5:1 target). Minimum calculated ratio: **5.00:1 Daylight, 4.91:1 Night**. These bounded recipe calculations do not certify rasterized glass or device-native controls. The original 92-pair semantic contrast report is unchanged.
