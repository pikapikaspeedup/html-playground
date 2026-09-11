/* Timeline inspector. Scrubbing re-simulates the real combat engine from a
 * legal practice prerequisite, rather than assigning an arbitrary SVG pose. */
(() => {
'use strict';
let api,root,lastSignature='',lastFrame=-1;
const $=id=>document.getElementById(id);
function install(A){
 api=A;const style=document.createElement('style');style.textContent=`
 .atelier-inspector{display:grid;grid-template-columns:minmax(180px,1.2fr) minmax(250px,2fr) auto;gap:12px;align-items:center;padding:13px 17px;border:1px solid #364454;border-top:0;background:#101923;color:#e5ded1;font:12px/1.55 system-ui}
 .atelier-inspector[hidden]{display:none}.atelier-inspector strong{display:block;color:#dfb780;font-size:13px}.atelier-inspector small{color:#9fb0bd}.atelier-inspector input[type=range]{width:100%;accent-color:#dcba83;cursor:ew-resize}.atelier-inspector label{display:flex;align-items:center;gap:5px;white-space:nowrap}.atelier-phase{display:flex;gap:2px;height:4px;margin:3px 0}.atelier-phase span:nth-child(1){background:#5e83a2}.atelier-phase span:nth-child(2){background:#dbab67}.atelier-phase span:nth-child(3){background:#716288}.atelier-meta{display:flex;justify-content:space-between;gap:10px;font-variant-numeric:tabular-nums}.atelier-options{display:grid;gap:5px}.atelier-inspector button{background:#253344;color:#e7dac5;border:1px solid #43566d;padding:4px 8px;border-radius:4px;cursor:pointer}
 @media(max-width:800px){.atelier-inspector{grid-template-columns:1fr;gap:7px;padding:10px}.atelier-options{display:flex;flex-wrap:wrap;gap:12px}}@media(max-height:580px) and (orientation:landscape){.atelier-inspector{padding:6px 10px;grid-template-columns:1fr 1.4fr auto;font-size:10px}.atelier-inspector strong{font-size:11px}.atelier-inspector .atelier-desc{display:none}.atelier-options{display:grid;gap:1px}}`;
 document.head.append(style);
 root=document.createElement('section');root.id='atelier-inspector';root.className='atelier-inspector';root.hidden=true;root.setAttribute('aria-label','动作时间轴');root.innerHTML=`<div><strong id="atelier-title">招式时间轴</strong><small class="atelier-desc" id="atelier-description"></small></div><div><div class="atelier-meta"><span id="atelier-state">预备</span><small id="atelier-frame">0 / 0 F</small></div><input id="atelier-scrub" aria-label="拖动检查真实模拟帧" type="range" min="0" max="80" value="0" step="1"><div class="atelier-phase" aria-hidden="true"><span id="atelier-start"></span><span id="atelier-active"></span><span id="atelier-recovery"></span></div><small id="atelier-command"></small></div><div class="atelier-options"><label><input id="atelier-hold" type="checkbox">舞 · 蓄力花蝶扇</label><label><input id="atelier-clean" type="checkbox">精简特效</label><button id="atelier-replay">从起手重播</button></div>`;
 $('motion-lab').after(root);
 $('atelier-scrub').addEventListener('input',e=>replay(Number(e.target.value),true));
 $('atelier-replay').onclick=()=>replay(0,false);
 $('atelier-hold').onchange=()=>{lastSignature='';replay(0,false)};
 $('atelier-clean').onchange=()=>{api.state.minimalFX=$('atelier-clean').checked;for(const f of api.fighters){f._atelierFXStamp='';}api.render()};
 // All strengths and actual follow-ups are accessible, not just heavy variants.
 const fill=()=>{const c=$('lab-char').value,old=$('lab-move').value;const entries=api.moves[c].filter(m=>m.category!=='normal'||['sLP','sMP','sHP','sLK','sMK','sHK','cHP','cHK','jHK'].includes(m.id));$('lab-move').innerHTML=entries.map(m=>`<option value="${m.id}">${m.name}${m.category==='branch'?' [同人派生]':''}</option>`).join('');if(entries.some(m=>m.id===old))$('lab-move').value=old;lastSignature='';};
 $('lab-char').addEventListener('change',fill);$('lab-move').addEventListener('change',()=>{lastSignature='';});
 $('showcase-btn').addEventListener('click',fill);$('select-showcase').addEventListener('click',fill);
 $('lab-play').addEventListener('click',()=>{const f=api.fighters[0];if(f?.ch.id==='mai'&&f.attack?.m.base==='kachosen'&&$('atelier-hold').checked)api.press(0,'HP');});
 fill();
}
function replay(n,freeze){
 if(!api||!root)return;const ch=$('lab-char').value,id=$('lab-move').value;
 api.practice(ch,id);const f=api.fighters[0];
 if(ch==='mai'&&f.attack?.m.fanChargeable&&$('atelier-hold').checked)api.press(0,'HP');
 if(n){for(let i=0;i<n*9+180;i++){const a=f.attack;if(!a||a.m.id!==id||a.t+(a.fanChargeTicks||0)>=n)break;api.step(1);}}api.state.paused=freeze;
 for(const x of api.fighters){x.pose=null;x._poseSimulationFrame=-1;}
 api.render();$('pause-overlay').hidden=true;$('lab-freeze').textContent=freeze?'继续':'定格';$('game-frame').classList.toggle('is-paused',freeze);
 lastFrame=n;update(true,n);
}
function update(force=false,displayFrame){
 if(!api||!root)return;const visible=!$('motion-lab').hidden&&api.state.screen==='battle';root.hidden=!visible;if(!visible)return;
 const f=api.fighters[0],id=$('lab-move').value,m=api.getMove(f,id);if(!m)return;
 const hold=f.ch.id==='mai'&&m.fanChargeable&&$('atelier-hold').checked?20:0,total=m.total+hold;
 const sig=f.ch.id+':'+id+':'+hold;
 if(sig!==lastSignature){lastSignature=sig;const d=api.describe(f,m);$('atelier-title').textContent=m.name;$('atelier-description').textContent=d.identity;$('atelier-command').textContent=(m.cmd||'系统动作')+' · '+(f.ch.id==='iori'?'自定义跨界角色 / 改编数值':'SVG 改编数值');$('atelier-scrub').max=total;for(const [key,value] of [['start',m.startup+hold],['active',m.active],['recovery',m.recovery]])$('atelier-'+key).style.flex=value;}
 const attack=f.attack?.m.id===id?f.attack:null,t=displayFrame??(attack?attack.t+(attack.fanChargeTicks||0):lastFrame);
 if(!force&&t===lastFrame&&api.state.paused)return;lastFrame=t;
 $('atelier-frame').textContent=Math.min(total,Math.round(t))+' / '+total+' F';
 $('atelier-state').textContent=attack?(attack.fanCharging?'扇蓄力':attack.t<m.startup?'预备 / STARTUP':attack.t<m.startup+m.active?'发力 / ACTIVE':'收势 / RECOVERY'):(displayFrame!==undefined?'模拟快照 / SNAPSHOT':'已收招 / READY');
 if(document.activeElement!==$('atelier-scrub'))$('atelier-scrub').value=Math.min(total,t);
}
window.SF6Studio={install,update,replay};
})();
