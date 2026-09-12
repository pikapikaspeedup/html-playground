from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os
R=Path(__file__).resolve().parents[2];OUT=R/'test-results/screenshots';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1800,'height':1120},device_scale_factor=1)
 page.set_content((R/'dist/svg-fighter-engine-studio.html').read_text(),wait_until='load')
 for kind in ['models','signature-moves','mai-motion-breakdown']:
  if kind=='signature-moves':
   cases=[['ryu:shoryu',23],['ken:dragonlash',25],['chun:bird',22],['cammy:arrow',32],['luke:flash',29],['juri:gooh',25],['mai:musasabi-no-mai',20],['iori:aoihana',34]]
  elif kind=='mai-motion-breakdown':
   cases=[['mai:hishou-ryuuenjin',9],['mai:hishou-ryuuenjin',22],['mai:hishou-ryuuenjin',33],['mai:hishou-ryuuenjin',60],['mai:musasabi-no-mai',1],['mai:musasabi-no-mai',20],['mai:musasabi-no-mai',31],['mai:musasabi-no-mai',41]]
  else:
   cases=page.evaluate('Object.values(INKStudio.registry).filter((v,i,a)=>a.findIndex(c=>c.data.character===v.data.character)===i).map(c=>[c.id,0])')
  samples=page.evaluate('''(cases)=>{
   const out=[];for(let i=0;i<cases.length;i++){
    const [id,frame]=cases[i];INKStudio.selectClip(id);INKStudio.seek(frame);INKStudio.setMode('skin');
    const ns=INK.SVG.NS,svg=document.createElementNS(ns,'svg');svg.style.cssText='position:absolute;left:-10000px;width:1040px;height:650px';
    const defs=document.getElementById('artDefs').cloneNode(true),wrapper=document.createElementNS(ns,'g'),actor=document.getElementById('actorRoot').cloneNode(true);wrapper.append(actor);svg.append(defs,wrapper);document.body.append(svg);
    const box=wrapper.getBBox(),margin=24;svg.setAttribute('viewBox',[box.x-margin,box.y-margin,box.width+margin*2,box.height+margin*2].join(' '));
    svg.style.cssText='width:100%;height:360px';svg.setAttribute('xmlns',ns);let text=svg.outerHTML;svg.remove();
    // Prefix definitions and references so the eight retained skins do not alias.
    text=text.replace(/id="([^"]+)"/g,(_,id)=>'id="p'+i+'-'+id+'"').replace(/url\\(#([^)]+)\\)/g,(_,id)=>'url(#p'+i+'-'+id+')');
    out.push({id,frame,svg:text,name:INKStudio.active.data.name,character:INKStudio.character.name,note:INKStudio.active.data.meta.note});
   }return out;
  }''',cases)
  title={'models':'EIGHT FIGHTERS / 形体研究','signature-moves':'SILHOUETTE & ACTION / 关键动作','mai-motion-breakdown':'MAI / 从预备到收势'}[kind]
  body=''.join('<article><header><span>'+s['character']+'</span><b>'+s['name']+'</b><i>'+str(s['frame']).zfill(3)+' f</i></header>'+s['svg']+'<p>'+s['note']+'</p></article>' for s in samples)
  html='''<!doctype html><meta charset=utf-8><style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#171e24;color:#dbe8dd;font-family:Arial,"Noto Sans CJK SC",sans-serif}h1{font-size:24px;letter-spacing:2px;margin:0 0 8px}.sub{font-size:12px;color:#9faeac;margin-bottom:25px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}article{background:#ede9dd;color:#343944;border:1px solid #a8b0a8;border-radius:7px;padding:16px;overflow:hidden}header{display:flex;align-items:center;gap:9px;font-size:12px}header span{font-weight:800;letter-spacing:1px;color:#356355}header b{font-weight:500;margin-left:auto}header i{font-size:11px;font-style:normal;opacity:.6}p{font-size:11px;color:#58635e;min-height:27px;line-height:1.6;margin:0;padding-top:8px;border-top:1px solid #cbd0c4}</style><h1>'''+title+'''</h1><div class=sub>INK ENGINE 0.1 · 实际 SVG 渲染帧 · 无滤镜 / 无打击特效 · 动作编排研究，不是官方帧数据</div><div class=grid>'''+body+'</div>'
  page.set_content(html,wait_until='load');page.screenshot(path=str(OUT/(kind+'.png')),full_page=True)
  print(kind)
  page.set_content((R/'dist/svg-fighter-engine-studio.html').read_text(),wait_until='load')
 b.close()
