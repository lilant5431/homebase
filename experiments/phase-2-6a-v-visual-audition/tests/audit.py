"""Small local evidence audit: source provenance, document links and solid-role contrast."""

import hashlib
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
for item in json.loads((root / "vendor/source-manifest.json").read_text()):
    assert hashlib.sha256((root / item["local"]).read_bytes()).hexdigest() == item["sha256"], item["component"]

for doc in [root / "README.md", *root.glob("research/**/*.md")]:
    for target in re.findall(r"\]\(([^)]+)\)", doc.read_text()):
        if target.startswith(("http:", "https:", "#")):
            continue
        assert (doc.parent / target.split("#")[0]).exists(), (doc.name, target)

for path in root.glob("src/**/*"):
    if not path.is_file() or path.name.endswith(".audition.tsx"):
        continue
    source = path.read_text()
    assert not re.search(r"\b(localStorage|sessionStorage|indexedDB)\b", source), path
    assert "homebase.academic.v1" not in source and "homebase.schedule.v1" not in source and "homebase.appearance.v1" not in source, path
    assert not re.search(r"\bDate\b|performance\.now\(", source), path
    assert not re.search(r"from ['\"]\.\./\.\./", source), path


def luminance(color):
    values = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    values = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values]
    return .2126 * values[0] + .7152 * values[1] + .0722 * values[2]


def contrast(a, b):
    light, dark = sorted([luminance(a), luminance(b)], reverse=True)
    return (light + .05) / (dark + .05)


themes = {
    "Daylight": {"canvas": "#f3f6fa", "surface": "#ffffff", "text": "#172334", "muted": "#536477", "action": "#1d4ed8", "on": "#ffffff", "border": "#64748b", "panels": ["#edf6f2", "#eef3ff", "#fff4d6"]},
    "Night": {"canvas": "#0b1220", "surface": "#121d2e", "text": "#e8eef6", "muted": "#a8b7cb", "action": "#8bddfc", "on": "#0b1220", "border": "#71859e", "panels": ["#153a35", "#192e4c", "#312611"]},
}
results = []
for theme, colors in themes.items():
    pairs = [("text / solid", colors["text"], colors["surface"], 4.5), ("muted / solid", colors["muted"], colors["surface"], 4.5), ("muted / canvas", colors["muted"], colors["canvas"], 4.5), ("action label", colors["on"], colors["action"], 4.5), ("focus / solid", colors["action"], colors["surface"], 3), ("control edge / solid", colors["border"], colors["surface"], 3)]
    for index, panel in enumerate(colors["panels"]):
        pairs.extend([(f"session {index + 1} text", colors["text"], panel, 4.5), (f"session {index + 1} metadata", colors["muted"], panel, 4.5)])
    for role, fg, bg, target in pairs:
        ratio = contrast(fg, bg)
        assert ratio >= target, (theme, role, ratio)
        results.append({"theme": theme, "role": role, "foreground": fg, "background": bg, "ratio": round(ratio, 2), "target": target})

output = root / "test-results"
output.mkdir(exist_ok=True)
(output / "contrast-report.json").write_text(json.dumps(results, indent=2) + "\n")
print(f"PASS: 5 source hashes; local Markdown links; storage/import/clock isolation scan; {len(results)} solid-role contrast checks")

# New material recipes also check extremes, so blurred averaging or a brighter
# light cue cannot invalidate the sampled-scene text bounds.
def rgb_luminance(values):
    linear = [v / 255 / 12.92 if v / 255 <= .04045 else ((v / 255 + .055) / 1.055) ** 2.4 for v in values]
    return sum(v * w for v, w in zip(linear, [.2126, .7152, .0722]))


def rgb_contrast(a, b):
    low, high = sorted([rgb_luminance(a), rgb_luminance(b)])
    return (high + .05) / (low + .05)


material_bounds = []
for theme, fill, foregrounds in [
    ('Light', [255, 255, 255], ['#172334', '#35465a']),
    ('Dark', [18, 29, 46], ['#e8eef6', '#d0dcea']),
]:
    for backdrop in ([0, 0, 0], [255, 255, 255]):
        blended = [a * .72 + b * .28 for a, b in zip(fill, backdrop)]
        for foreground in foregrounds:
            fg = [int(foreground[i:i+2], 16) for i in (1, 3, 5)]
            ratio = rgb_contrast(fg, blended)
            assert ratio >= 4.5, (theme, foreground, backdrop, ratio)
            material_bounds.append({'theme': theme, 'foreground': foreground, 'backdrop': backdrop, 'blended': blended, 'ratio': round(ratio, 2)})
(output / 'material-envelope.json').write_text(json.dumps(material_bounds, indent=2) + '\n')
print(f'PASS: {len(material_bounds)} Frosted black/white blended-envelope text checks')
for engine in ['chromium', 'webkit']:
    file = output / f'material-{engine}.json'
    if not file.exists():
        print(f'NOT RUN: {engine} actual scene sampling; run test:browser first')
        continue
    data = json.loads(file.read_text())
    assert data['revision'] == 'V6', 'stale material evidence: rerun browser checks'
    evidence = data['records']
    assert len(evidence) == 16, (engine, len(evidence))
    roles = [role for record in evidence for panel in record['evidence'] for role in panel['roles']]
    assert all(role['minimumSceneRatio'] >= 4.5 and role['minimumEnvelopeRatio'] >= 4.5 for role in roles)
    print(f'PASS: {engine} {len(evidence)} material/scene/view/width samples; {len(roles)} computed text roles; minimum scene {min(role["minimumSceneRatio"] for role in roles):.2f}:1')
