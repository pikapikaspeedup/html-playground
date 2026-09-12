#!/usr/bin/env python3
"""Build the INK SVG animation studio from modular repository sources."""
from pathlib import Path
from runpy import run_path
ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent

def read(rel: str) -> str:
    p = ROOT / rel
    if not p.exists():
        p = REPO / rel
    return p.read_text(encoding='utf-8')

def inline(files):
    return '\n'.join('<script>\n' + read(f).replace('</script','<\\/script') + '\n</script>' for f in files)

def studio():
    shared = ['src/atelier-art.js','src/models/head.js','src/models/torso.js',
              'ink-svg-engine/src/ink/core.js','ink-svg-engine/src/ink/assets.js',
              'ink-svg-engine/src/ink/renderer.js']
    html = read('ink-svg-engine/engine-studio/studio.html')
    html = html.replace('<!--STYLE-->', '<style>' + read('ink-svg-engine/engine-studio/studio.css') + '</style>')
    html = html.replace('<!--SCRIPTS-->', inline(shared + ['ink-svg-engine/src/ink/clips.js','ink-svg-engine/engine-studio/studio.js']))
    (ROOT/'dist').mkdir(exist_ok=True)
    (ROOT/'dist/svg-fighter-engine-studio.html').write_text(html, encoding='utf-8')
    return html

if __name__ == '__main__':
    studio()
    run_path(str(ROOT/'tools/build_ink_game.py'), run_name='__main__')
    print('Built INK studio and combat preview')
