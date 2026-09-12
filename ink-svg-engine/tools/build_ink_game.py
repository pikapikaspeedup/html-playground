#!/usr/bin/env python3
"""Build a reversible INK renderer preview without changing combat rules."""
from pathlib import Path
import re, base64, hashlib
ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
source = (REPO/'game.js').read_text(encoding='utf-8')
start = source.index('function renderFighter(f,dt=1/60,alpha=1){')
end = source.index('\nfunction bodyPoint(f,p)', start)
legacy = source[start:end]
assert legacy.count('function renderFighter(') == 1
prefix = legacy[:legacy.index(" sa(f.core,'transform'")]
prefix = prefix.replace('function renderFighter(f,dt=1/60,alpha=1){', '''function renderFighter(f,dt=1/60,alpha=1){
 if(!INK.Game.enabled){INK.Game.show(f,false);return renderFighterLegacy(f,dt,alpha);}''')
suffix = legacy[legacy.index(' if(f.shadow)'):]
insert = '''
 const limbs=poseRig(f,p),ar=limbs.rearArm,af=limbs.frontArm;
 for(const name of ['rearArm','frontArm','rearLeg','frontLeg'])f[name].points=limbs[name];
 const inkHurt=['hit','stun','tumble','captured','down','ko'].includes(f.state);
 const inkPower=!inkHurt&&(f.portraitPower||f.attack&&f.attack.t>=f.attack.m.startup&&f.attack.t<f.attack.m.startup+f.attack.m.active);
 INK.Game.update(f,p,limbs,f.attack?view.attack.t:gameTime*60,inkHurt?'hurt':inkPower?'power':'rest',frozen);
'''
new = prefix + insert + suffix
source = source[:start] + legacy.replace('function renderFighter(', 'function renderFighterLegacy(', 1) + '\n' + new + source[end:]
source = source.replace('geometry:getCombatGeometry,','geometry:getCombatGeometry,rig:poseRig,')
if 'rig:poseRig' not in source:
    source = source.replace('geometry: getCombatGeometry,','geometry: getCombatGeometry,rig:poseRig,')
(ROOT/'dist').mkdir(exist_ok=True)
(ROOT/'dist/game-ink.js').write_text(source, encoding='utf-8')
html = (REPO/'street-fighter-6.html').read_text(encoding='utf-8')
include = ['ink-svg-engine/src/ink/core.js','ink-svg-engine/src/ink/assets.js','ink-svg-engine/src/ink/renderer.js','ink-svg-engine/src/ink/game-adapter.js']
html = html.replace('<script src="game.js"></script>', '\n'.join('<script src="'+p+'"></script>' for p in include) + '\n<script src="ink-svg-engine/dist/game-ink.js"></script>\n<script src="ink-svg-engine/src/ink/game-panel.js"></script>')
css = '''.ink-game-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 13px;background:#182a2b;border:1px solid #375853;border-radius:4px;margin:8px 0;font-size:11px;color:#b5cbbd}.ink-game-controls strong{font:10px ui-monospace,monospace;letter-spacing:1px}.ink-game-controls span{font-size:10px;color:#88a79d}.ink-game-controls select{font:11px system-ui;padding:7px;background:#233632;color:#c6dfd3;border:1px solid #547068;border-radius:3px}[data-ink-mode="silhouette"] [data-ink-layer="art"] path:not([fill="none"]),[data-ink-mode="silhouette"] [data-ink-layer="art"] ellipse,[data-ink-mode="silhouette"] [data-ink-layer="art"] circle{fill:#23372f!important;stroke:#23372f!important;opacity:1!important}[data-ink-mode="silhouette"] [data-ink-layer="art"] path[fill="none"]{stroke:none!important}@media(max-width:650px){.ink-game-controls{gap:6px}.ink-game-controls span{width:100%}}'''
html = html.replace('</head>', '<style>'+css+'</style></head>')
stages = {name:'data:image/svg+xml;base64,'+base64.b64encode((REPO/f'assets/stages/{name}.svg').read_bytes()).decode() for name in ['rooftop','courtyard']}

def resolve_script(path: str) -> Path:
    p = REPO/path
    if p.exists(): return p
    p = ROOT/path
    if p.exists(): return p
    raise FileNotFoundError(path)

def inline(m):
    path = m[1]
    text = resolve_script(path).read_text(encoding='utf-8').replace("'assets/stages/'+value+'.svg'", '('+repr(stages)+')[value]')
    return '<script>\n'+text.replace('</script','<\\/script')+'\n</script>'

html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
(ROOT/'dist/street-fighter-6-ink.html').write_text(html, encoding='utf-8')
print('Built combat preview; upstream game.js sha256:', hashlib.sha256((REPO/'game.js').read_bytes()).hexdigest()[:16])
