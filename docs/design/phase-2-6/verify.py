"""Documentation-only link/token audit; no application imports or dependencies.
Run python3 docs/design/phase-2-6/verify.py [--write-contrast].
"""
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent
TOKENS = json.loads((ROOT / 'tokens.json').read_text())
# Specification data only: no preference resolver or application storage is implemented.
assert set(TOKENS['themes']) == {'daylight', 'night'}
assert TOKENS['paletteAliases'] == {'light': 'daylight', 'dark': 'night'}
preference = TOKENS['appearancePreference']
assert preference['key'] == 'homebase.appearance.v1'
assert preference['allowed'] == {
    'environment': ['lattice', 'landscape', 'basic'],
    'mode': ['system', 'light', 'dark'],
    'material': ['solid', 'frosted'],
    'effects': ['system', 'reduced'],
    'motion': ['system', 'reduced'],
}
assert preference['defaults'] == {
    'version': 1, 'environment': 'lattice', 'mode': 'system',
    'material': 'solid', 'effects': 'system', 'motion': 'system',
}
assert set(TOKENS['appearanceNames']) == set(preference['allowed']['environment'])
for appearances in TOKENS['appearanceNames'].values():
    assert set(appearances) == {'light', 'dark'}
assert set(TOKENS['contentMaterials']) == {'solid', 'frosted'}
assert TOKENS['contentMaterials']['solid'] == {'alpha': 1, 'desktopBlurPx': 0, 'phoneBlurPx': 0}
assert TOKENS['contentMaterials']['frosted']['alpha'] == .72
assert TOKENS['latticeCapsule'] == {
    'widthPx': 112, 'heightPx': 8, 'slotHeightPx': 26,
    'radiusPx': 999, 'haloPx': 8, 'decorativeOnly': True,
}


def rgb(value):
    return [int(value[i:i + 2], 16) / 255 for i in (1, 3, 5)]

def luminance(channels):
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return sum(a * b for a, b in zip(linear, [0.2126, 0.7152, 0.0722]))

def ratio(a, b):
    high, low = sorted([luminance(a), luminance(b)], reverse=True)
    return (high + 0.05) / (low + 0.05)

rows = []
for name, theme in TOKENS['themes'].items():
    pairs = [(fg, bg, 4.5) for fg in ['text', 'muted', 'neutral'] for bg in ['canvas', 'surface', 'elevated', 'quiet', 'selection']]
    pairs += [('onAction', bg, 4.5) for bg in ['action', 'actionHover', 'actionPressed']]
    pairs += [(fg, 'surface', 4.5) for fg in ['action', 'danger', 'success', 'warning', 'cyan', 'sage']]
    pairs += [(status, status + 'Surface', 4.5) for status in ['success', 'warning', 'danger', 'neutral']]
    pairs += [(fg, bg, 3) for fg in ['focus', 'controlBorder'] for bg in ['canvas', 'surface', 'elevated']]
    for fg, bg, minimum in pairs:
        result = ratio(rgb(theme[fg]), rgb(theme[bg]))
        assert result >= minimum, (name, fg, bg, result, minimum)
        rows.append(f'| {name} | {fg} / {bg} | {result:.2f}:1 | {minimum}:1 | Pass |')
    for i, subject in enumerate(theme['subjects'], 1):
        result = ratio(rgb(subject), rgb(theme['surface']))
        assert result >= 4.5, (name, 'subject', i, result)
        rows.append(f'| {name} | subject {i} / surface | {result:.2f}:1 | 4.5:1 | Pass |')
    glass = TOKENS['glass'][name]
    for backdrop in ['#000000', '#FFFFFF']:
        composite = [glass['alpha'] * c + (1 - glass['alpha']) * b for c, b in zip(rgb(glass['base']), rgb(backdrop))]
        for fg, minimum in [('text', 4.5), ('muted', 4.5), ('focus', 3)]:
            result = ratio(rgb(theme[fg]), composite)
            assert result >= minimum, (name, fg, 'glass', backdrop, result)
            rows.append(f'| {name} | {fg} / glass over {backdrop} | {result:.2f}:1 | {minimum}:1 | Pass |')
assert len(rows) == 92, 'Preserve the original semantic contrast matrix'
frosted_rows = []
for mode, alias in TOKENS['paletteAliases'].items():
    theme = TOKENS['themes'][alias]
    material = TOKENS['contentMaterials']['frosted']
    for backdrop in ['#000000', '#FFFFFF']:
        composite = [material['alpha'] * c + (1 - material['alpha']) * b
                     for c, b in zip(rgb(theme['surface']), rgb(backdrop))]
        for role, foreground in [('text', theme['text']), ('metadata', material[mode]['muted'])]:
            result = ratio(rgb(foreground), composite)
            assert result >= 4.5, (mode, role, 'Frosted', backdrop, result)
            frosted_rows.append(f'| {mode} | {role} / Frosted over {backdrop} | {result:.2f}:1 | 4.5:1 | Pass |')
assert len(frosted_rows) == 8
report = '''# Calculated contrast evidence

Generated from [tokens.json](tokens.json) by [verify.py](verify.py). Reproduce with `python3 docs/design/phase-2-6/verify.py`; regenerate deliberately with `--write-contrast` after a palette edit.

WCAG sRGB relative luminance: channels ≤0.04045 divide by 12.92, otherwise ((channel+0.055)/1.055)^2.4; luminance weights 0.2126/0.7152/0.0722; ratio (lighter+0.05)/(darker+0.05). Checks use unrounded ratios. Text targets 4.5:1, essential control/focus boundaries 3:1. All text is checked at the normal-text threshold, even when displayed large. Alpha surfaces are composited in sRGB before luminance calculation against black and white extremes. These are token-pair checks, not whole-interface WCAG certification. Unlisted combinations, gradients, legacy subject colors, native picker internals and actual rasterized glass still require rendered review. Decorative border/glow tokens carry no semantic contrast claim.

| Theme | Foreground / background | Computed ratio | Target | Result |
| --- | --- | --- | --- | --- |
''' + '\n'.join(rows) + '''

## Supplemental final Frosted envelope — current documentation calculation

The original 92 semantic roles above retain stable `daylight` / `night` documentation keys; final palette names are Light / Dark. All three environments share these roles. Eight additional checks use 72% surface alpha and fully opaque body/stronger metadata colors against black/white extremes. This bounds source-over panel blends; it is not a guarantee for arbitrary gradients, native painting, every glyph or a whole assembled interface.

| Palette | Foreground / background | Computed ratio | Target | Result |
| --- | --- | --- | --- | --- |
''' + '\n'.join(frosted_rows) + '''

## Separately recorded V6 browser evidence

The [V6 audition report](https://github.com/lilant5431/homebase/blob/0593c853596f47a5fbc4370b92f4e455bdef1a66/experiments/phase-2-6a-v-visual-audition/research/material-v6-results.md) previously recorded 704 computed roles across Chromium/Linux WebKit at that exact source commit. Reported representative minimum sampled ratio 6.07:1; Frosted full-envelope minimum 4.84:1. This consolidation does not rerun those experiment/browser measurements or infer physical Safari performance. Today's documentation audit recomputes the 92 original pairs, four original showcase reflection bounds and eight Frosted bounds, and checks the selected assets' provenance.
'''
if '--write-contrast' in sys.argv:
    (ROOT / 'contrast.md').write_text(report)
else:
    def canonical(text):
        # Prettier aligns Markdown table cells; compare content, not padding/dashes.
        return [
            '|'.join(cell.strip() for cell in line.split('|')) if line.startswith('|') else line.strip()
            for line in text.splitlines()
            if line.strip() and not (line.startswith('|') and set(line) <= set('|-: '))
        ]
    assert canonical((ROOT / 'contrast.md').read_text()) == canonical(report), 'Contrast report is stale'
for path in ROOT.rglob('*.md'):
    for target in re.findall(r'\]\(([^)]+)\)', path.read_text()):
        if '://' in target or target.startswith('#'):
            continue
        relative = unquote(target.split('#')[0])
        assert (path.parent / relative).exists(), (path, target)
for path in ROOT.rglob('*.html'):
    for target in re.findall(r'(?:href|src)="([^"]+)"', path.read_text()):
        if '://' in target or target.startswith('#'):
            continue
        assert (path.parent / unquote(target.split('#')[0])).exists(), (path, target)
# Showcase reflection bounds are documented recipes, not new semantic colors.
# Text-bearing labels sit on scene backgrounds; validate their maximum glow wash.
reflection_checks = 0
for name, opacity in [('daylight', 0.30), ('night', 0.40)]:
    theme = TOKENS['themes'][name]
    for background in ['quiet', 'canvas']:
        composite = [opacity * c + (1 - opacity) * b for c, b in zip(rgb(theme['glow']), rgb(theme[background]))]
        result = ratio(rgb(theme['muted']), composite)
        assert result >= 4.5, (name, 'muted / showcase reflected light', background, result)
        reflection_checks += 1

assert reflection_checks == 4
manifest = json.loads((ROOT / 'assets/v6/source-manifest.json').read_text())
assert manifest['sourceCommit'] == '0593c853596f47a5fbc4370b92f4e455bdef1a66'
assert manifest['sourcePR'] == 15 and len(manifest['assets']) == 11
assert len({item['file'] for item in manifest['assets']}) == 11
for item in manifest['assets']:
    assert item['file'].endswith('.png') and '/' not in item['file']
    assert item['sourcePath'] == 'experiments/phase-2-6a-v-visual-audition/screenshots/' + item['file']
    assert hashlib.sha256((ROOT / 'assets/v6' / item['file']).read_bytes()).hexdigest() == item['sha256']
assert hashlib.sha256((ROOT / 'assets/v6/third-party-notices.txt').read_bytes()).hexdigest() == manifest['noticesSha256']
# Relative CSS assets, if introduced later, must not silently go missing.
for path in ROOT.rglob('*.css'):
    for target in re.findall(r'url\([\"\']?([^\)\"\']+)', path.read_text()):
        if not target.startswith(('data:', 'http:', 'https:', '#')):
            assert (path.parent / unquote(target.split('#')[0])).exists(), (path, target)
print(f'{len(rows)} semantic, {reflection_checks} showcase reflection and {len(frosted_rows)} Frosted contrast checks passed; preference enums/defaults, local links and 11 V6 asset/notice hashes resolve.')
