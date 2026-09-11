"""Apply the small integration boundary to the verified upstream engine.
The readable art/motion/mechanics modules live in src/. No runtime source rewriting.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'src/upstream/game.js'
import hashlib
raw=SOURCE.read_bytes()
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()=='eb0af8c482450f30eb8b3dfb891602436ca55030', 'Upstream engine changed; review integration anchors first.'
s=raw.decode('utf-8')
def replace(old,new):
    global s
    assert old in s, old[:100]
    s=s.replace(old,new,1)
replace("const artDefs=document.querySelector('body>svg defs');", "const artDefs=document.querySelector('body>svg defs');\nSF6Art.configure(CHARACTERS,artDefs);")
for old,new in [
('function headArt(c){','function headArt(c){return SF6Art.head(c);'),
('function torsoArt(c){','function torsoArt(c){return SF6Art.torso(c);'),
('function backHeadArt(c){','function backHeadArt(c){return SF6Art.head(c,true);'),
('function backTorsoArt(c){','function backTorsoArt(c){return SF6Art.torso(c,true);'),
('function gloveArt(c,open=false){','function gloveArt(c,open=false){return SF6Art.hands(c,open);'),
('function footArt(c){','function footArt(c){return SF6Art.feet(c);'),
('function fanArt(c){','function fanArt(c){return SF6Art.fan(c);')]: replace(old,new)
start=s.index(' return{id,ch,name:ch.name')
end=s.index('\nfunction skinFighter',start)
block=s[start:end].replace(' return{',' const fighter={',1)
assert block.endswith(';}' )
block=block[:-2]+';SF6Art.attach(fighter);return fighter;}'
s=s[:start]+block+s[end:]
start=s.index(' const widths=rigLimbWidths',s.index('function renderLimb'))
end=s.index(' const delta=vsub(c,b),angle=',start)
s=s[:start]+''' SF6Art.limb(l,a,b,c,f,{sa,pt,vadd,vmul,vsub,vnorm,vperp,lerp2,limbSurface,limbContour,limbCelShade,morphSVG,rigLimbWidths});
'''+s[end:]
# Rounded deltoid/thigh attachment caps; contour is also used by ground pinning.
replace("return smoothOutline([...left,...right,left[0]],true)","const capA=vsub(a,vmul(vnorm(vsub(b,a)),w0*.7)),capC=vadd(c,vmul(vnorm(vsub(c,b)),w2*.35));return smoothOutline([...left,capC,...right,capA,left[0]],true)")
# Optional authoring modules keep simulation/render/collision on one pose source.
if (ROOT/'src/atelier-motion.js').exists():
    replace('function neutralPose(f){', 'function neutralPose(f){return SF6Motion.neutral(f,gameTime,BASE);')
    replace('function movePose(f,m,t){', 'function movePose(f,m,t){return SF6Motion.sample(f,m,t,neutralPose(f),POSES);')
if (ROOT/'src/mai-sf6.js').exists():
    replace('const getMove=(f,id)=>', 'SF6Mai.configure(CHARACTERS,MOVES,BASESPECIALS);\nconst getMove=(f,id)=>')
# SF6 Mai integration: input, meter, projectile simulation, and actual hit geometry.
if (ROOT/'src/mai-sf6.js').exists():
    replace('denjin:0,stock:0,install:0,', 'denjin:0,stock:0,flameStock:0,maiFollowUntil:0,maiFollowEnhanced:false,maiAirFollow:0,install:0,')
    replace("if(motion(f,isP?'214214':'236236'))m=getMove(f,isP?'SA2':'SA3');else if(isP&&motion(f,'236236'))m=getMove(f,'SA1');", "for(const sm of MOVES[f.ch.id].filter(x=>x.super&&!x.ca)){if(sm.button===kind&&motion(f,sm.motion)){m=sm;break}}")
    replace("if(isP&&f.attack?.m.rekkaNext", "if(SF6Mai.follow(f,b,G,getMove,requestMove,relative))return;\nif(isP&&f.attack?.m.rekkaNext")
    replace("function requestMove(f,m,buffer=true){if(!m", "function requestMove(f,m,buffer=true){if(m?.id==='midare'&&!f.maiFollowCancel)return false;if(m?.super&&f.ch.id==='mai'&&f.y<-8&&!m.airAllowed)return false;if(!m")
    replace("||f.airLock&&f.y<-1&&!(m.super&&canCancel(f,m)||canAirFollow(f,m))", "||f.airLock&&f.y<-1&&!(m.super&&canCancel(f,m)||canAirFollow(f,m)||f.ch.id==='mai'&&m.airAllowed)")
    replace("if(!(free&&!f.attack||specialState||branch||canCancel(f,m)))", "if(!(free&&!f.attack||specialState||branch||canCancel(f,m)||f.maiFollowCancel))")
    replace("setState(f,'attack');f.jumpPre=0;", "m=SF6Mai.start(f,m);setState(f,'attack');f.jumpPre=0;")
    replace("if(a.holding){a.holdTicks++;", "if(SF6Mai.holdTick(f)){}else if(a.holding){a.holdTicks++;")
    replace("if(f.y<0||f.vy!==0){if(!f.captured)", "SF6Mai.tick(f,G,spawnShot,notify);\nif(f.y<0||f.vy!==0){if(!f.captured)")
    replace("G.shots.push(s);sound('wave');}", "SF6Mai.initShot(s);G.shots.push(s);sound('wave');}")
    replace("const previousX=s.x;if(s.lockedTarget)", "const previousX=s.x;if(SF6Mai.moveShot(s)){}else if(s.lockedTarget)")
    replace("if(d&&s.cool===0&&Math.abs(d.x-s.x)", "if(d&&s.vulnerable&&SF6Mai.destroyByStrike(s,getCombatGeometry(d),overlapCombat)){burst(s.x,s.y,'#e3bd7a',5);continue;}\n if(d&&s.cool===0&&Math.abs(d.x-s.x)")
    replace("s.x=d.x-s.dir*32}}}}", "s.x=d.x-s.dir*32}SF6Mai.bounce(s,d);}}}")
    replace("{if(s.m.super&&!o.m.super)o.life=0", "{if(SF6Mai.clash(s,o)){burst((s.x+o.x)/2,(s.y+o.y)/2,'#eac899',4);}else if(s.m.super&&!o.m.super)o.life=0")
    replace(" if(m.throw){d.captureWasParry", " if(projectile&&d.attack?.m.projectileImmune&&d.attack.t<d.attack.m.startup+d.attack.m.active)return 'immune';\n if(m.throw){d.captureWasParry")
    replace("let trait=f.ch.id==='ryu'?", "let trait=f.ch.id==='mai'?'FLAME '+Array.from({length:5},(_,i)=>i<(f.flameStock||0)?'◆':'◇').join('')+(f.maiFollowUntil>G.tick?' · →+P 追投':''):f.ch.id==='ryu'?")
    replace("  const kick=m.contactPart?", "  if(m.geometry==='pillar'){hit.push(rect(-104,-425,270,407,'flame-pillar'));}else if(m.contactPart==='elbow'){hit.push(combatBounds([world(rig.frontArm[1],true),world(rig.frontArm[0],true)],30*s,'elbow'));}else if(m.contactPart==='body'){hit.push(rect(-22,-313,107,130,'body-dive',true));}else{\n  const kick=m.contactPart?")
    replace(" }}return{hurt,hit,throw:throws", " }}}return{hurt,hit,throw:throws")
    replace("const fanAngle=p.fanAngle||0,s=.76", "const fanAngle=p.fanAngle||0,s=f.ch.handScale||.76") if "const fanAngle=p.fanAngle||0,s=.76" in s else None
    replace("version:'4.0-dev'", "version:'5.0.0-atelier'")
    replace("pose:desiredPose,clip:clipFor,", "pose:desiredPose,clip:clipFor,geometry:getCombatGeometry,describe:(f,m)=>SF6Motion.describe(f,m),")

# Art/FX integration uses the exact same forward kinematics as hit detection.
replace("facePower.innerHTML=ch.id==='mai'||ch.id==='iori'?'':expressionArt(ch,false);faceHurt.innerHTML=ch.id==='mai'||ch.id==='iori'?'':expressionArt(ch,true);", "facePower.innerHTML='';faceHurt.innerHTML='';")
replace("handScale=.76;", "handScale=f.ch.handScale||.76;")
if (ROOT/'src/atelier-fx.js').exists():
    replace('function renderMoveFX(f){', 'function renderMoveFX(f){return SF6FX.render(f,G,{sa,patchMoveFX,desiredPose,poseRig,poseWorldPoint,poseWeaponGeometry,fxCurve,fxRibbon});')
    replace("SF6Mai.initShot(s);G.shots.push(s);", "SF6Mai.initShot(s);SF6FX.projectile(s);G.shots.push(s);")

# Inspection fixes and legal follow-up previews.
replace("labFrozen=!labFrozen;G.paused=labFrozen;", "labFrozen=!G.paused;G.paused=labFrozen;")
replace("else{p.bob+=f.attack.m.pose==='kick'?9:48;", "else if(f.attack.m.category!=='normal'){p.bob+=f.attack.m.pose==='kick'?9:48;")
replace("if(!entry||depth>4)return false;", """if(!entry||depth>4)return false;
  if(entry.id==='midare'){
   const source=getMove(f,'kachosen_3');if(!requestMove(f,source,false))return false;
   f.input.held.add('HP');for(let i=0;i<source.startup+23;i++)simulate(true);f.input.held.delete('HP');
   f.maiFollowCancel=!!f.maiFollowUntil;const ok=f.maiFollowCancel&&requestMove(f,entry,false);f.maiFollowCancel=false;f.maiFollowUntil=0;return ok;
  }""")
replace("practiceMove=function(c,m){basePractice(c,m);syncMatchCaption()}", "practiceMove=function(c,m){const ok=basePractice(c,m);syncMatchCaption();return ok}")
if (ROOT/'src/atelier-studio.js').exists():
    replace('requestAnimationFrame(frame)}', 'SF6Studio.update();requestAnimationFrame(frame)}')
    replace('SVG_FIGHTER.experience.stage=applyStage;', 'SVG_FIGHTER.experience.stage=applyStage;\nSF6Studio.install(SVG_FIGHTER);')

ROOT.joinpath('game.js').write_text(s)
html=ROOT.joinpath('src/upstream/shell.html').read_text()
scripts=['src/atelier-art.js','src/models/head.js','src/models/torso.js']
for name in ['atelier-motion','mai-sf6','atelier-fx','atelier-studio']:
    if ROOT.joinpath('src',name+'.js').exists():
        scripts.append('src/'+name+'.js')
        if name=='atelier-motion': scripts.extend('src/characters/'+c+'.js' for c in ['ryu','ken','chun','cammy','luke','juri','mai','iori'])
scripts.append('game.js')
html=html.replace('<script src="game.js"></script>', ''.join(f'<script src="{x}"></script>\n' for x in scripts))
html=html.replace('SVG ATELIER EDITION','SVG ATELIER · CHARACTER STUDY')
ROOT.joinpath('street-fighter-6.html').write_text(html)
print('Integrated',len(s),'chars;',scripts)
