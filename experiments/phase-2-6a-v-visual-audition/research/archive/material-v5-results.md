> Historical V5 numeric evidence only. The third material was retired in V6; no current control, source/test branch or screenshot depends on it. This record describes the V5 commit, not a current comparison or recommendation. Current checks are documented in [V6 verification](../verification.md).

# Archived V5 material evidence

Both actual Linux engines; recorded by `tests/material-evidence.ts` at V5 commit `36954bc80afcd785a41db821507c68757bb0c934`. Full per-panel reports were ignored test artifacts. Running the current browser suite generates V6 evidence instead; these historical measurements require the V5 checkout to reproduce.

| Engine/palette/material    | Computed fill               | Desktop blur | Minimum sampled contrast | Full black/white envelope |
| -------------------------- | --------------------------- | ------------ | ------------------------ | ------------------------- |
| chromium / Light / solid   | `rgb(255, 255, 255)`        | `none`       | 6.07:1                   | 6.07:1                    |
| chromium / Light / frosted | `rgba(255, 255, 255, 0.72)` | `blur(4px)`  | 6.70:1                   | 4.85:1                    |
| chromium / Light / clearer | `rgba(255, 255, 255, 0.26)` | `blur(1px)`  | 6.07:1                   | 6.07:1                    |
| chromium / Dark / solid    | `rgb(18, 29, 46)`           | `none`       | 8.30:1                   | 8.30:1                    |
| chromium / Dark / frosted  | `rgba(18, 29, 46, 0.72)`    | `blur(4px)`  | 9.66:1                   | 4.84:1                    |
| chromium / Dark / clearer  | `rgba(18, 29, 46, 0.24)`    | `blur(1px)`  | 8.30:1                   | 8.30:1                    |

## chromium representative scenery and actual pixels

1440px Overview, same panel footprint for each material. Scenery RGB extrema sample the original scene below the first metric; painted swatches sample three empty padding positions along its right edge. These demonstrate real rendered differences, not only CSS attributes.

- Light / solid: scene darkest `[206, 222, 231]`, brightest `[226, 237, 241]`; painted `[[255, 255, 255], [255, 255, 255], [255, 255, 255]]`.
- Light / frosted: scene darkest `[206, 222, 231]`, brightest `[226, 237, 241]`; painted `[[247, 250, 251], [247, 250, 251], [247, 250, 251]]`.
- Light / clearer: scene darkest `[206, 222, 231]`, brightest `[226, 237, 241]`; painted `[[232, 240, 244], [232, 241, 243], [233, 241, 244]]`.
- Dark / solid: scene darkest `[28, 44, 65]`, brightest `[46, 66, 89]`; painted `[[18, 29, 46], [18, 29, 46], [18, 29, 46]]`.
- Dark / frosted: scene darkest `[28, 44, 65]`, brightest `[46, 66, 89]`; painted `[[22, 35, 52], [22, 34, 52], [22, 34, 52]]`.
- Dark / clearer: scene darkest `[28, 44, 65]`, brightest `[46, 66, 89]`; painted `[[29, 44, 64], [29, 44, 64], [29, 44, 64]]`.

Moonlit computed navigation `rgba(7, 16, 30, 0.94)`, brand `rgb(8, 15, 27)`, mark `rgb(199, 215, 233)`.

| webkit / Light / solid | `rgb(255, 255, 255)` | `none` | 6.07:1 | 6.07:1 |
| webkit / Light / frosted | `rgba(255, 255, 255, 0.72)` | `blur(4px)` | 6.70:1 | 4.85:1 |
| webkit / Light / clearer | `rgba(255, 255, 255, 0.26)` | `blur(1px)` | 6.07:1 | 6.07:1 |
| webkit / Dark / solid | `rgb(18, 29, 46)` | `none` | 8.30:1 | 8.30:1 |
| webkit / Dark / frosted | `rgba(18, 29, 46, 0.72)` | `blur(4px)` | 9.62:1 | 4.84:1 |
| webkit / Dark / clearer | `rgba(18, 29, 46, 0.24)` | `blur(1px)` | 8.30:1 | 8.30:1 |

## webkit representative scenery and actual pixels

1440px Overview, same panel footprint for each material. Scenery RGB extrema sample the original scene below the first metric; painted swatches sample three empty padding positions along its right edge. These demonstrate real rendered differences, not only CSS attributes.

- Light / solid: scene darkest `[212, 226, 232]`, brightest `[228, 239, 242]`; painted `[[255, 255, 255], [255, 255, 255], [255, 255, 255]]`.
- Light / frosted: scene darkest `[212, 226, 232]`, brightest `[228, 239, 242]`; painted `[[247, 250, 251], [247, 250, 251], [247, 250, 251]]`.
- Light / clearer: scene darkest `[212, 226, 232]`, brightest `[228, 239, 242]`; painted `[[234, 241, 244], [234, 242, 245], [235, 242, 245]]`.
- Dark / solid: scene darkest `[31, 46, 68]`, brightest `[49, 67, 89]`; painted `[[18, 29, 46], [18, 29, 46], [18, 29, 46]]`.
- Dark / frosted: scene darkest `[31, 46, 68]`, brightest `[49, 67, 89]`; painted `[[23, 35, 53], [23, 35, 53], [23, 35, 53]]`.
- Dark / clearer: scene darkest `[31, 46, 68]`, brightest `[49, 67, 89]`; painted `[[32, 47, 66], [31, 46, 66], [31, 46, 65]]`.

Moonlit computed navigation `rgba(7, 16, 30, 0.94)`, brand `rgb(8, 15, 27)`, mark `rgb(199, 215, 233)`.

All 1,056 computed role checks across engines pass AA 4.5:1. Lowest sampled ratio: **6.07:1**. Frosted full-envelope minimum: **4.84:1**. Clearer roles require actual opaque backing; no opacity on text/card subtrees. Original 24 solid-role checks include semantic session/critical surfaces, essential control edges and focus at their applicable thresholds.

Sampling and modeled blends do not prove every future composition or physical Safari appearance. Forced colors/native rendering still depend on the browser. Compare actual screenshots and use the physical checklist before approving V5.
