#!/usr/bin/env python3
"""Build the integration and an offline HTML; Python 3.10+, no dependencies.
Use `python3 tools/build.py` from any working directory. Source SVG/JS remain
editable in src/. No dynamic evaluation, downloads or runtime source patches.
"""
from pathlib import Path
import base64, re, runpy
ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / 'tools/apply_atelier.py'))
html = (ROOT / 'street-fighter-6.html').read_text(encoding='utf-8')
stages = {}
for name in ('rooftop', 'courtyard'):
    stages[name] = 'data:image/svg+xml;base64,' + base64.b64encode(
        (ROOT / f'assets/stages/{name}.svg').read_bytes()).decode('ascii')
def inline(match):
    path = ROOT / match.group(1)
    if not path.is_file():
        raise FileNotFoundError(path)
    source = path.read_text(encoding='utf-8')
    source = source.replace("'assets/stages/'+value+'.svg'", '(' + repr(stages) + ')[value]')
    return '<script>\n' + source.replace('</script', r'<\/script') + '\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
dist = ROOT / 'dist'
dist.mkdir(exist_ok=True)
output = dist / 'street-fighter-6-atelier.html'
output.write_text(html, encoding='utf-8')
print(f'Built offline HTML: {output} ({output.stat().st_size:,} bytes)')
