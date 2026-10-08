"""Documentation-only link/token audit; no application imports or dependencies.
Run python3 docs/design/phase-2-6/verify.py [--write-contrast].
"""
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent
TOKENS = json.loads((ROOT / 'tokens.json').read_text())

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
report = '''# Calculated contrast evidence

Generated from [tokens.json](tokens.json) by [verify.py](verify.py). Reproduce with `python3 docs/design/phase-2-6/verify.py`; regenerate deliberately with `--write-contrast` after a palette edit.

WCAG sRGB relative luminance: channels ≤0.04045 divide by 12.92, otherwise ((channel+0.055)/1.055)^2.4; luminance weights 0.2126/0.7152/0.0722; ratio (lighter+0.05)/(darker+0.05). Checks use unrounded ratios. Text targets 4.5:1, essential control/focus boundaries 3:1. All text is checked at the normal-text threshold, even when displayed large. Alpha surfaces are composited in sRGB before luminance calculation against black and white extremes. These are token-pair checks, not whole-interface WCAG certification. Unlisted combinations, gradients, legacy subject colors, native picker internals and actual rasterized glass still require rendered review. Decorative border/glow tokens carry no semantic contrast claim.

| Theme | Foreground / background | Computed ratio | Target | Result |
| --- | --- | --- | --- | --- |
''' + '\n'.join(rows) + '\n'
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
        assert (path.parent / unquote(target)).exists(), (path, target)
print(f'{len(rows)} contrast checks passed; local document links resolve.')
