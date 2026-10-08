# Calculated contrast evidence

Generated from [tokens.json](tokens.json) by [verify.py](verify.py). Reproduce with `python3 docs/design/phase-2-6/verify.py`; regenerate deliberately with `--write-contrast` after a palette edit.

WCAG sRGB relative luminance: channels ≤0.04045 divide by 12.92, otherwise ((channel+0.055)/1.055)^2.4; luminance weights 0.2126/0.7152/0.0722; ratio (lighter+0.05)/(darker+0.05). Checks use unrounded ratios. Text targets 4.5:1, essential control/focus boundaries 3:1. All text is checked at the normal-text threshold, even when displayed large. Alpha surfaces are composited in sRGB before luminance calculation against black and white extremes. These are token-pair checks, not whole-interface WCAG certification. Unlisted combinations, gradients, legacy subject colors, native picker internals and actual rasterized glass still require rendered review. Decorative border/glow tokens carry no semantic contrast claim.

| Theme    | Foreground / background    | Computed ratio | Target | Result |
| -------- | -------------------------- | -------------- | ------ | ------ |
| daylight | text / canvas              | 14.61:1        | 4.5:1  | Pass   |
| daylight | text / surface             | 15.83:1        | 4.5:1  | Pass   |
| daylight | text / elevated            | 15.83:1        | 4.5:1  | Pass   |
| daylight | text / quiet               | 13.80:1        | 4.5:1  | Pass   |
| daylight | text / selection           | 13.49:1        | 4.5:1  | Pass   |
| daylight | muted / canvas             | 5.60:1         | 4.5:1  | Pass   |
| daylight | muted / surface            | 6.07:1         | 4.5:1  | Pass   |
| daylight | muted / elevated           | 6.07:1         | 4.5:1  | Pass   |
| daylight | muted / quiet              | 5.30:1         | 4.5:1  | Pass   |
| daylight | muted / selection          | 5.17:1         | 4.5:1  | Pass   |
| daylight | neutral / canvas           | 5.60:1         | 4.5:1  | Pass   |
| daylight | neutral / surface          | 6.07:1         | 4.5:1  | Pass   |
| daylight | neutral / elevated         | 6.07:1         | 4.5:1  | Pass   |
| daylight | neutral / quiet            | 5.30:1         | 4.5:1  | Pass   |
| daylight | neutral / selection        | 5.17:1         | 4.5:1  | Pass   |
| daylight | onAction / action          | 6.70:1         | 4.5:1  | Pass   |
| daylight | onAction / actionHover     | 8.72:1         | 4.5:1  | Pass   |
| daylight | onAction / actionPressed   | 10.36:1        | 4.5:1  | Pass   |
| daylight | action / surface           | 6.70:1         | 4.5:1  | Pass   |
| daylight | danger / surface           | 6.48:1         | 4.5:1  | Pass   |
| daylight | success / surface          | 7.13:1         | 4.5:1  | Pass   |
| daylight | warning / surface          | 6.85:1         | 4.5:1  | Pass   |
| daylight | cyan / surface             | 6.42:1         | 4.5:1  | Pass   |
| daylight | sage / surface             | 6.45:1         | 4.5:1  | Pass   |
| daylight | success / successSurface   | 6.43:1         | 4.5:1  | Pass   |
| daylight | warning / warningSurface   | 6.25:1         | 4.5:1  | Pass   |
| daylight | danger / dangerSurface     | 5.86:1         | 4.5:1  | Pass   |
| daylight | neutral / neutralSurface   | 5.30:1         | 4.5:1  | Pass   |
| daylight | focus / canvas             | 6.18:1         | 3:1    | Pass   |
| daylight | focus / surface            | 6.70:1         | 3:1    | Pass   |
| daylight | focus / elevated           | 6.70:1         | 3:1    | Pass   |
| daylight | controlBorder / canvas     | 4.39:1         | 3:1    | Pass   |
| daylight | controlBorder / surface    | 4.76:1         | 3:1    | Pass   |
| daylight | controlBorder / elevated   | 4.76:1         | 3:1    | Pass   |
| daylight | subject 1 / surface        | 6.79:1         | 4.5:1  | Pass   |
| daylight | subject 2 / surface        | 7.42:1         | 4.5:1  | Pass   |
| daylight | subject 3 / surface        | 6.45:1         | 4.5:1  | Pass   |
| daylight | subject 4 / surface        | 6.43:1         | 4.5:1  | Pass   |
| daylight | subject 5 / surface        | 6.22:1         | 4.5:1  | Pass   |
| daylight | subject 6 / surface        | 6.15:1         | 4.5:1  | Pass   |
| daylight | text / glass over #000000  | 13.23:1        | 4.5:1  | Pass   |
| daylight | muted / glass over #000000 | 5.08:1         | 4.5:1  | Pass   |
| daylight | focus / glass over #000000 | 5.60:1         | 3:1    | Pass   |
| daylight | text / glass over #FFFFFF  | 15.83:1        | 4.5:1  | Pass   |
| daylight | muted / glass over #FFFFFF | 6.07:1         | 4.5:1  | Pass   |
| daylight | focus / glass over #FFFFFF | 6.70:1         | 3:1    | Pass   |
| night    | text / canvas              | 16.04:1        | 4.5:1  | Pass   |
| night    | text / surface             | 14.50:1        | 4.5:1  | Pass   |
| night    | text / elevated            | 12.60:1        | 4.5:1  | Pass   |
| night    | text / quiet               | 12.25:1        | 4.5:1  | Pass   |
| night    | text / selection           | 9.57:1         | 4.5:1  | Pass   |
| night    | muted / canvas             | 9.18:1         | 4.5:1  | Pass   |
| night    | muted / surface            | 8.30:1         | 4.5:1  | Pass   |
| night    | muted / elevated           | 7.21:1         | 4.5:1  | Pass   |
| night    | muted / quiet              | 7.01:1         | 4.5:1  | Pass   |
| night    | muted / selection          | 5.48:1         | 4.5:1  | Pass   |
| night    | neutral / canvas           | 9.18:1         | 4.5:1  | Pass   |
| night    | neutral / surface          | 8.30:1         | 4.5:1  | Pass   |
| night    | neutral / elevated         | 7.21:1         | 4.5:1  | Pass   |
| night    | neutral / quiet            | 7.01:1         | 4.5:1  | Pass   |
| night    | neutral / selection        | 5.48:1         | 4.5:1  | Pass   |
| night    | onAction / action          | 12.34:1        | 4.5:1  | Pass   |
| night    | onAction / actionHover     | 14.45:1        | 4.5:1  | Pass   |
| night    | onAction / actionPressed   | 9.62:1         | 4.5:1  | Pass   |
| night    | action / surface           | 11.16:1        | 4.5:1  | Pass   |
| night    | danger / surface           | 8.41:1         | 4.5:1  | Pass   |
| night    | success / surface          | 10.56:1        | 4.5:1  | Pass   |
| night    | warning / surface          | 10.83:1        | 4.5:1  | Pass   |
| night    | cyan / surface             | 11.16:1        | 4.5:1  | Pass   |
| night    | sage / surface             | 9.95:1         | 4.5:1  | Pass   |
| night    | success / successSurface   | 9.31:1         | 4.5:1  | Pass   |
| night    | warning / warningSurface   | 9.50:1         | 4.5:1  | Pass   |
| night    | danger / dangerSurface     | 7.74:1         | 4.5:1  | Pass   |
| night    | neutral / neutralSurface   | 7.01:1         | 4.5:1  | Pass   |
| night    | focus / canvas             | 12.34:1        | 3:1    | Pass   |
| night    | focus / surface            | 11.16:1        | 3:1    | Pass   |
| night    | focus / elevated           | 9.69:1         | 3:1    | Pass   |
| night    | controlBorder / canvas     | 4.95:1         | 3:1    | Pass   |
| night    | controlBorder / surface    | 4.47:1         | 3:1    | Pass   |
| night    | controlBorder / elevated   | 3.89:1         | 3:1    | Pass   |
| night    | subject 1 / surface        | 8.89:1         | 4.5:1  | Pass   |
| night    | subject 2 / surface        | 8.86:1         | 4.5:1  | Pass   |
| night    | subject 3 / surface        | 9.95:1         | 4.5:1  | Pass   |
| night    | subject 4 / surface        | 9.84:1         | 4.5:1  | Pass   |
| night    | subject 5 / surface        | 8.77:1         | 4.5:1  | Pass   |
| night    | subject 6 / surface        | 9.24:1         | 4.5:1  | Pass   |
| night    | text / glass over #000000  | 14.77:1        | 4.5:1  | Pass   |
| night    | muted / glass over #000000 | 8.46:1         | 4.5:1  | Pass   |
| night    | focus / glass over #000000 | 11.37:1        | 3:1    | Pass   |
| night    | text / glass over #FFFFFF  | 12.29:1        | 4.5:1  | Pass   |
| night    | muted / glass over #FFFFFF | 7.04:1         | 4.5:1  | Pass   |
| night    | focus / glass over #FFFFFF | 9.46:1         | 3:1    | Pass   |
