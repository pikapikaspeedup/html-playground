#!/usr/bin/env python3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
required=[ROOT/'dist/svg-fighter-engine-studio.html',ROOT/'dist/street-fighter-6-ink.html',ROOT/'dist/game-ink.js']
for p in required:
    if not p.exists() or p.stat().st_size < 1000:
        raise SystemExit(f'bad build: {p}')
studio=(ROOT/'dist/svg-fighter-engine-studio.html').read_text(encoding='utf-8')
game=(ROOT/'dist/street-fighter-6-ink.html').read_text(encoding='utf-8')
assert '<!--STYLE-->' not in studio and '<!--SCRIPTS-->' not in studio
assert 'INK ENGINE 0.1' in game and 'SVG_FIGHTER.ink=INK.Game' in game
print('INK build verification passed')
