# Homebase 2.6A — design vision and research

Status: **proposal for independent review, not an implemented redesign**. Research checked 2026-10-08. Start with this document, then [system](02-design-system.md), [screens](03-screen-specifications.md), [motion](04-motion-and-interaction.md), [handoff](05-technical-handoff.md) and [acceptance](06-acceptance-and-milestones.md). Open [the static visual atlas](assets/mockups.html) in a browser for both themes, seven screen types and desktop/mobile compositions. Atlas controls are conceptual except the native picker specimens; nothing saves or calls Homebase.

## Baseline and authority

Repository: `lilant5431/homebase`. Independent documentation branch: `docs/phase-2-6a-design-spec`, based on remote main `b710ea0040f05ae873c853045124c3c82ad039d7`. [PR #13](https://github.com/lilant5431/homebase/pull/13) was OPEN at inspection, head `352a744f356eb7ff84d428230438a9a772463e18`. No merge, cherry-pick, product changes or schema changes belong to this milestone.

Inventory distinguishes the main implementation from PR #13's proposed shared mobile editor and acceptance work. User evidence establishes that the eight keyboard checks passed physically on `9299129`. The subsequent stacked Date/Time correction has automated evidence; **the latest task explicitly carries Date/Time visual alignment as unresolved Phase 2.6 issue DT-01**. Neither that correction nor this design is declared physically accepted. Implementing redesigned editors depends on maintainer acceptance/integration of PR #13 or an explicitly reviewed equivalent; do not silently copy the unmerged branch. The documents themselves are independent of its merge.

## Product identity

Homebase should feel like a precise personal work surface. Lead with a deadline, an actionable problem, or a next step. Typography, alignment and grouping supply structure; materials reinforce orientation. Retain the current six destinations, existing academic records and all scheduling semantics. Appearance is the one explicitly requested new preference surface. The full Capture → Understand → Prioritize → Schedule → Complete → Reflect → Adapt vision informs hierarchy, but does not authorize analytics, learning history or AI features that do not exist.

Modern Daylight uses cool pale gray, white sheets, graphite text and a restrained blue action color. Night Flight uses midnight canvas, distinguishable navy layers, pale text, ice-blue action indicators and occasional amber warnings. Its aviation influence is legible timestamps, clear status, separation and quiet illumination. No cockpit gauges, flight data, skyline wallpaper, neon text, decorative school illustrations or perpetual glow animation.

Both themes use identical component anatomy, labels, information order and dimensions. Changing theme never changes a plan, subject identity, completion state or reference time. Subject color is secondary to written class names; status always includes a word and recognizable icon/shape.

## Research synthesis

Authoritative means a standard, platform guideline or documented API; vendor product design is inspiration, not an accessibility rule. The decisions below are Homebase adaptations, not copies of vendor screens.

| Source                                                                                                                                                                             | Evidence type and observation                                                                                               | Homebase decision                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Apple HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Meet Liquid Glass, WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/) | Native-platform guidance: material separates navigation/control layers from content and responds to accessibility settings. | Use restrained web translucency for navigation only where contrast remains bounded; forms, sessions and errors remain solid. CSS blur is an approximation; SwiftUI Liquid Glass APIs are not web APIs.                                                                 |
| [Linear, March 2026 design refresh](https://linear.app/now/behind-the-latest-design-refresh), [release notes](https://linear.app/changelog/2026-03-12-ui-refresh)                  | First-party design rationale: consistent headers and navigation reduce friction while content stays prominent.              | A stable page header/action location, quieter navigation and compact metadata. Do not import Linear's issue taxonomy or icon-only density.                                                                                                                             |
| [Raycast, A fresh look and feel](https://www.raycast.com/blog/a-fresh-look-and-feel), [extension design rationale](https://www.raycast.com/blog/how-raycast-api-extensions-work)   | First-party inspiration: prominent purpose, contextual action area and consistent interaction primitives.                   | Clear form title + one primary save action; secondary controls retain labels. A command palette is deliberately excluded: Homebase has no command/search model.                                                                                                        |
| [Flighty](https://flighty.com/)                                                                                                                                                    | Public product presentation: time, changing status and consequential information are emphasized in a travel context.        | Tabular times, explicit Manual/Recommended labels and prominent conflict reasons. Aviation is an atmosphere, not a metaphor for grades or a copied boarding pass.                                                                                                      |
| [Motion accessibility](https://motion.dev/docs/react-accessibility)                                                                                                                | Library guidance: reduced-motion controls can remove transform/layout animation while retaining state feedback.             | CSS is sufficient for this scope. Adopt equivalent reduced-motion behavior without installing Motion. Reconsider only for a proven multi-element orchestration need.                                                                                                   |
| [Rive web runtime](https://rive.app/docs/runtimes/web/web-js)                                                                                                                      | Runtime documentation: canvas animation/state-machine assets and lifecycle management.                                      | No Rive dependency: there is no required animated illustration. A canvas must never replace semantic status, focus or forms.                                                                                                                                           |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/)                                                                                                                                          | Normative accessibility standard.                                                                                           | Normal text ≥4.5:1; essential component/state boundaries ≥3:1; reflow, visible/unobscured focus, labels, error identification and alternatives to color. Use 44px targets as Homebase's standard; WCAG AA 2.5.8 minimum is 24px with exceptions, not universally 44px. |
| [Browser keyboard viewport model](https://developer.chrome.com/blog/viewport-resize-behavior/), [WebKit fixed-focus report](https://bugs.webkit.org/show_bug.cgi?id=207049)        | Browser explanation and issue evidence; not a diagnosis of every Safari version.                                            | Preserve the physically successful document-scrolling mobile editor. Do not reintroduce fixed-body forms, nested keyboard scrollers or speculative VisualViewport corrections.                                                                                         |

## Design principles and choices

1. Orientation precedes decoration: destination title, date/week context, one primary action, then content.
2. Show why attention is needed using known facts: overdue/due date, unplaced minutes or a specific conflict. Do not present opaque priority scores or imply grade importance.
3. Keep recommendations visibly distinct from decisions: Recommended with a recommendation icon/dashed marker; Manual with a lock/solid marker; Commitment with calendar label; Due with deadline label.
4. Treat a failed save as information the user must retain. Persistent inline/global warning beats a disappearing toast; no success celebration before confirmed persistence.
5. Use progressive effects: the opaque, motionless version is the complete interface. Blur and transitions add polish only after functional acceptance.
6. Design for short height, zoom and touch from the start. A one-column phone agenda is a first-class layout, not a shrunken desktop week.

Rejected: glass under academic text (variable contrast); animated skyline (distraction/cost); custom date/time picker (new interaction burden without evidence); fixed bottom mobile save bar (keyboard obstruction); new global search/detail routes (unsupported product scope); priority reorder on Overview (changes established ordering); preserving two Date/Time columns at all costs (known physical failure).

## Review questions and decision ownership

Approve the shared hierarchy and theme direction before 2.6B. DT-01 requires a physical iPhone comparison before a horizontal narrow-width group can ship. The proposed safe fallback keeps one outer group but stacks its two native fields. Device-specific picker painting cannot be settled by a mockup. The milestone gates in [06](06-acceptance-and-milestones.md) identify who supplies each missing piece of evidence.

## Review snapshots

These are browser-rendered conceptual boards from the static atlas, not screenshots of implemented Homebase. The atlas contains all 28 compositions; these four snapshots make the main visual direction reviewable directly in GitHub. The editor shows the safe narrow-width alternative, not a claimed physical Safari fix.

![Modern Daylight desktop Overview concept](assets/previews/daylight-overview-desktop.png)

![Night Flight desktop Weekly Planner concept](assets/previews/night-week-desktop.png)

![Modern Daylight phone editor concept](assets/previews/daylight-editor-phone.png)

![Night Flight phone conflict concept](assets/previews/night-conflict-phone.png)
